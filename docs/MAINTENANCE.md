# Site maintenance

Owner's guide for `Xiuyee-D/zqdelta`; agent rules are in [AGENTS.md](../AGENTS.md).

## Local workflow

Requires Docker, Git and Node/npm. `doctor` reports missing tools.

```bash
./bin/dev doctor
./bin/dev setup
./bin/dev start
```

Preview: <http://localhost:4000/zqdelta/>. Keep production `baseurl: /zqdelta`. Use `restart` after configuration/dependency changes, `stop` to stop preview, and `build` to generate `_site/`.

## Content

| Content                         | Source                              |
| ------------------------------- | ----------------------------------- |
| Sections and shared profile     | `_pages/`                           |
| Paired projects / blog metadata | `_projects/` / `_posts/`            |
| Shared Chinese blog bodies      | `_includes/blog-content/`           |
| Papers                          | `_bibliography/publications.bib`    |
| UI text / contacts              | `_data/i18n/` / `_data/socials.yml` |

Eight section sources and 404 are allowlisted; projects/posts require `published: true`. Copy existing paired YAML and inherit presentation defaults from `_config.yml`.

Projects sort ongoing first (`status: ongoing`, no `sort_date`), then by completion month (`sort_date: "YYYY-MM"`, matching `period`). Lists/details share `description`; retain each project's background, motivation and reflection structure. Blog lists sort by creation date; both metadata files share `body_include`, and English `toc_labels` map to original heading anchors.

Every page uses the localized about profile; contacts are email, LinkedIn and ORCID. Home order: biography, News, Publications, Education; retain `#educations`. The bilingual 404 links to both homepages, without redirects or search indexing.

## Presentation

- Academic Sans / Topaz Nord; body 16px/1.8, H1–H4 28/22/18/16px with narrow-screen adjustments. English prose is justified; Chinese and structured metadata retain their alignment.
- Preserve shared sidebar/header geometry, SVG tools, classic scrollbar space, native links/history, image decoding/preloads and reduced-motion/browser fallbacks. Content/theme fades are 200/240ms.
- Project/blog columns are 760px; About aligns with header tools. Projects use one list, date/type/directions in one row and a kind-only detail-title badge. No project TOC, reading time, standalone outcomes or empty resources.
- Blog covers are optional; images retain dimensions/proportions and height limits. Code/tables/formulas scroll locally; TOCs switch between a right sidebar and native inline disclosure.

## Static assets

Fonts, avatar derivatives and brand icons are committed; normal builds do not regenerate them. Preserve font coverage, weights 100–900 and manifests; see [font notes](../assets/fonts/README.md) and [brand notes](../assets/img/brand/README.md). Keep vendor bytes, SRI and licenses.

Automatic WebPs are limited to project illustrations at 480/800px for homepage paper previews. Extend `imagemagick` inputs/sizes when adding responsive image uses.

```bash
./bin/dev bundle exec ruby bin/build-profile-images.rb
./bin/dev bundle exec ruby bin/build-brand-icons.rb
```

Replace `assets/img/dzq.png` before rebuilding avatar derivatives; `_data/profile_image.json` drives srcset/preloads, which follow viewport metadata. Keep the original for sharing. Optional font rebuilding uses `bin/build-site-font.py` with FontTools/Brotli in a project-local environment; retain generated CSS, WOFF2 and manifests together.

`assets/voice-terminal/` is prebuilt. Preserve geometry corrections and the notice excluding battery, speaker and tactile switches. Source archive: `.dev-tools/archives/voice-terminal-r4-source.tar.gz` plus its manifest; reconstruction notes: `.local/docs/VOICE_TERMINAL.md`. Viewer/embedding changes require `test/personal_site_voice_terminal.cjs` and navigation tests.

## Checks and publication

```bash
./bin/dev check --final
npm run test:links
npm run test:site
```

These cover formatting, translations, upgrade/override audits, production build, internal links, integration and Chromium/Firefox/WebKit regressions. Linux browser dependencies use the optional container; keep classic-scrollbar/short-viewport tests. WebKit does not establish branded Safari verification. Set `PERSONAL_SITE_URL` to test an existing static server without starting preview.

After template edits, review `./bin/dev bundle exec al-folio upgrade overrides audit`, accept reviewed overrides, then rerun the audit with `--fail-on-stale`. `./bin/dev translations --record` records fingerprints only after actual synchronization and formatting.

Optional `./bin/dev audit` runs axe/Lighthouse; `audit-setup` installs tools locally. Lighthouse requires Node.js ≥22.19. Workflows retain site checks, CodeQL and manual deployment to `gh-pages`.
