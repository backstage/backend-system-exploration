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

// Catalog plugin implementation example
// Either standalone or a part of a wider backend
const catalog = createBackend({
  id: 'catalog',
  provides: [
    {
      api: catalogRefreshApi,
      deps: { logger: loggerApiRef },
      factory: ({ logger }) => createRefreshApi(logger),
    },
  ],
  register({ app }) {
    app.use('/catalog', router);
  },
});
// Running the above config as a standalone would fail with an error 'no loggerApiRef provided to backend 'catalog' because commonEnvBundle is not defined.

// Standalone start
catalog.start(Router())


// Providing needed constructs explicitly for standalone apps:
catalog.setProviders([
  {
    api: configApiRef,
    factory: () =>  ConfigReader.from('...')
  },
])
catalog.configure([
  {
    api: loggerApiRef,
    deps: { config: configApiRef },
    configure: (logger, { config }) => {
      logger.setLogLevel(config.getString('...'));
    },
  },
])



// Using plugins as part of a wider app
const backend = await createBackend({
  id: 'backend',
  plugins: [catalog, commonEnvBundle()],

  // 'Injects'
  configures: [
    {
      api: loggerApiRef,
      deps: { config: configApiRef },
      configure: (logger, { config }) => {
        logger.setLogLevel(config.getString('...'));
      },
    },
    {
      api: catalogPlugin,
      deps: { logger: loggerApiRef },
      configure: (catalogPlugin, { logger, catalogRefreshApi }) => {
        catalogPlugin.addProcessor(new ScaffolderEntitiesProcessor(logger));
        catalogPlugin.setRefreshApi(catalogRefreshApi);
      },
    },
  ],

  // 'Constructs'
  provides: [
    createApiFactory({
      api: serviceDiscoveryApiRef,
      deps: { logger: loggerApiRef },
      factory: async ({ logger }) => createServiceDiscovery(logger),
    }),
    createApiFactory(loggerApiRef, createCustomLogger()),
    createApiFactory(catalogRefreshApi, createCustomRefresher()),
  ],
  register({ app }) {
    app.use('/', router);
  },
});

await backend.start(Router()); // Maybe internally split into prepare + start?












const createBackend = (opts: BackendOpts) => {
  const routes = opts.plugins.reduce((acc, plugin) => ({...acc, plugin.getRoutes()}), {})
  return ({
    start(app: express.Router) {
      app.use('/api-docs', createOpenApiSpecsFromRoutes(routes));
      opts.plugins.forEach(plugin => plugin.register({ app }))
      app.listen(7000)
    },
    getRoutes() {
      return routes;
    }
  });

}
