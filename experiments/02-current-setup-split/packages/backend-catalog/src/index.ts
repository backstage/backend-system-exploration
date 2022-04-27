import Router from 'express-promise-router';
import {
  CacheManager,
  createServiceBuilder,
  getRootLogger,
  loadBackendConfig,
  notFoundHandler,
  DatabaseManager,
  SingleHostDiscovery,
  UrlReaders,
  useHotMemoize,
  ServerTokenManager,
  PluginEndpointDiscovery,
} from '@backstage/backend-common';
import { TaskScheduler } from '@backstage/backend-tasks';
import { Config } from '@backstage/config';
import catalog from './plugins/catalog';
import { PluginEnvironment } from './types';
import { ServerPermissionClient } from '@backstage/plugin-permission-node';

class CustomDiscovery implements PluginEndpointDiscovery {
  constructor(private readonly delegate: PluginEndpointDiscovery) {}

  async getBaseUrl(pluginId: string): Promise<string> {
    if (pluginId === 'auth') {
      return `http://auth:7007/api/auth`;
    }
    if (pluginId === 'scaffolder') {
      return `http://scaffolder:7007/api/scaffolder`;
    }
    return this.delegate.getBaseUrl(pluginId);
  }

  async getExternalBaseUrl(pluginId: string): Promise<string> {
    return this.delegate.getExternalBaseUrl(pluginId);
  }
}

function makeCreateEnv(config: Config) {
  const root = getRootLogger();
  const reader = UrlReaders.default({ logger: root, config });
  const discovery = new CustomDiscovery(SingleHostDiscovery.fromConfig(config));
  const tokenManager = ServerTokenManager.fromConfig(config, { logger: root });
  const permissions = ServerPermissionClient.fromConfig(config, {
    discovery,
    tokenManager,
  });
  const databaseManager = DatabaseManager.fromConfig(config);
  const cacheManager = CacheManager.fromConfig(config);
  const taskScheduler = TaskScheduler.fromConfig(config);

  root.info(`Created UrlReader ${reader}`);

  return (plugin: string): PluginEnvironment => {
    const logger = root.child({ type: 'plugin', plugin });
    const database = databaseManager.forPlugin(plugin);
    const cache = cacheManager.forPlugin(plugin);
    const scheduler = taskScheduler.forPlugin(plugin);
    return {
      logger,
      cache,
      database,
      config,
      reader,
      discovery,
      tokenManager,
      permissions,
      scheduler,
    };
  };
}

async function main() {
  const logger = getRootLogger();

  logger.info(
    `You are running an example backend, which is supposed to be mainly used for contributing back to Backstage. ` +
      `Do NOT deploy this to production. Read more here https://backstage.io/docs/getting-started/`
  );

  const config = await loadBackendConfig({
    argv: process.argv,
    logger,
  });

  const createEnv = makeCreateEnv(config);

  const catalogEnv = useHotMemoize(module, () => createEnv('catalog'));

  const apiRouter = Router();
  apiRouter.use('/catalog', await catalog(catalogEnv));
  apiRouter.use(notFoundHandler());

  const service = createServiceBuilder(module)
    .loadConfig(config)
    .addRouter('/api', apiRouter);

  await service.start().catch((err) => {
    logger.error(err);
    process.exit(1);
  });
}

module.hot?.accept();

main().catch((error) => {
  console.error('Backend failed to start up', error);
  process.exit(1);
});
