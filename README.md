# backend-system-exploration

A repo for exploring different ideas for how to evolve the Backstage backend
system.

Add experiments to `experiments/`, each within its own folder. Put a `README.md`
at the root with a short description.

## Problems to solve

1. Adding new dependencies is a breaking change
2. Adding required fields to the plugin environment is a breaking change
3. Backend package setup
   1. Deployment is hard
   2. Need to be able to split the backend deployment easily
      1. Scaling development
      2. Reliability
      3. Security
   3. Backend plugin DX
      1. Revisit hot module reloading
      2. ESM Module support
      3. Local DX / isolated plugin development
      4. Seamless use of staging/production deployment during development
   4. Installing a backend plugin is complex
      1. Improve DX
      2. Feature selection is tricky
4. Observability
   1. Healthchecks / rediness
   2. Metrics -> OpenTelemetry ready yet?

## Separate thoughts

1. Tooling for creating additional backends
2. Add @backstage/backend-defaults or something of that sort
