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
  // stop(): Promise<void>;
}

interface Logger {
  log(message: string): void;
  child(fields: { [name: string]: string }): Logger;
}

interface ConfigApi {
  getString(key: string): string;
}

interface HttpRouterApi {
  get(path: string): void;
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

export const httpRouterApiRef = createApiRef<HttpRouterApi>({
  id: 'core.apiRouter',
});

export function createApiFactory<
  Api,
  Impl extends Api,
  Deps extends { [name in string]: unknown }
>(factory: ApiFactory<Api, Impl, Deps>): ApiFactory<Api, Impl, Deps> {
  return factory;
}

const BACKEND_ROOT_ID = 'root';

// const apiRouterFactory = createApiFactory({
//   api: httpRouterApiRef,
//   deps: { loggerFactory: loggerApiRef, config: configApiRef },
//   factory: async ({ loggerFactory }) => {
//     const router = Router();

//     return async (pluginId: string) => {
//       const logger = await loggerFactory(pluginId);
//       const pluginRouter = Router();
//       pluginRouter.use((req, res, next) => {
//         logger.log(`Incoming request to ${req.url}`);
//         // "Incoming request to /derp, plugin=catalog"
//       });
//       router.use(`/${pluginId}`, pluginRouter);

//       return {
//         use(path: string, middleware: Middleware) {
//           pluginRouter.use(path, (req, res, next) => {
//             logger.log(req.ctx, `Incoming request to ${req.url}`);
//             // "Incoming request to /derp, plugin=catalog"
//           });
//         },
//       }
//     }
//   },
// });

export interface PluginMetadataApi {
  pluginId: string;
}

type TypesToApiRefs<T> = { [key in keyof T]: ApiRef<T[key]> };
type DepsToDepFactories<T> = {
  [key in keyof T]: (pluginId: string) => Promise<T[key]>;
};

export type FactoryFunc<Impl> = (pluginId: string) => Promise<Impl>;

export type ApiFactory<
  Api,
  Impl extends Api,
  Deps extends { [name in string]: unknown }
> = {
  api: ApiRef<Api>;
  deps: TypesToApiRefs<Deps>;
  factory(deps: DepsToDepFactories<Deps>): Promise<FactoryFunc<Impl>>;
};

export type AnyApiFactory = ApiFactory<
  unknown,
  unknown,
  { [key in string]: unknown }
>;

export type ApiHolder = {
  get<T>(api: ApiRef<T>): FactoryFunc<T> | undefined;
};

// patrick we are stuck now, fix this plz.
// It's something! ¯\_(ツ)_/¯

class CoreApiRegistry {
  // readonly #pluginImplementations: Map<string, unknown>;
  readonly #implementations: Map<string, Map<string, unknown>>;
  readonly #factories: Map<string, AnyApiFactory>;

  constructor(factories: AnyApiFactory[]) {
    this.#factories = new Map(factories.map((f) => [f.api.id, f]));
    this.#implementations = new Map();
    // this.#pluginImplementations = new Map();
  }

  get<T>(ref: ApiRef<T>): FactoryFunc<T> | undefined {
    const factory = this.#factories.get(ref.id);
    if (!factory) {
      return undefined;
    }

    return async (pluginId: string): Promise<T> => {
      if (this.#implementations.has(ref.id)) {
        if (this.#implementations.get(ref.id)!.has(pluginId)) {
          return this.#implementations.get(ref.id)!.get(pluginId) as T;
        } else {
          this.#implementations.set(ref.id, new Map<string, unknown>());
        }
      } else {
        this.#implementations.set(ref.id, new Map());
      }

      const factoryDeps = Object.fromEntries(
        Object.entries(factory.deps).map(([name, apiRef]) => [
          name,
          this.get(apiRef)!, // TODO: throw
        ])
      );

      const factoryFunc = await factory.factory(factoryDeps);
      const implementation = await factoryFunc(pluginId);

      this.#implementations.set(
        ref.id,
        this.#implementations.get(ref.id)!.set(pluginId, implementation)
      );

      return implementation as T;
    };
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

  // async stop(): Promise<void> {
  //   await this.#initializer.stop();
  // }
}

interface CreateBackendOptions {
  apis: AnyApiFactory[];
}

export function createBackend(options?: CreateBackendOptions): Backend {
  return new BackstageBackend(options?.apis ?? []);
}
