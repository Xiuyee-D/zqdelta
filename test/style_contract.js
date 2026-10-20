// Check this personal site's wiring; runtime templates and CSS still belong to gems.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const read = (file) => fs.readFileSync(path.resolve(file), "utf8");
const exists = (file) => fs.existsSync(path.resolve(file));
const config = read("_config.yml");
const gemfile = read("Gemfile");
const pkg = JSON.parse(read("package.json"));
const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};
const pluginBlock = config.match(/^plugins:\s*\n((?:[ \t]*-[^\n]*\n|[ \t]*\n|[ \t]*#[^\n]*\n)*)/m)?.[1] || "";
const plugins = [...pluginBlock.matchAll(/^\s*-\s*([\w/-]+)\s*$/gm)].map((m) => m[1]);
const gems = [...gemfile.matchAll(/^\s*gem\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
requireCondition(/^theme:\s*al_folio_core\s*$/m.test(config), "Keep theme: al_folio_core.");
requireCondition(/^baseurl:\s*["']?\/zqdelta["']?(?:\s|$)/m.test(config), "Keep the production /zqdelta baseurl.");
for (const name of plugins)
  requireCondition(gems.includes(name.replace("jekyll/scholar", "jekyll-scholar")), `Plugin ${name} is missing from Gemfile.`);
for (const name of gems.filter((name) => /^al_|^jekyll-/.test(name))) {
  requireCondition(plugins.includes(name === "jekyll-scholar" ? "jekyll/scholar" : name), `Gem ${name} is missing from the plugin list.`);
  if (name.startsWith("al_"))
    requireCondition(new RegExp(`gem ['"]${name}['"], ['"]= \\d+\\.\\d+\\.\\d+['"]`).test(gemfile), `Pin ${name} to a released version.`);
}
for (const name of ["al_folio_core", "al_folio_upgrade", "al_math", "al_rtl", "jekyll/scholar", "jekyll-toc", "jekyll-imagemagick"]) {
  requireCondition(plugins.includes(name), `Missing used plugin: ${name}.`);
}
for (const name of ["search_enabled", "bib_search"]) requireCondition(new RegExp(`^${name}: false\\s*$`, "m").test(config), `Keep ${name} disabled.`);
for (const file of [
  "test/personal_site_test.rb",
  "test/run-personal-site.cjs",
  "test/personal_site_cross_browser.cjs",
  "test/serve-built-site.cjs",
  "bin/test-browsers",
  "Dockerfile.browser",
  ".al-folio-overrides.yml",
  "_includes/footer.liquid",
])
  requireCondition(exists(file), `Missing maintained file: ${file}.`);
for (const name of ["bilingual", "projects", "blog", "navigation", "image_navigation", "return_navigation", "theme", "voice_terminal"])
  requireCondition(exists(`test/personal_site_${name}.cjs`), `Missing personal-site regression: ${name}.`);
for (const script of ["build:css", "build:tailwind", "build:tailwind:watch"])
  requireCondition(!pkg.scripts?.[script], `Do not add a site-local ${script} pipeline.`);
for (const file of ["_sass", "_scripts", "assets/tailwind", "tailwind.config.js", "assets/webfonts"])
  requireCondition(!exists(file), `Gem-owned build path must not be copied into the site: ${file}.`);
requireCondition(!/{%\s*(?!comment|endcomment)[a-z_]/.test(read("_includes/footer.liquid")), "Keep the comment-only footer override.");
// Font subsets are committed static assets; ordinary builds never rebuild them.
const fontData = JSON.parse(read("_data/fonts.json"));
const fontCSS = read("assets/fonts/academic-sans.css");
for (const font of fontData.files) {
  const file = path.join("assets/fonts", font.file);
  requireCondition(exists(file), `Missing font subset: ${file}.`);
  if (!exists(file)) continue;
  const bytes = fs.readFileSync(file);
  const hash = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  requireCondition(font.file.endsWith(`-${hash}.woff2`), `Font content hash does not match: ${file}.`);
  requireCondition(bytes.length < 256 * 1024, `Keep individual font requests below 256 KiB: ${file}.`);
  requireCondition(fontCSS.includes(`url("${font.file}")`), `Font subset is missing from its CSS: ${file}.`);
}
for (const key of ["latin", "common"])
  requireCondition(
    fontData.files.some((font) => fontData[key] === `/assets/fonts/${font.file}`),
    `Missing ${key} primary subset.`
  );
requireCondition(!exists("assets/fonts/AcademicSans.woff2"), "Do not restore the monolithic font download.");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Personal-site wiring contract passed; template drift is checked by the override audit.");
