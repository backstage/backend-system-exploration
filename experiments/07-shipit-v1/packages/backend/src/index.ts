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

import {
  createBackendExtension,
  BackendEnv,
} from '@backstage/backend-plugin-api';
import { catalogEnv } from '@backstage/plugin-catalog-backend';

const scaffolderCatalogExtension = createBackendExtension({
  deps: [catalogEnv],
  async init(ctx) {
    const catalog = ctx.resolve(catalogEnv, { optional: true });
    if (!catalog) {
      throw new Error('Catalog environment is not available');
    }

    catalog.addProcessor(new scaffolderV3Processor());
  },
});
