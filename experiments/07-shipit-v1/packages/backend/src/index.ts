// @ts-nocheck

import { commonEnvBundle } from '@internal/backend-env';
import { authPlugin } from '@backstage/plugin-auth-backend';
import { catalogPlugin } from '@backstage/plugin-catalog-backend';
import {
  scaffolderPlugin,
  ScaffolderEntitiesProcessor,
} from '@backstage/plugin-scaffolder-backend';

/*
SCOPE:

plugins:
 - auth
   - with builtin resolver configured
 - catalog
   - adds github discovery of org and components
   - adds scaffolder/template features
 - scaffolder
   - adds custom action
   - consumes catalog client

depth:
 - hooks?

*/

/**************************************************************/
/*************************** BACKEND **************************/
/**************************************************************/

interface BackendExtension {
  register(hooks: BackendHooks): void;
}

interface BackendPlugin extends BackendExtension {}

interface BackendModule extends BackendExtension {
  // no clear difference between module/plugin?
}

interface Backend {
  add(extension: BackendExtension): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

class BackstageBackend implements Backend {
  #started = false;
  #extensions = new Set<BackendExtension>();
  #hooks: BackendHooks;

  private constructor(private readonly config: Config) {}

  add(extension: BackendExtension) {
    if (this.#started) {
      throw new Error(
        'extension can not be added after the backend has started'
      );
    }
    this.#extensions.add(extension);
  }

  async start(): Promise<void> {
    if (this.#started) {
      throw new Error('Backend has already started');
    }
    this.#started = true;

    this.#hooks = new BackendHooks(this);

    for (const extension of this.#extensions) {
      extension.register(hooks);
    }

    this.validateSetup();

    await this.#hooks.runHook('start');
  }

  async stop(): Promise<void> {
    await this.#hooks.runHook('stop');
  }
}

interface CreateBackendOptions {
  config?: Config;
  args?: string[];
}

async function createBackend(
  _options?: CreateBackendOptions
): Promise<Backend> {
  const args = options.args ?? process.argv.slice(2);
  const config = options.config ?? (await loadBackendConfig({ args }));
  return new BackstageBackend(config, args);
}

///////////////////////////////////////////////////////////////

import { createBackend } from '@backstage/backend-defaults';

const backend = await createBackend();

backend.add(authPlugin());
backend.add(
  githubAuthModule.signIn({
    resolver: githubAuthModule.resolvers.nameMatchingName,
  })
);

backend.add(catalogPlugin());
backend.add(catalogPlugin.searchExtensions());
backend.add(catalogGithubModule.orgDiscovery());
backend.add(catalogGithubModule.entityDiscovery());

backend.add(scaffolderPlugin());
backend.add(scaffolderPlugin.catalogExtensions());

await backend.start();

/**************************************************************/
/********************** CATALOG PLUGIN ************************/
/**************************************************************/

function createBackendPlugin(options: {}): BackendExtension {}

// const backendEnv = createBackendEnv({
//   hooks: {
//     start: createBackendHook(),
//     stop: createBackendHook(),
//   },
// });

////////////////////////////////////////////////////////////////

import { createBackendPlugin, BackendEnv } from '@backstage/backend-plugin-api';

export const catalogPlugin = createBackendPlugin({
  register(env: BackendEnv) {
    const catalogEngine = new Engine();

    env.onStart(async () => {
      const apiRouter = env.getApiRouter();
      await catalogEngine.start();
      apiRouter.use('/v1', catalogRoutesV1);
    });

    env.onStop(async () => {
      await catalogEngine.stop();
      console.log('Engine has been terminated!');
    });
  },
});

export const catalogPlugin = createBackendPlugin({
  register(env: BackendEnv) {
    const catalogEngine = new Engine();

    // kinda like .tap -> next()
    env.onStart(async () => {
      const apiRouter = env.getApiRouter();
      await catalogEngine.start();
      apiRouter.use('/v1', catalogRoutesV1);

      return async () => {
        await catalogEngine.stop();
        console.log('Engine has been terminated!');
      };
    });
  },
});

export const catalogPlugin = createBackendPlugin({
  async init(env: BackendEnv) {
    const catalogEngine = new Engine();
    await catalogEngine.start();

    const apiRouter = env.getApiRouter();
    apiRouter.use('/v1', catalogRoutesV1);

    return async () => {
      await catalogEngine.stop();
    };
  },
});

/**************************************************************/
/********************** CATALOG PLUGIN ************************/
/**************************************************************/

////////////////////////////////////////////////////////////////

export const catalogPlugin = createBackendPlugin({
  async init(env: BackendEnv) {
    const catalogEngine = new Engine();
    await catalogEngine.start();

    const apiRouter = env.getApiRouter();
    apiRouter.use('/v1', catalogRoutesV1);

    return async () => {
      await catalogEngine.stop();
    };
  },
  extensionPoints: [
    {
      point: catalogExtensionPoint,
      factory: () => ({
        addProcessor(processor: CatalogProcessor) {
          this.processors.add(processor);
        },
      }),
    },
  ],
});

// PROBLEM: How do we initialize extension points while sharing internal state?

// What if register method returns the init method?
export const catalogPlugin = createBackendPlugin({
  register(env: BackendEnv) {
    const point = new CatalogExtensionPointImpl();

    env.provideExtensionPoint(catalogExtensionPoint, point);

    return async () => {
      // init

      const catalogEngine = new Engine(point.getProcessors());
      await catalogEngine.start();

      const apiRouter = env.getApiRouter();
      apiRouter.use('/v1', catalogRoutesV1);
    };
  },
});

class CatalogExtensionPointImpl implements CatalogExtensionPoint {}

export const catalogPlugin = createBackendPlugin({
  register(env: BackendEnv) {
    const processingExtensions = new CatalogExtensionPointImpl();

    env.registerApi({
      api: catalogApis.processingExtensions,
      value: processingExtensions,
    });

    env.init({
      deps: {
        apiRouter: backend.apis.apiRouter,
      },
      async init({ apiRouter }) {
        const catalog = new Catalog(processingExtensions.getProcessors());
        await catalog.start();

        apiRouter.use('/v1', createV1CatalogRoutes(catalog));
      },
    });
  },
});

export const catalogPlugin = createBackendPlugin({
  extensionPoints: [
    {
      extensionPoint: catalogExtensionRef,
      value: catalogExtension,
    },
  ],
  deps: {
    apiRouter: apiRouterExtensionRef,
  },
  init() {
    const catalogExtension = wa ?? t;
    const engine = new Engine(catalogExtension.getProcessors());
    await engine.start();

    apiRouter.use('/v1', catalogRoutesV1);
  },
});

import catalogEnv from '@backstage/backend-catalog-node';
import routeEnv from '@backstage/backend-common';

export const catalogPlugin = createBackendPlugin({
  async register(ctx: BackendContext) {
    const { router } = yield ctx.get(routeEnv);
    router.use('/catalog', routes);
    const catalogEngine = new CatalogEngine();
    catalogEngine.addProcessor(builtinProcessor());
    ctx.set(catalogEnv, { engine: catalogEngine });
    return async () => {
      await catalogEngine.start();
    };
  },
});

interface CatalogExtensionPoint {
  addProcessor(processor: CatalogProcessor): void;
  readonly processors: CatalogProcessor[];
}

export const catalogExtensionPoint =
  createBackendExtensionPoint<CatalogExtensionPoint>({
    id: 'catalog',
    implementation: {
      addProcessor(processor: CatalogProcessor) {
        this.processors.add(processor);
      },
    },
  });

import {
  createBackendExtension,
  BackendEnv,
} from '@backstage/backend-plugin-api';
import { catalogExtensionPoint } from '@backstage/plugin-catalog-node';

const scaffolderCatalogExtension = createBackendExtension({
  deps: [catalogEnv],
  async init(ctx, options) {
    const extension = ctx.resolve(catalogExtensionPoint, { optional: true });
    if (!extension) {
      throw new Error('Catalog extension is not available');
    }

    extension.addProcessor(new scaffolderV3Processor());
  },
});

const scaffolderCatalogExtension = createBackendExtension<OptionsType>({
  async register(env, _options: OptionsType) {
    env.decorate(
      { api: catalogApis.processingExtensions },
      (processingExtensions) => {
        processingExtensions?.addProcessor(new ScaffolderV3Processor());
      }
    );

    env.decorate({ api: backend.apis.lifecycle }, (lifecycle) => {
      lifecycle.onStart(async () => {
        // start stuff
      });
    });

    env.consume({
      deps: {
        lifecycle: backend.apis.lifecycle,
      },
      callback({ lifecycle }) {
        lifecycle.onStart(async () => {
          processingExtensions?.addProcessor(new ScaffolderV3Processor());
        });
      },
    });
  },
});
