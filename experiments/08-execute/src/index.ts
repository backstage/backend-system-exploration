import { createBackend } from './backend-api';
import { catalogPlugin, scaffolderCatalogExtension } from './plugins';

const backend = createBackend();

// backend.add(authPlugin());
// backend.add(
//   githubAuthModule.signIn({
//     resolver: githubAuthModule.resolvers.nameMatchingName,
//   })
// );

// backend.add(catalogPlugin({disableProcessing: true})); // TODO
backend.add(catalogPlugin, { disableProcessing: true }); // TODO
// backend.add(catalogPlugin.searchExtensions());
// backend.add(catalogGithubModule.orgDiscovery());
// backend.add(catalogGithubModule.entityDiscovery());

// backend.add(scaffolderPlugin());
// backend.add(scaffolderPlugin.catalogExtensions()); // TODO
backend.add(scaffolderCatalogExtension);

backend.start().catch((error) => {
  console.error(error.stack);
  // process.exit(1);
});
