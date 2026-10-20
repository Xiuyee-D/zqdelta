# Agent guidelines for zqdelta

This is the personal academic site `Xiuyee-D/zqdelta`, built with Jekyll / al-folio v1.x. This file is the authoritative entry point; preserve later user instructions over repository defaults.

## Workflow and scope

- Keep [development status](docs/DEVELOPMENT_STAGES.md) organized by phases. Update the current outcome, acceptance evidence and outstanding items in the relevant phase; do not append per-turn change histories. Detailed diagnostics belong in the ignored, stable test-results directories.
- Use the Docker `bin/dev` workflow in [LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md). Keep production `baseurl: /zqdelta`; preview is `http://localhost:4000/zqdelta/`.
- Work locally. Do not commit, push, deploy, change GitHub settings or install host system packages without explicit user authorization. Container dependencies and project-local npm packages are managed by `bin/dev`.
- Publish only About / Projects / Blog / Awards and their real detail pages. English is the default; Chinese uses `/zh/`. The allowlist contains eight section sources; projects and posts explicitly opt in with `published: true`.
- Read [CONTENT_CONTRACT.md](docs/CONTENT_CONTRACT.md) before editing content and [PROJECT_PRESENTATION.md](docs/PROJECT_PRESENTATION.md) before changing presentation. Preserve the seven projects' confirmed scope, manuscript results, references, data provenance and current user-edited metadata.
- Edit Chinese first, preview, then update the corresponding English content. Blog has bilingual metadata and outlines with **one shared Chinese body** under `_includes/blog-content/`; never duplicate or translate the body unless requested.
- Preserve names, facts, citations, stable URLs, paired translation keys and project order. Do not rewrite topics or technology entries during layout work.
- Every page uses the localized about profile. Contact channels are email, LinkedIn and ORCID from `_data/socials.yml`.
- Homepage order is biography, News, Publications, Education; keep `#educations`. Personal papers live in `_bibliography/publications.bib`. The independent publications, CV and teaching sources remain private standby pages. Publish one bilingual utility `/404.html` with explicit English/Chinese homepage links, no automatic redirect and no search indexing.
- Do not restore demo projects, posts, template media, the original blog import, deleted PCB/PI/SI archives or resource-renaming records. Retained local inputs and cleanup rules are documented in [CLEANUP_PLAN.md](docs/CLEANUP_PLAN.md).

## Runtime and visual boundaries

- The gem owns the core CSS pipeline; do not add a local Tailwind pipeline or copy Sass/webfonts build trees. Dependency changes must agree across Gemfile, lockfile and `_config.yml`.
- Personal layouts/includes may shadow the gems. Keep them in the override audit; see [ARCHITECTURE.md](docs/ARCHITECTURE.md) and [BOUNDARIES.md](docs/BOUNDARIES.md).
- Keep local Academic Sans, the existing Topaz Nord palette and the shared typography scales. Preserve English justification while Chinese and structured metadata keep their alignment.
- Academic Sans uses static Unicode-range subsets in `assets/fonts/academic-sans.css`, with preload filenames from `_data/fonts.json`; the CAD iframe shares them. Keep original glyph coverage and weights 100–900, and do not restore a monolithic font preload. Font rebuilding is optional and never part of ordinary Jekyll builds; see `assets/fonts/README.md`.
- Keep the SVG language/theme tools, shared sidebar geometry, fixed header space and classic scrollbar reservation. Navigation uses a 200ms content crossfade; theme changes use a 240ms viewport fade. Keep image decoding/preloads, native links/history, reduced-motion and unsupported-browser fallbacks.
- Projects remain one list, with dates/type/directions in one row and a kind-only title badge in details. List and detail widths are 760px. No project TOC, reading time, standalone outcomes or empty resources.
- Keep the comment-only `_includes/footer.liquid` override. Search stays disabled; removing a suppression override must not reintroduce gem defaults.
- MathJax loads only when the rendered content has Kramdown math delimiters. Keep both syntax-highlight stylesheets: the core theme runtime switches their IDs.
- Keep `.nojekyll` in the source and Jekyll include list for prebuilt branch publishing. Sharing metadata uses each page's title, description and locale, the supplied avatar, production URLs, and article type only on blog details; maintain the audited metadata override.
- The opt-in CAD viewer and its original source archive must remain independent of historical workspaces. Read [VOICE_TERMINAL.md](docs/VOICE_TERMINAL.md) and run its test after viewer/embedding changes; preserve all existing geometry corrections and the omitted-component notice.

## Validation

```bash
./bin/dev check
npm run test:site:integration
npm run test:links
npm run test:site:browser
```

`test:links` requires a production build. `test:site` runs the integration test, all eight Chromium suites and the Firefox/WebKit compatibility suite, using the local preview for Chromium and a temporary production-build server for Firefox/WebKit. `test:site:cross-browser` runs only Firefox/WebKit. Linux uses the optional browser container by default; never install host browser libraries automatically. WebKit coverage does not claim branded macOS/iOS Safari verification. Keep visible classic scrollbars and short desktop viewports in the navigation tests.

Optional local axe/Lighthouse audits use `./bin/dev audit [--axe|--lighthouse]`; the maintained script is `test/personal_site_quality.cjs`. Missing audit tools are installed only by explicit `./bin/dev audit-setup`, into the project-local ignored cache. See the local guide for requirements and report retention.

After actual final English synchronization, format first, then run `./bin/dev translations --record` and `./bin/dev check --final`. Recording fingerprints does not translate content; do not use it to hide untranslated changes.

For template changes, run `./bin/dev bundle exec al-folio upgrade overrides audit`, review the diff, accept the reviewed overrides and verify `--fail-on-stale`. Keep licenses and attributions. Report the checks actually run and any unverified work; never claim online deployment or CI passed based on local checks.
