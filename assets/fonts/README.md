# Academic Sans webfont

These static subsets of Noto Sans SC share the existing Academic Sans family and variable weights 100–900. Splitting the files preserves the original glyphs and metrics.
They retain GB2312, supported Latin/punctuation, and supported characters in the current pages, projects, post metadata, shared Chinese blog bodies, data and bibliography. Unsupported characters use the CSS fallback fonts.

`academic-sans.css` uses nonoverlapping `unicode-range` declarations. Browsers fetch only subsets needed by the page:

- Latin: the small shared alphabet and punctuation used by English pages.
- Common: Chinese and symbols used by the homepage, interface, project metadata and awards.
- Text: other characters already used in the sources, grouped by frequency in batches of at most 256 so a long article can reuse a few subsets.
- Reserve: remaining characters in groups of at most 256, keeping ordinary future GB2312 edits covered without rebuilding.

The generated `_data/fonts.json` identifies the primary preload subsets. Main pages preload Latin; Chinese pages and Chinese blog bodies also preload the common subset. Other subsets load only when their characters occur in the page. The CAD iframe links the same stylesheet and reuses cached subsets. Content hashes in WOFF2 filenames prevent stale glyph coverage after regeneration. Do not restore the original 2 MB monolithic preload.

- Upstream: [Google Fonts / Noto Sans SC](https://github.com/google/fonts/tree/e9678a5385322c63730122ba464765baad83cfd8/ofl/notosanssc).
- Source: `NotoSansSC[wght].ttf` at commit `e9678a5385322c63730122ba464765baad83cfd8`.
- Source SHA-256: `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`.
- License and copyright: [OFL-NotoSansSC.txt](OFL-NotoSansSC.txt). The upstream reserved font name is “Source”; this subset is named “Academic Sans”.
- Generator: `python3 bin/build-site-font.py`, using FontTools 4.51.0 and Brotli. The source is cached in ignored `.dev-tools/font-source/`.

The stylesheet, WOFF2 files and manifest are ready-to-use assets. Normal Jekyll builds require neither Python font tooling nor a font service. For an optional rebuild, see [the local development guide](../../docs/LOCAL_DEVELOPMENT.md); format the generated stylesheet and manifest with Prettier, and commit all generated outputs together. Only obsolete files owned by the font generator are removed on rebuild; licenses and private source caches remain.
