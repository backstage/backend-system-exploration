import { createApiFactory, createBackend, loggerApiRef } from './backend-api';
import { catalogPlugin, scaffolderCatalogExtension } from './plugins';

interface Logger {
  log(message: string): void;
  child(fields: { [name: string]: string }): Logger;
}
class ToyLogger implements Logger {
  constructor(readonly fields: { [name: string]: string }) {}

  log(message: string): void {
    console.log(
      `${Object.entries(this.fields)
        .map((f) => f.join('='))
        .join(' ')}: ${message}`
    );
  }

  child(fields: { [name: string]: string }): Logger {
    return new ToyLogger({ ...this.fields, ...fields });
  }
}

const loggerFactory = createApiFactory({
  api: loggerApiRef,
  deps: {},
  factory: async () => {
    // const config = await configFactory(BACKEND_ROOT_ID)
    // console.log(`Creating logger with level ${config.getString('logLevel')}`);

    const rootLogger = new ToyLogger({});

    return async (pluginId: string) => rootLogger.child({ pluginId });
  },
});

const backend = createBackend({
  apis: [loggerFactory],
});

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
