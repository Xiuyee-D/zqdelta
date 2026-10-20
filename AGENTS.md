# Agent guidelines for zqdelta

Personal Jekyll / al-folio site `Xiuyee-D/zqdelta`. Later user instructions take precedence. [MAINTENANCE.md](docs/MAINTENANCE.md) defines source locations, presentation constraints and commands.

- Work locally with Docker `bin/dev`. Commit, push, deploy, GitHub settings and host package installation require explicit authorization.
- Publish only About / Projects / Blog / Awards, real details and the bilingual 404. English is default; Chinese uses `/zh/`. Keep `/zqdelta`, publication opt-in, stable URLs, translation keys and ordering.
- Preserve confirmed facts, responsibilities, manuscript results, citations, provenance and user-edited metadata. Do not invent claims or restore demos. Edit Chinese first, preview, then synchronize English.
- Blog metadata/outlines are bilingual; `_includes/blog-content/` holds one shared Chinese body. Do not duplicate or translate it unless requested.
- When available, read `.local/docs/CONTENT_CONTRACT.md` before content edits and `.local/docs/PROJECT_PRESENTATION.md` before presentation edits. Update local development stages by phase, not per-turn histories.
- Gems own core CSS; align Gemfile, lockfile and configuration. Do not copy gem build trees or add Tailwind tooling. Preserve existing typography, palette, geometry, motion and browser fallbacks.
- Keep footer/search suppression, formula-only MathJax, both highlight stylesheet IDs, `.nojekyll` and localized sharing/404 metadata.
- Preserve licenses, original inputs and CAD corrections. Never publish private records or indiscriminately delete `.local/` or `.dev-tools/`; builds must work without them.
- Follow the maintenance checks. Record translation fingerprints only after actual synchronization and formatting; review template overrides before accepting them. Report actual checks and omissions; local results do not establish online CI, deployment or Safari verification.
