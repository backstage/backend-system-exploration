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
  register(env: BackendEnv): void;
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

    const env = new BackendEnv(this);

    for (const extension of this.#extensions) {
      const extensionInit = extension.register(env);
      // TODO: Resolve init order
      this.#inits.push(extensionInit);
    }

    this.validateSetup();

    for (const inits of this.#inits) {
      // TODO: DI
      const deps = this.#getInitDeps(inits.deps);
      // Maybe return stop? or lifecycle API
      const stop = await init(deps);
    }
  }

  async stop(): Promise<void> {
    for (const stop of this.#stops) {
      await stop.stop();
    }
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

////////////////////////////////////////////////////////////////

interface CatalogExtensionPoint {
  addProcessor(processor: CatalogProcessor): void;
}

export const catalogExtensionPoint =
  createBackendExtensionPoint<CatalogExtensionPoint>({
    id: 'catalog',
  });

// PROBLEM: How do we initialize extension points while sharing internal state?
// SOLUTION: Init order is determined by the init API registration and dependencies.
//           A plugin init function will not be run until all of its dependents of its
//           init APIs have been initialized.

class CatalogExtensionPointImpl implements CatalogExtensionPoint {}

export const catalogPlugin = createBackendPlugin({
  register(env: BackendEnv, options) {
    const processingExtensions = new CatalogExtensionPointImpl();

    // plugins depending on this API will be initialized before this plugins init method is executed.
    env.registerStaticInitApi({
      api: catalogApis.processingExtensions,
      value: processingExtensions,
    });

    return {
      deps: {
        apiRouter: backend.apis.apiRouter,
      },
      async init({ apiRouter }) {
        const catalog = new Catalog(processingExtensions.getProcessors());
        await catalog.start();

        apiRouter.use('/v1', createV1CatalogRoutes(catalog));
      },
    };
  },
});

const scaffolderCatalogExtension = createBackendExtension<OptionsType>({
  async register(env, _options: OptionsType) {
    env.init({
      deps: {
        processingExtensions: catalogApis.processingExtensions,
      },
      async init({ processingExtensions }) {
        processingExtensions.addProcessor(new ScaffolderV3Processor());
      },
    });
  },
});
