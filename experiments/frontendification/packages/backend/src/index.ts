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

const catalog = createBackendPlugin({
  register(derp, hooks) {
    pluginRouter.use('/catalog', router);

    hooks.initialize.tapAsync(async () => {
      // async initialization
    });

    hooks.shutdown.tapAsync(async () => {
      // async shutdown
    });
  },
});

const backend = await createBackend({
  apis: [
    createApiFactory({
      api: serviceDiscoveryApiRef,
      deps: { logger: loggerApiRef },
      factory: ({ logger }) => createDiscovery(logger),
    }),
    createApiFactory(loggerApiRef, createCustomLogger()),
  ],
  plugins: [auth, catalog, scaffolder],
});

// OR

backend.add(auth);
backend.add(catalog);
backend.add(scaffolder);

await backend.start(); // Maybe internally split into prepare + start?
