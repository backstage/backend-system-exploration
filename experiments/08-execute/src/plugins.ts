import {
  BackendEnv,
  createApiRef,
  createBackendExtension,
  createBackendPlugin,
} from './plugin-api';

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

interface CatalogPluginOptions {
  disableProcessing?: boolean;
}

export const catalogPlugin = createBackendPlugin({
  id: 'catalog',
  register(env, options?: CatalogPluginOptions) {
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
        if (!options?.disableProcessing) {
          await catalog.start();
        }

        // apiRouter.use('/v1', createV1CatalogRoutes(catalog));
      },
    });
  },
});

export const scaffolderCatalogExtension = createBackendExtension({
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
