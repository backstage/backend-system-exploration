import { ApiRef, BackendRegisterable, createApiRef } from './plugin-api';
import { BackendInitializer } from './backend-init';

export interface BackendRegisterInit {
  id: string;
  consumes: Set<ApiRef<unknown>>;
  provides: Set<ApiRef<unknown>>;
  deps: { [name: string]: ApiRef<unknown> };
  init: (deps: { [name: string]: unknown }) => Promise<void>;
}

export interface Backend {
  add<TOptions>(
    extension: BackendRegisterable<TOptions>,
    options?: TOptions
  ): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

interface Logger {
  log(message: string): void;
  child(fields: { [name: string]: string }): Logger;
}

interface ConfigApi {
  getString(key: string): string;
}

export const loggerApiRef = createApiRef<Logger>({
  id: 'core.logger',
});

export const configApiRef = createApiRef<ConfigApi>({
  id: 'core.config',
});

export const pluginMetadataApiRef = createApiRef<PluginMetadataApi>({
  id: 'core.pluginMetadata',
});

export function createApiFactory<
  Api,
  Impl extends Api,
  Deps extends { [name in string]: unknown }
>(factory: ApiFactory<Api, Impl, Deps>): ApiFactory<Api, Impl, Deps> {
  return factory;
}

interface ApiForPlugin<T> {
  forPlugin(id: string): T;
}

class ToyLogger implements Logger, ApiForPlugin<Logger> {
  constructor(readonly fields: { [name: string]: string }) {}
  log(message: string): void {
    console.log(
      `${Object.entries(this.fields)
        .map((f) => f.join('='))
        .join(' ')}: ${message}`
    );
  }

  child(fields: { [name: string]: string }): Logger {
    return new ToyLogger({ ...this.fields, ...fields });
  }

  forPlugin(id: string): Logger {
    return this.child({ pluginId: id });
  }
}

const loggerFactory = createApiFactory({
  api: loggerApiRef,
  deps: { pluginMetadata: pluginMetadataApiRef, config: configApiRef },
  //  staticFactory: () => new ToyLogger({}),
  factory: async ({ pluginMetadata, config }) => {
    // const fields = { pluginId: pluginMetadata.pluginId };
    // return parentLogger.child(fields);
    console.log(`Creating logger with level ${config.getString('logLevel')}`);
    return new ToyLogger({});
    // return {
    //   ...parentLogger,
    //   getThisForPlugin(id: string): Logger {
    //     return parentLogger.child({ pluginId: id });
    //   },
    // };
  },
});

export interface PluginMetadataApi {
  pluginId: string;
}

type TypesToApiRefs<T> = { [key in keyof T]: ApiRef<T[key]> };

export type ApiFactory<
  Api,
  Impl extends Api,
  Deps extends { [name in string]: unknown }
> = {
  api: ApiRef<Api>;
  deps: TypesToApiRefs<Deps>;
  factory(deps: Deps): Impl;
};

export type AnyApiFactory = ApiFactory<
  unknown,
  unknown,
  { [key in string]: unknown }
>;

export type ApiHolder = {
  get<T>(api: ApiRef<T>): T | undefined;
};

class CoreApiRegistry {
  readonly #implementations: Map<string, unknown>;
  readonly #factories: Map<string, AnyApiFactory>;

  constructor(factories: AnyApiFactory[]) {
    this.#factories = new Map(factories.map((f) => [f.api.id, f]));
  }

  get<T>(ref: ApiRef<T>): T | undefined {
    if (this.#implementations.has(ref.id)) {
      return this.#implementations.get(ref.id) as T;
    }

    const implementation = this.#instantiate(ref);
    this.#implementations.set(ref.id, implementation);
    return implementation;
  }

  #instantiate<T>(ref: ApiRef<T>): T {
    if (!this.#factories.has(ref.id)) {
      return undefined;
    }

    const factory = this.#factories.get(ref.id);
    const concreteDeps = Object.fromEntries(
      Object.entries(factory.deps).map(([name, apiRef]) => [
        name,
        this.get(apiRef),
      ])
    );
    return factory.factory(concreteDeps) as T;
  }
}

export class BackstageBackend implements Backend {
  #coreApis: CoreApiRegistry;
  #initializer: BackendInitializer;

  constructor(private readonly apiFactories: AnyApiFactory[]) {
    this.#coreApis = new CoreApiRegistry(apiFactories);
    this.#initializer = new BackendInitializer(this.#coreApis);
  }

  add<TOptions>(
    extension: BackendRegisterable<TOptions>,
    options?: TOptions
  ): void {
    this.#initializer.add(extension, options);
  }

  async start(): Promise<void> {
    await this.#initializer.start();
  }

  async stop(): Promise<void> {
    await this.#initializer.stop();
  }
}

interface CreateBackendOptions {
  apis: AnyApiFactory[];
}

export function createBackend(options?: CreateBackendOptions): Backend {
  return new BackstageBackend(options?.apis ?? []);
}
