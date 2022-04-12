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
  bundles: [commonEnvBundle()],
  configures: [
    {
      api: loggerApiRef,
      deps: { config: configApiRef },
      configure: (logger, { config }) => {
        logger.setLogLevel(config.getString('...'));
      },
    },
    ScaffolderEntitiesProcessor.configurator(),
    // ===
    {
      api: catalogPlugin,
      deps: { logger: loggerApiRef },
      configure: (catalogPlugin, { logger }) => {
        catalogPlugin.addProcessor(new ScaffolderEntitiesProcessor(logger));
      },
    },
  ],
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

backend.add(authPlugin);
backend.add(catalogPlugin, { apis: [] });
backend.add(scaffolderPlugin);

await backend.start(); // Maybe internally split into prepare + start?

// Catalog plugin implementation example
const catalog = createBackendPlugin({
  apis: [
    {
      api: catalogRefreshApi,
      deps: { logger: loggerApiRef },
      factory: ({ logger }) => createRefreshApi(logger),
    },
  ],
  register(holder, hooks) {
    holder.getApi(routeApiRef).use('/catalog', router);
  },
});
