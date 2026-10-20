# Ownership boundaries

| Change                                                                  | Owner                                                            |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Personal content, bibliography, contacts, i18n and assets               | This repository                                                  |
| Dependency pins, activation and feature flags                           | Gemfile, lockfile and `_config.yml` together                     |
| Personal layouts/includes and small CSS/JS adapters                     | This repository, with audit records for gem overrides            |
| Generic layout, CSS pipeline, tags/filters or reusable feature behavior | The owning al-folio gem                                          |
| Personal-site integration, routing, visual/interaction regressions      | `test/personal_site_*`, the runner and local-link check          |
| CAD geometry rebuild tools and original STEP                            | Preserved private archive; publish only the active viewer assets |
| Development environment                                                 | `Dockerfile.dev`, `bin/dev`, `bin/serve-local.rb`                |

Keep the runtime in versioned gems. A personal site may shadow templates; that does not justify copying the full gem or introducing a second Tailwind pipeline. Audit each shadow and compare it when upgrading.

The upstream starter's feature/demo test requirements are not this site's publication scope. Keep tests that protect the actual personal site and the small upgrade CLI integration. Preserve licenses and useful content/resource extension points; remove template-only dependencies with their consumers and fixtures.

See [architecture](ARCHITECTURE.md) and [the local workflow](LOCAL_DEVELOPMENT.md). No cleanup or validation command should commit, publish, alter GitHub settings, install host packages or prune unrelated Docker resources.
