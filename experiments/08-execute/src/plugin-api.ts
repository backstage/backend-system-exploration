export interface ApiRef<T> {
  id: string;
  T: T;
}

export function createApiRef<T>(options: { id: string }): ApiRef<T> {
  return {
    id: options.id,
    get T(): T {
      throw Error('NO T');
    },
  };
}

export interface BackendEnv {
  registerInitApi<T>(api: ApiRef<T>, impl: T): void;
  registerInit<Deps extends { [name in string]: unknown }>(options: {
    deps: { [name in keyof Deps]: ApiRef<Deps[name]> };
    init: (deps: Deps) => Promise<void>;
  }): void;
}

export type BackendRegisterable<TOptions> = {
  id: string;
  register(env: BackendEnv, options?: TOptions): void;
};

export function createBackendPlugin<TOptions>(
  config: BackendRegisterable<TOptions>
): BackendRegisterable<TOptions> {
  return config;
}

export const createBackendExtension = createBackendPlugin;
