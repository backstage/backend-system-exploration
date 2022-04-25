// @ts-nocheck

/*

Stuff to explore:

 - Router setup, expose express, but simplify too
 - Environment setup pattern, defaults + overrides? DI?
 - Plugin configuration and setup + module system
 - Hot reloading / DevEx
 - Mixed development, production + development
 - Introspection + Swagger?

*/

import { commonEnvBundle } from '@internal/backend-env';
import { authPlugin } from '@backstage/plugin-auth-backend';
import { catalogPlugin } from '@backstage/plugin-catalog-backend';
import {
  scaffolderPlugin,
  ScaffolderEntitiesProcessor,
} from '@backstage/plugin-scaffolder-backend';

const backend = await createBackend({
  bundles: [commonEnvBundle(), maCompanyHooks()],
  provides: [
    createApiFactory({
      api: serviceDiscoveryApiRef,
      deps: { logger: loggerApiRef },
      factory: async ({ logger }) => createServiceDiscovery(logger),
    }),
    createApiFactory(loggerApiRef, createCustomLogger()),
    createApiFactory(catalogRefreshApi, createCustomRefresher()),
  ],
  plugins: [auth, catalog, scaffolder],
});

// OR
backend.add(env);
backend.add(authPlugin, { provides: [] });

const scaffolderEntitiesProcessorModule = createBackendModule({
  register(hook) {
    hooks.configure.tap({ logger: loggerApiRef }, ({ builder }, { logger }) => {
      builder.addProcessor(new ScaffolderEntitiesProcessor(logger));
    });
  },
});

const catalogPlugin: BackstageBackendPlugin<{
  configureParams: { builder: CatalogBuilder };
}>;
backend.add(catalogPlugin, {
  // This is a bit of a n earlier idea that we likely would replace
  // with the hook pattern just below if we end up going with those.
  configure: {
    deps: { logger: loggerApiRef },
    setup({ builder }, { logger }) {
      builder.addProcessor(new ScaffolderEntitiesProcessor(logger));
    },
  },

  // Might override the default modules provided by the catalog?
  // Perhaps mix in ...catalogPlugin.defaultModules or something like that if needed.
  modules: [scaffolderEntitiesProcessorModule],

  register(hooks) {
    hooks.configure.tap({ logger: loggerApiRef }, ({ builder }, { logger }) => {
      builder.addProcessor(new ScaffolderEntitiesProcessor(logger));
    });
    hooks.tearDown.tap(
      { catalogProcessingEngine: CatalogProcessingEngine },
      (catalogProcessingEngine) => {
        await catalogProcessingEngine.stop();
        // do extra work
      }
    );

    hooks.engine.teardown.tap();

    hook.tearDownEngine.tap((catalogEngine) => {
      catalogEngine.stop();
    });
    hook.tearDownEngine.tapWithDeps(
      { logger: loggerApiRef },
      async ({ logger }, catalogEngine) => {
        await catalogEngine.stop();
      }
    );

    // Random floating example of how a custom hook could be defined.
    const catalogPlugin = createBackendPlugin({
      hooks: {
        tearDownEngine: createHookRef<{ catalogEngine: CatalogEngine }>(
          'teardownengine'
        ),
      },
    });

    // Inside the catalog plugin implementation
    await hookContext.callHook({
      hook: hooks.teardownEngine,
      params: { catalogEngine },
      default: {
        deps: { logger: loggerApiRef },
      },
    });
    await hookContext.callHook(
      hooks.tearDownEngine,
      { catalogEngine },
      () => {}
    );
  },
});
backend.add(scaffolderPlugin);

await backend.start(); // Maybe internally split into prepare + start?

// Catalog plugin implementation example
const catalogPlugin = createBackendPlugin({
  apis: [
    {
      api: catalogRefreshApi,
      deps: { logger: loggerApiRef },
      factory: ({ logger }) => createRefreshApi(logger),
    },
  ],
  subModules: {
    locationStore: locationStoreModule(),
  },
  register(holder, hooks) {
    // This direct access of the holder is a bit scary, probably only have
    // the APIs accessible via the tap like in the examples above.
    holder.getApi(pluginRouteApiRef).addHandler(router);
    holder.getApi(rootRouteApiRef).addHandler(rootRouter);

    hooks.initialize.tapAsync(async () => {
      // async initialization
    });

    hooks.shutdown.tapAsync(async () => {
      // async shutdown
    });
  },
});

const locationStoreModule = createBackendModule({
  register(holder) {
    holder.getApi(pluginRouteApiRef).addHandler(locationRouter);

    hooks.initialize.tapAsync(async () => {
      // async initialization
    });
  },
});

const catalogGithubModule = createBackendModule({
  // plugin: catalogPlugin,
  pluginId: 'catalog',
  register(holder) {
    holder.getApi(pluginRouteApiRef).addHandler(router);
  },
});
