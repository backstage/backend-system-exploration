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
