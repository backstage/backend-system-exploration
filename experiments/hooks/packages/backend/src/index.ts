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

/*

Nails:
 - For collections of features, e.g. catalog processors:
    - Provide a default set, easily add or remove from this set
    - Configure individual features
    - Trees of features
 - Plugin modules that extend the functionality of existing plugins
 -


Hammers:
 - Hooks
 - Modules
 - ApiRefs, DI

*/



providers.google.create(): Inflatable<AuthProvider>
providers.google.resolvers.byCommonLabel
providers.github.resolvers.byCommonLabel

const urlReaderProcessor = createFeature({
  init(x: catalogPlugin.FeatureApi)
})

import {processors} from '@backstage/plugin-catalog-backend';

processors.urlReader.create()

processors: FeatureCollection<CatalogProcessor>

export const processors = createFeatureCollection({
  urlReader: ...,
});

catalogInstance.processors.replace(({ defaults }) => [...defaults, myNew]);

backend.add(catalogPlugin, (i: T) => {
  i.builder.processors.replace(a, b, c);
});

import {derpModule} from 'derp-module'

backend.add(catalogPlugin, {
  processors: processors.create({
    without: ['urlReader'],
    add: [myUrlReader]
  }),
  // Maybe we could do this?
  processors2: {
    without: ['urlReader'],
    add: [myUrlReader]
  },
  // Or if you're some kind of fluent-api loving maniac, we could:
  processors3: processors.default().without('urlReader').append(myUrlReader).shuffle(),
});
backend.add(injectionOverride(derpModule, {}), derpConfig)
backend.add(derpModule.withOverride(), derpConfig)
backend.add(derpModule, derpConfig, {overrides: {}})
backend.add(derpModule(derpConfig), {overrides: {}})

providers.google.create(): Bottled<AuthProvider>

processors.default() = [
  processors.proc0.create(),
  processors.proc1.create(),
  processors.proc2.create(),
  processors.proc3.create(),
  processors.proc4.create(),
  processors.proc5.create(),
  processors.proc6.create(),
  processors.proc7.create(),
  processors.proc8.create(),
  processors.proc9.create(),
]

entityValidators.envelope.create()
entityValidators.envelope.validators.isValidString
