// @ts-nocheck

export const logApiRef = createApiRef<LogApi>({
  id: 'core.logger',
  //   scope: 'context',
  //   createPlugin: (log: LogApi, pluginId: string) => log.child({pluginId}),
});

export const rootLoggerApiRef = createApiRef<RootLoggerApi>({
  id: 'core.rootlogger',
  //   scope: 'context',
  //   createPlugin: (log: LogApi, pluginId: string) => log.child({pluginId}),
});

const rootLoggerApi = createApiFactory({
  api: rootLoggerApi,
  factory: () => {
    return new ToyLogger();
  },
});

const loggerApi = createApiFactory({
  api: logApiRef,
  deps: { rootLoggerApi: rootLoggerApiRef },
  factory: ({ rootLoggerApi, ctx }) => {
    return rootLoggerApi.forPlugin(ctx);
  },
});

export const configApiRef = createApiRef<ConfigApi>({
  id: 'core.config',
});

export const pluginMetadataApiRef = createApiRef<PluginMetadataApi>({
  id: 'core.pluginMetadata',
});

export const apiRouterApiRef = createApiRef<ApiRouterApi>({
  id: 'core.apiRouter',
});

ctx.withValue(contextualLabelsWellKnownRefThingIHaveImported, (oldValue) => ({
  ...oldValue,
  pluginId,
}));
this.logger.warn(ctx, 'message'); // <-- reads out the same labels again

const newCtx = this.logger.contextWithLabels(ctx, { label1: 'value' }); // -> returns new ctx, internally calls Contexts.withValue(ctx, <key>, old => ({  }))
const newCtx = Contexts.withValue(ctx, labels, { pluginId });
const newCtx = ContextLabels.add(ctx, { pluginId });
const newCtx = ContextLabels.get(ctx);

const myPLugin = createBackendPlugin({
  apis: [],
});

const backend = createBackend({
  apis: [
    createApiFactory({
      api: logApiRef,
      deps: {},
      factory: () => new ToyLogger(),
    }),
  ],
});

// Deep in backend code
function instantiatePlugin(pluginId: string, rootContext: Context) {
  const pluginContext = rootContext.decorateApi(logApiRef, (log, ctx) =>
    log.child({ pluginId }, ctx)
  );
}

export const dbManagerServiceRef = createServiceRef<DbManagerService>({
  id: 'root.core.db',
  scope: 'backend',
});

export const dbServiceRef = createServiceRef<DbService>({
  id: 'plugin.core.db',
  scope: 'plugin',
});

createServiceFactory({
  api: dbManagerServiceRef,
  deps: { config: configApiRef, logger: rootLoggerApiRef },
  factory: ({ config, logger }) => {
    // const dbConnection = createConnection(config)
    return {
      forPlugin(pluginId: string, serviceHolder: ServiceHolder) {
        if (pluginId === 'catalog') {
          return; //...
        }
        const logger = serviceHolder.get(loggerServiceRef);
        try {
          const pluginConnection = createConnection(config, pluginId);
          return pluginConnection;
        } catch (error) {
          logger.forPlugin(pluginId).error('...');
          logger.error(`Failed to connect to DB, ${error}`);
        }
      },
    };
  },
});

{
  const backend = createBackend();

  const rootDbService = await backend.getService(dbServiceRef);
  const catalogDbService = await backend.getService(dbServiceRef, 'catalog');
}

createServiceFactory({
  api: dbServiceRef,
  deps: { configFactory: configServiceRef, loggerFactory: loggerServiceRef },
  factory: async ({ configFactory, loggerFactory }) => {
    const config = await configFactory(ROOT_PLUGIN_ID);
    const logger = await loggerFactory(ROOT_PLUGIN_ID);
    const globalManager = new ZomboCom(config, logger);

    return async (pluginId: string) => {
      if (pluginId === ROOT_PLUGIN_ID) {
        throw new Error('DATABASE NO');
      }
      const pluginLogger = await loggerFactory(pluginId);
      return await globalManager.create(pluginId, pluginLogger);
    };
  },
});

createServiceFactory({
  api: dbServiceRef,
  deps: {
    dbManager: dbManagerServiceRef,
    pluginMetaService: pluginMetaServiceRef,
  },
  factory: ({ dbManager, pluginMetaService }) => {
    return dbManager.forPlugin(pluginMetaService.getPluginId());
  },
});

const apiRouterFactory = createApiFactory({
  api: apiRouterApiRef,
  deps: {
    logger: loggerApiRef,
    config: configApiRef,
    ctx: contextApiRef,
    http: rootHttpApiRef,
  },
  //  staticFactory: () => new ToyLogger({}),
  factory: ({ logger, ctx }, ctx) => {
    // we want an implementation of a Logger here but not `.forPlugin` on it.
    const router = Router();

    const pluginId = PluginMetadata.fromContext(ctx).id;
    http.use(pluginId, router);

    // Middleware to inject plugin context
    router.use((req, _res, next) => {
      req.ctx = ctx;
      next();
    });

    // Middleware for traceId?

    return {
      use(path: string, middleware: Middleware) {
        router.use(`/${pluginId}/${path}`, (req, res, next) => {
          logger.log(req.ctx, `Incoming request to ${req.url}`);
          // "Incoming request to /derp, plugin=catalog"
        });
      },
    };
  },
});
