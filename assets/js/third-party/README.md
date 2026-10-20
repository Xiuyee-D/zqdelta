# Local browser dependency

`vanilla-back-to-top-7.2.1.min.js` is the unmodified distribution from
[vanilla-back-to-top 7.2.1](https://github.com/vfeskov/vanilla-back-to-top/tree/v7.2.1),
downloaded from the versioned npm distribution through jsDelivr. Its MIT license is
in `vanilla-back-to-top.LICENSE.txt`.

The SHA-256 SRI is
`sha256-uMJJ3EoTyfRBoTbR+lrfu1uRQ87RZG8AR3cVNuQVeFg=` and is also pinned in
`_config.yml`. Keep the original bytes when updating this dependency; the script
is excluded from formatting and minification. The shared scripts include loads
it with `defer`, before `site.js` initializes and labels the button.
