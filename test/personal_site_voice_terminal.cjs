// Run against bin/dev start. VOICE_TERMINAL_LANGS=zh-CN supports the Chinese-first preview.
const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.PERSONAL_SITE_URL || "http://127.0.0.1:4000/zqdelta";
const locales = (process.env.VOICE_TERMINAL_LANGS || "zh-CN,en").split(",");
const screenshots = process.env.VOICE_TERMINAL_SCREENSHOTS;
if (screenshots) fs.mkdirSync(screenshots, { recursive: true });
const route = (locale) => `${base}${locale === "zh-CN" ? "/zh" : ""}/projects/portable-ai-voice-terminal/`;
const words = (locale) =>
  locale === "zh-CN"
    ? { open: "查看交互模型", expand: "展开", reset: "复位", retry: "重新加载交互模型" }
    : { open: "Explore 3D model", expand: "Exploded", reset: "Reset", retry: "Reload 3D model" };
async function visit(page, locale) {
  await page.goto(route(locale), { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".voice-terminal").scrollIntoViewIfNeeded();
}
async function open(page, locale, label = words(locale).open) {
  const figure = page.locator(".voice-terminal");
  await figure.getByRole("button", { name: label, exact: true }).click();
  await page.waitForFunction(() => document.querySelector(".voice-terminal").classList.contains("is-ready"));
  const frame = await (await figure.locator("iframe").elementHandle()).contentFrame();
  await frame.evaluate(() => document.fonts.ready);
  return frame;
}
async function screenshot(page, name) {
  if (screenshots) await page.screenshot({ path: path.join(screenshots, name + ".png"), animations: "disabled" });
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  try {
    let count = 0;
    for (const locale of locales)
      for (const width of [375, 768, 1440])
        for (const theme of ["light", "dark"]) {
          const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
          const page = await context.newPage();
          const errors = [],
            models = [];
          page.on("pageerror", (error) => errors.push(error.message));
          page.on("request", (request) => {
            if (request.url().endsWith(".vtm")) models.push(request.url());
          });
          await visit(page, locale);
          const figure = page.locator(".voice-terminal");
          assert.match(
            await figure.locator("figcaption").textContent(),
            locale === "zh-CN" ? /不含电池、扬声器和轻触开关/ : /does not include a battery, speaker, or tactile switches/
          );
          assert.equal(await figure.locator("iframe").count(), 0);
          assert.equal(models.length, 0, "Geometry must not load before activation");
          await figure.locator("img:visible").evaluate((image) => image.decode());
          const before = await figure.boundingBox();
          await screenshot(page, `${locale}-${width}-${theme}-static`);
          const frame = await open(page, locale);
          assert.equal(models.length, 1);
          assert.equal(await frame.locator("button").count(), 3);
          let snapshot = await frame.evaluate(() => window.voiceTerminal.snapshot());
          assert.equal(snapshot.partCount, 7);
          assert.equal(snapshot.uniqueMeshCount, 6);
          assert.equal(snapshot.theme, theme);
          assert.equal(await frame.locator("html").getAttribute("lang"), locale);
          const clip = snapshot.parts.find((part) => part.id === "clip");
          assert.ok(Math.abs((Math.asin(clip.rotation[2][1]) * 180) / Math.PI - 0.3) < 1e-8);
          await frame.getByRole("button", { name: words(locale).expand, exact: true }).click();
          await frame.waitForFunction(() => window.voiceTerminal.snapshot().progress === 1);
          snapshot = await frame.evaluate(() => window.voiceTerminal.snapshot());
          assert.deepEqual(
            snapshot.parts.find((part) => part.id === "rear").offset,
            snapshot.parts.find((part) => part.id === "clip").offset,
            "Clip must remain constrained to the rear housing"
          );
          const after = await figure.boundingBox();
          for (const key of ["x", "y", "width", "height"]) assert.ok(Math.abs(after[key] - before[key]) < 1, `Viewer moved: ${key}`);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          await screenshot(page, `${locale}-${width}-${theme}-expanded`);
          await frame.getByRole("button", { name: words(locale).reset, exact: true }).click();
          assert.equal(await frame.evaluate(() => window.voiceTerminal.snapshot().progress), 0);
          await frame.locator("canvas").focus();
          const yaw = await frame.evaluate(() => window.voiceTerminal.snapshot().yaw);
          await page.keyboard.press("ArrowLeft");
          assert.notEqual(await frame.evaluate(() => window.voiceTerminal.snapshot().yaw), yaw);
          await page.keyboard.press("Home");
          assert.equal(await frame.evaluate(() => window.voiceTerminal.snapshot().yaw), yaw);
          if (width <= 575) await page.locator("[data-site-nav-toggle]").click();
          await page.locator("#light-toggle").click();
          if (width <= 575) await page.locator("[data-site-nav-toggle]").click();
          await frame.waitForFunction((expected) => document.documentElement.dataset.theme === expected, theme === "light" ? "dark" : "light");
          const stage = await frame.locator("canvas").boundingBox();
          const scroll = await page.evaluate(() => scrollY);
          await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2);
          await page.mouse.wheel(0, 150);
          await page.waitForFunction((previous) => scrollY > previous, scroll);
          assert.deepEqual(errors, []);
          await context.close();
          count++;
        }
    const locale = locales[0];
    const reduced = await browser.newContext({ reducedMotion: "reduce" });
    const reducedPage = await reduced.newPage();
    await visit(reducedPage, locale);
    const reducedFrame = await open(reducedPage, locale);
    await reducedFrame.getByRole("button", { name: words(locale).expand, exact: true }).click();
    assert.equal(await reducedFrame.evaluate(() => window.voiceTerminal.snapshot().animating), false);
    assert.equal(await reducedFrame.evaluate(() => window.voiceTerminal.snapshot().progress), 1);
    await reduced.close();
    const retry = await browser.newContext();
    let attempts = 0;
    await retry.route("**/models/geometry.vtm", (route) => (++attempts === 1 ? route.abort() : route.continue()));
    const retryPage = await retry.newPage();
    await visit(retryPage, locale);
    await retryPage.getByRole("button", { name: words(locale).open, exact: true }).click();
    await retryPage.getByRole("button", { name: words(locale).retry, exact: true }).waitFor();
    assert.equal(await retryPage.locator(".voice-terminal iframe").count(), 0);
    assert.ok(await retryPage.locator(".voice-terminal img:visible").isVisible());
    await open(retryPage, locale, words(locale).retry);
    assert.equal(attempts, 2);
    await retry.close();
    const unavailable = await browser.newContext();
    await unavailable.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type === "webgl2" ? null : original.call(this, type, ...args);
      };
    });
    const unavailablePage = await unavailable.newPage();
    await visit(unavailablePage, locale);
    await unavailablePage.getByRole("button", { name: words(locale).open, exact: true }).click();
    await unavailablePage.getByRole("button", { name: words(locale).retry, exact: true }).waitFor();
    assert.equal(await unavailablePage.locator(".voice-terminal iframe").count(), 0);
    await unavailable.close();
    const noJS = await browser.newContext({ javaScriptEnabled: false });
    const staticPage = await noJS.newPage();
    await staticPage.goto(route(locale), { waitUntil: "domcontentloaded" });
    assert.equal(await staticPage.locator(".voice-terminal button:visible").count(), 0);
    assert.ok(await staticPage.locator(".voice-terminal img:visible").isVisible());
    await noJS.close();
    console.log(
      `Passed ${count} voice-terminal viewport/theme integrations, lazy loading, stable geometry, keyboard/scroll interaction, theme/language, reduced motion, load retry, WebGL and no-JS fallbacks.`
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
