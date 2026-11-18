# Local browser dependencies

## MathJax

`mathjax-3.2.2/` contains the original MathJax 3.2.2 combined TeX/MathML-to-CHTML
engine and its dynamic resource trees: TeX extensions, fonts, renderers, menu and
accessibility resources. Unused top-level engine bundles are omitted. The
Apache-2.0 license and a per-file SHA-256 manifest are included; the manifest also
records the original npm package URL, integrity and source paths.

The engine's SHA-256 SRI is pinned in `_config.yml`. JavaScript filenames end in
`.min.js` to bypass Jekyll Terser; bytes remain unchanged. The entire directory is
excluded from JSON minification and formatting. `site-math.js` resolves dynamic
resources relative to the local engine and maps extension filenames. The shared
scripts include loads the gem's configuration, local paths and engine in deferred
order, only on pages containing rendered math delimiters.

The browser checks block external requests to verify formulas, fonts and a lazy
TeX extension. The integration check verifies vendor hashes after a build. Keep
the license, resource trees, manifest and engine SRI together on updates.

## Back-to-top

`vanilla-back-to-top-7.2.1.min.js` is the unmodified distribution from
[vanilla-back-to-top 7.2.1](https://github.com/vfeskov/vanilla-back-to-top/tree/v7.2.1),
downloaded from the versioned npm distribution through jsDelivr. Its MIT license is
in `vanilla-back-to-top.LICENSE.txt`.

The SHA-256 SRI is
`sha256-uMJJ3EoTyfRBoTbR+lrfu1uRQ87RZG8AR3cVNuQVeFg=` and is also pinned in
`_config.yml`. Keep the original bytes when updating this dependency; the script
is excluded from formatting and minification. The shared scripts include loads
it with `defer`, before `site.js` initializes and labels the button.
