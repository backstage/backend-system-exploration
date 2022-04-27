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

plugin:
 - auth
   - with builtin resolver configured
 - catalog
   - adds github discovery of org and components
   - adds scaffolder/template features
 - scaffolder
   - adds custom action
   - consumes catalog client


LATER SCOPE:
  - plugin endpoint discovery replaced with custom version
  - custom express middleware around it all
*/

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

////////////////////////////////////////////////////////////////////////////////

await startBackend({
  modules: [
    customEnvStuff(),
    authPlugin({
      providers: {
        github: {
          signIn: {
            resolver: authPlugin.providers.github.resolvers.nameMatchingName,
          },
        },
      },
    }),
    catalogPlugin(),
    catalogPlugin.searchExtensions(),
    catalogGithubModule.orgDiscovery(),
    catalogGithubModule.entityDiscovery(),
    scaffolderPlugin(),
    scaffolderPlugin.catalogExtensions(),
  ],
});

// backend.add(catalog({
//   providers: [githubDiscoveryProvider()],
//   processors: [...catalog.defaultProcessors(), ...scaffolder.defaultProcessors()]
// }))

// backend.add(scaffolder({
//   actions: [...scaffolder.defaultActions(), myCustomAction()]
// }));

// scaffolderV3TemplateProcessor = createModule({
//   envs: { catalog: catalogEnv },
//   init({ catalog }) {
//     catalog.initProcessors.tap((processors) => {
//       processors.add(...)
//     })
//   }
// })

// backend.add(catalogPlugin({ processors: [scaffolderPlugin.processor()]}))

// await startDefaultService(backend.build());

// what about listen etc - is the server different from the service, so to speak
// think more about health checks? maybe plugins register into a central facility
