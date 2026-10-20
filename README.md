# Ziqian Deng · Academic website

Personal academic website: [xiuyee-d.github.io/zqdelta](https://xiuyee-d.github.io/zqdelta/).
English uses the existing URLs; Chinese starts at `/zh/`. The site publishes About, Projects, Blog and Awards.

## Local development

Docker, Git and Node/npm are required. Host Ruby is optional. Missing tools are reported by `bin/dev`; host system packages are not installed automatically.

```bash
./bin/dev doctor
./bin/dev setup
./bin/dev start
```

Preview: <http://localhost:4000/zqdelta/> and <http://localhost:4000/zqdelta/zh/>.
Use `./bin/dev restart` after configuration or dependency changes and `./bin/dev stop` to stop preview.
Production builds keep `baseurl: /zqdelta`.

## Content

| Content                                   | Location                                                 |
| ----------------------------------------- | -------------------------------------------------------- |
| Chinese section pages and shared profile  | `_pages/*-zh.md`                                         |
| Projects                                  | `_projects/<slug>.zh.md` / `<slug>.en.md`                |
| Blog titles, summaries, tags and outlines | `_posts/YYYY-MM-DD-<slug>.zh.md` / `.en.md`              |
| One shared Chinese body per blog note     | `_includes/blog-content/<slug>.md`                       |
| Personal papers                           | `_bibliography/publications.bib`                         |
| UI text and contacts                      | `_data/i18n/`, `_data/socials.yml`                       |
| Project/blog images                       | `assets/img/projects/<slug>/`, `assets/img/blog/<slug>/` |

Edit Chinese first and preview before synchronizing English. Blog bodies intentionally stay Chinese in both localized views. Published content explicitly sets `published: true`; standby CV, teaching and independent publications are excluded. One bilingual utility 404 page provides English and Chinese homepage links.

```bash
./bin/dev check
# After completing the corresponding English content:
./bin/dev translations --record
./bin/dev check --final
```

## Verification

```bash
npm run test:site:integration
npm run test:links
npm run test:site:browser
```

`test:links` checks the built `_site/`; `test:site` runs integration, eight Chromium suites and Firefox/WebKit compatibility checks. `test:site:cross-browser` runs only Firefox/WebKit; Linux uses an isolated optional browser container. The runner reuses `.dev-tools/browsers/` when available. If Chromium is missing, use the project-local Playwright installer described in the [local guide](docs/LOCAL_DEVELOPMENT.md).

The CI uses the same Docker build and personal-site tests. Deployment is a separate manual workflow and publishes the verified artifact; a normal push runs checks.

Optional local accessibility and performance audits use `./bin/dev audit`; install their project-local tools with `./bin/dev audit-setup` when needed. Lighthouse needs Node.js 22.19 or newer. Reports overwrite `.dev-tools/test-results/quality/`; see the [local guide](docs/LOCAL_DEVELOPMENT.md#可选本地质量审计).

## Maintenance

See the [development stages](docs/DEVELOPMENT_STAGES.md), [documentation index](docs/README.md), [content contract](docs/CONTENT_CONTRACT.md), [presentation contract](docs/PROJECT_PRESENTATION.md) and [retention rules](docs/CLEANUP_PLAN.md).
CAD source reconstruction and preserved local archives are documented in [VOICE_TERMINAL.md](docs/VOICE_TERMINAL.md); the normal site does not need a CAD environment.

Built with [Jekyll](https://jekyllrb.com/) and [al-folio](https://github.com/alshedivat/al-folio). Keep the repository [license](LICENSE), [font license](assets/fonts/OFL-NotoSansSC.txt) and [Blue Topaz license](assets/css/BLUE_TOPAZ_LICENSE.txt).

Partial styles are sourced or adapted from [Blue Topaz](https://github.com/PKM-er/Blue-Topaz_Obsidian-css). Thanks to WhyI and pkmer.cn. Palette and typography adaptations are documented in the presentation contract.
