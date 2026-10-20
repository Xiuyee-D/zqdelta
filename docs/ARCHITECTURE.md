# Personal site architecture

This is a personal site based on the al-folio v1.x thin starter. Jekyll builds the source; pinned Ruby gems provide the core runtime, styles and feature tags. The site owns its content, custom layouts/includes and small CSS/JS adapters.

## Data and rendering

- `_pages/` contains section and standby sources; `_config.yml` allowlists the eight published section filenames.
- `_projects/` contains seven bilingual projects. `_includes/project-order.liquid` provides the shared global order for cards and adjacent navigation.
- `_posts/` contains bilingual metadata only. `_includes/blog-content/` contains one Chinese Markdown body per note; the post layout generates the corresponding localized outline.
- The localized about page supplies every page's profile. `_bibliography/publications.bib` is the only personal bibliography.
- `_layouts/default.liquid` supplies the common frame, language alternates and local styles/runtime. `head.liquid` and `scripts.liquid` shadow the core to load only used resources while retaining metadata, favicon, theme bootstrap and core CSS.
- The gem's Tailwind/core styles remain the base pipeline. Local typography, profile/frame and section/detail CSS are separate. Do not add another CSS compiler.
- The CAD iframe is a lazy, opt-in component with prebuilt geometry. Ordinary Jekyll builds never read STEP or require Python CAD tools.

## Overrides and upgrades

`.al-folio-overrides.yml` tracks files that shadow installed gem templates. New custom components without an upstream counterpart are site-owned. After a gem upgrade, audit, inspect upstream/local differences, then accept only the reviewed records. Do not delete the manifest or bypass drift failures.

The comment-only footer is intentional: removing it restores the upstream footer. Core `theme.js` initializes synchronously; the local theme adapter preserves the palette and fade behavior. Both code-highlight stylesheet IDs are required by that runtime.

## Failure modes that produce no error message

1. A feature can remain inert when the gem, configured plugin or relevant flag is missing. Inspect the generated HTML instead of assuming a field enabled it.
2. Gemfile and `_config.yml` must agree. The lockfile fixes dependency versions; Docker images are keyed by the Dockerfile and dependency files.
3. The production baseurl is `/zqdelta`. Verify actual prefixed links; clearing baseurl can hide routing errors.

Use [the local workflow](LOCAL_DEVELOPMENT.md), [content contract](CONTENT_CONTRACT.md), [visual contract](PROJECT_PRESENTATION.md) and [ownership boundaries](BOUNDARIES.md). Generic runtime changes belong in the owning [al-org-dev plugin](https://github.com/al-org-dev); this site's deliberate overrides stay audited here.
