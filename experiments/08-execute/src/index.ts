export interface ApiRef<T> {
  id: string;
  T: T;
}

function createApiRef<T>({ id }: { id: string }): ApiRef<T> {
  return {
    id,
    get T(): T {
      throw Error('NO T');
    },
  };
}

interface BackendEnv {
  registerInitApi<T>(api: ApiRef<T>, impl: T): void;
  registerInit<Deps extends { [name in string]: unknown }>(options: {
    deps: { [name in keyof Deps]: ApiRef<Deps[name]> };
    init: (deps: Deps) => Promise<void>;
  });
}

interface BackendRegisterInit {
  id: string;
  consumes: Set<ApiRef<unknown>>;
  provides: Set<ApiRef<unknown>>;
  deps: { [name: string]: ApiRef<unknown> };
  init: (deps: { [name: string]: unknown }) => Promise<void>;
}

interface Backend {
  add(extension: BackendRegisterable): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

class BackstageBackend implements Backend {
  #started = false;
  #extensions = new Set<BackendRegisterable>();
  #stops = [];
  #registerInits = new Array<BackendRegisterInit>();
  #apis = new Map<ApiRef<unknown>, unknown>();

  #getInitDeps(deps: { [name: string]: ApiRef<unknown> }) {
    return Object.fromEntries(
      Object.entries(deps).map(([name, apiRef]) => [
        name,
        this.#apis.get(apiRef),
      ])
    );
  }

  add(extension: BackendRegisterable) {
    if (this.#started) {
      throw new Error(
        'extension can not be added after the backend has started'
      );
    }
    this.#extensions.add(extension);
  }

  async start(): Promise<void> {
    console.log(`Starting backend`);
    if (this.#started) {
      throw new Error('Backend has already started');
    }
    this.#started = true;

    for (const extension of this.#extensions) {
      const provides = new Set<ApiRef<unknown>>();

      let registerInit: BackendRegisterInit | undefined = undefined;

      console.log('Registering', extension.id);
      extension.register({
        registerInitApi: (api, impl) => {
          if (registerInit) {
            throw new Error('registerInitApi called after registerInit');
          }
          if (this.#apis.has(api)) {
            throw new Error(`API ${api.id} already registered`);
          }
          this.#apis.set(api, impl);
          provides.add(api);
        },
        registerInit: (options) => {
          if (registerInit) {
            throw new Error('registerInit must only be called once');
          }
          registerInit = {
            id: extension.id,
            provides,
            consumes: new Set(Object.values(options.deps)),
            deps: options.deps,
            init: options.init,
          };
        },
      });

      if (!registerInit) {
        throw new Error(
          `registerInit was not called by register in ${extension.id}`
        );
      }

      this.#registerInits.push(registerInit);
    }

    this.validateSetup();

    const orderedRegisterResults = this.#resolveInitOrder(this.#registerInits);

    for (const registerInit of orderedRegisterResults) {
      // TODO: DI
      const deps = this.#getInitDeps(registerInit.deps);
      // Maybe return stop? or lifecycle API
      this.#stops.push(await registerInit.init(deps));
    }
  }

  async stop(): Promise<void> {
    for (const stop of this.#stops) {
      await stop.stop();
    }
  }

  private validateSetup() {}

  #resolveInitOrder(registerInits: Array<BackendRegisterInit>) {
    let registerInitsToOrder = registerInits.slice();
    const orderedRegisterInits = new Array<BackendRegisterInit>();

    // TODO: Validate duplicates

    while (registerInitsToOrder.length > 0) {
      const toRemove = new Set<unknown>();

      for (const registerInit of registerInitsToOrder) {
        const unInitializedDependents = Array.from(
          registerInit.provides
        ).filter((r) =>
          registerInitsToOrder.some(
            (init) => init !== registerInit && init.consumes.has(r)
          )
        );

        if (unInitializedDependents.length === 0) {
          console.log(`DEBUG: pushed ${registerInit.id} to results`);
          orderedRegisterInits.push(registerInit);
          toRemove.add(registerInit);
        }
      }

      registerInitsToOrder = registerInitsToOrder.filter(
        (r) => !toRemove.has(r)
      );
    }
    return orderedRegisterInits;
  }
}

interface BackendRegisterable {
  id: string;
  register(env: BackendEnv): void;
}

function createBackend(): Backend {
  return new BackstageBackend();
}

function createBackendPlugin(
  options: BackendRegisterable
): BackendRegisterable {
  return options;
}

const createBackendExtension = createBackendPlugin;

interface CatalogProcessor {
  process(): void;
}

interface CatalogProcessingInitApi {
  addProcessor(processor: CatalogProcessor): void;
}

export const catalogProcessingInitApiRef =
  createApiRef<CatalogProcessingInitApi>({
    id: 'catalog.processing',
  });

class CatalogExtensionPointImpl implements CatalogProcessingInitApi {
  #processors = new Array<CatalogProcessor>();

  addProcessor(processor: CatalogProcessor): void {
    this.#processors.push(processor);
  }

  get processors() {
    return this.#processors;
  }
}

class Catalog {
  constructor(private readonly processors: CatalogProcessor[]) {}

  async start() {
    console.log(`Starting catalog with ${this.processors.length} processors`);
    for (const processor of this.processors) {
      processor.process();
    }
  }
}

export const catalogPlugin = createBackendPlugin({
  id: 'catalog',
  register(env: BackendEnv) {
    const processingExtensions = new CatalogExtensionPointImpl();

    // plugins depending on this API will be initialized before this plugins init method is executed.
    env.registerInitApi(catalogProcessingInitApiRef, processingExtensions);

    env.registerInit({
      deps: {},
      // deps: {
      //   apiRouter: backend.apis.apiRouter,
      // },
      async init({ apiRouter }) {
        const catalog = new Catalog(processingExtensions.processors);
        await catalog.start();

        // apiRouter.use('/v1', createV1CatalogRoutes(catalog));
      },
    });
  },
});

const scaffolderCatalogExtension = createBackendExtension({
  id: 'scaffolder.extensions.catalog',
  register(env: BackendEnv) {
    env.registerInit({
      deps: {
        catalogProcessingInitApi: catalogProcessingInitApiRef,
      },
      async init({ catalogProcessingInitApi }) {
        catalogProcessingInitApi.addProcessor({
          process() {
            console.log('Running scaffolder processor');
          },
        });
      },
    });
  },
});

const backend = createBackend();

// backend.add(authPlugin());
// backend.add(
//   githubAuthModule.signIn({
//     resolver: githubAuthModule.resolvers.nameMatchingName,
//   })
// );

// backend.add(catalogPlugin()); // TODO
backend.add(catalogPlugin);
// backend.add(catalogPlugin.searchExtensions());
// backend.add(catalogGithubModule.orgDiscovery());
// backend.add(catalogGithubModule.entityDiscovery());

// backend.add(scaffolderPlugin());
// backend.add(scaffolderPlugin.catalogExtensions()); // TODO
backend.add(scaffolderCatalogExtension);

backend.start().catch((error) => {
  console.error(error.stack);
  process.exit(1);
});
