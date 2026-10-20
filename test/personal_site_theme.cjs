// Run against bin/dev start. Reuse core's initialization and persisted preference.
const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.PERSONAL_SITE_URL || "http://127.0.0.1:4000/zqdelta";

async function themeState(page, expected) {
  await page.waitForFunction((theme) => document.documentElement.dataset.theme === theme, expected);
  const button = page.locator("#light-toggle");
  const target = expected === "dark" ? "light" : "dark";
  await page.waitForFunction((target) => {
    const button = document.getElementById("light-toggle");
    return button.getAttribute("aria-label") === button.dataset[`${target}Label`];
  }, target);
  assert.equal(await button.locator("[data-theme-icon]:visible").count(), 1);
  assert.equal(await button.locator("[data-theme-icon]:visible").getAttribute("data-theme-icon"), target);
  assert.equal(await page.locator("#light-toggle-system").count(), 0);
  await page.waitForFunction(() => !document.documentElement.classList.contains("site-theme-transition"));
}

async function paletteSwitch(page) {
  const result = await page.evaluate(async () => {
    const probe = document.createElement("span");
    probe.style.cssText = "position:fixed;visibility:hidden";
    document.body.append(probe);
    const resolve = (token) => {
      probe.style.color = `var(${token})`;
      return getComputedStyle(probe).color;
    };
    const read = () =>
      [
        ["body", "backgroundColor", "--site-bg"],
        [".project-card", "backgroundColor", "--site-surface"],
        ["main h1", "color", "--site-strong"],
        [".project-card h2", "color", "--site-strong"],
        [".project-card p", "color", "--site-muted"],
      ].map(([selector, property, token]) => ({
        selector,
        actual: getComputedStyle(document.querySelector(selector))[property],
        expected: resolve(token),
      }));
    const geometry = () => ["main", ".about-profile", "#navbar"].map((selector) => document.querySelector(selector).getBoundingClientRect().toJSON());
    const before = geometry();
    const original = document.startViewTransition;
    let transition;
    document.startViewTransition = (update) => {
      transition = original.call(document, update);
      return transition;
    };
    try {
      toggleThemeSetting();
      await transition.ready;
      const animations = document
        .getAnimations()
        .filter((animation) => animation.effect?.pseudoElement?.startsWith("::view-transition-"))
        .map((animation) => ({
          pseudo: animation.effect.pseudoElement,
          duration: animation.effect.getTiming().duration,
          properties: [...new Set(animation.effect.getKeyframes().flatMap((frame) => Object.keys(frame)))],
        }));
      const duringNames = [".about-profile", "#navbar"].map((selector) => getComputedStyle(document.querySelector(selector)).viewTransitionName);
      const samples = [read()];
      for (let index = 0; index < 3; index++) {
        await new Promise(requestAnimationFrame);
        samples.push(read());
      }
      await transition.finished;
      const afterNames = [".about-profile", "#navbar"].map((selector) => getComputedStyle(document.querySelector(selector)).viewTransitionName);
      return { samples, animations, duringNames, afterNames, before, after: geometry() };
    } finally {
      document.startViewTransition = original;
      probe.remove();
    }
  });
  assert.equal(result.animations.length, 1, "Theme change should use one complete-viewport crossfade");
  assert.equal(result.animations[0].pseudo, "::view-transition-new(page-content)");
  assert.equal(result.animations[0].duration, 240);
  assert.ok(result.animations[0].properties.includes("opacity"));
  assert.ok(!result.animations[0].properties.some((property) => ["clipPath", "transform", "width", "height"].includes(property)));
  assert.deepEqual(result.duringNames, ["none", "none"], "Header and profile must change with the complete theme snapshot");
  assert.deepEqual(result.afterNames, ["author-profile", "site-navigation"], "Normal navigation capture names must be restored");
  assert.deepEqual(result.after, result.before, "Theme transitions must preserve all layout geometry");
  for (const frame of result.samples) {
    for (const sample of frame) assert.equal(sample.actual, sample.expected, `Palette must switch together on ${sample.selector}`);
  }
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  try {
    for (const colorScheme of ["light", "dark"]) {
      for (const saved of [undefined, "system", "light", "dark"]) {
        const context = await browser.newContext({
          colorScheme,
          viewport: { width: 1440, height: 900 },
          storageState: saved
            ? { cookies: [], origins: [{ origin: new URL(base).origin, localStorage: [{ name: "theme", value: saved }] }] }
            : undefined,
        });
        try {
          const page = await context.newPage();
          page.on("pageerror", (error) => errors.push(error.message));
          await page.goto(`${base}/zh/projects/`, { waitUntil: "domcontentloaded" });
          await page.evaluate(() => document.fonts.ready);
          const initial = saved === "light" || saved === "dark" ? saved : colorScheme;
          await themeState(page, initial);
          if (!saved || saved === "system") {
            await page.emulateMedia({ colorScheme: colorScheme === "light" ? "dark" : "light" });
            await themeState(page, colorScheme === "light" ? "dark" : "light");
            await page.emulateMedia({ colorScheme });
            await themeState(page, initial);
          }
          const button = page.locator("#light-toggle");
          const before = await button.boundingBox();
          let expected = initial;
          for (let index = 0; index < 4; index++) {
            if (index < 2) await button.click();
            else {
              await button.focus();
              await page.keyboard.press("Space");
            }
            expected = expected === "light" ? "dark" : "light";
            await themeState(page, expected);
            assert.ok(!(await page.locator("html").getAttribute("class"))?.split(/\s+/).includes("transition"));
            assert.equal(
              await page
                .locator(".nano-arrow .arrow-tip")
                .first()
                .evaluate((element) => getComputedStyle(element).transitionProperty),
              "transform",
              "Theme changes must preserve the arrow's own transition"
            );
            assert.equal(await page.evaluate(() => localStorage.getItem("theme")), expected);
            assert.equal(await page.locator("html").getAttribute("data-theme-setting"), expected);
            assert.deepEqual(await button.boundingBox(), before, "Theme button geometry must remain stable");
          }
          if (colorScheme === "light" && !saved) {
            // Verify both directions through the first three frames. Checking
            // only the final state previously missed the pale-text flash.
            await paletteSwitch(page);
            await paletteSwitch(page);
            await themeState(page, expected);
            for (const count of [5, 5]) {
              await page.evaluate((count) => {
                for (let index = 0; index < count; index++) toggleThemeSetting();
              }, count);
              expected = expected === "light" ? "dark" : "light";
              await themeState(page, expected);
              assert.equal(await page.evaluate(() => localStorage.getItem("theme")), expected, "Rapid toggles must preserve the latest selection");
            }
          }
          await page.reload({ waitUntil: "domcontentloaded" });
          await themeState(page, expected);
          await page.goto(`${base}/projects/railway-knowledge/`, { waitUntil: "domcontentloaded" });
          await themeState(page, expected);
          assert.equal(
            await page.locator("#light-toggle").getAttribute("aria-label"),
            expected === "dark" ? "Change theme to light" : "Change theme to dark"
          );
          await page.emulateMedia({ colorScheme: expected === "dark" ? "light" : "dark" });
          // An explicit preference survives subsequent operating-system changes.
          await page.waitForTimeout(100);
          await themeState(page, expected);
          console.log(
            `Passed system ${colorScheme}, saved ${saved || "unset"}: direct toggles, icons/labels, persistence and system preference handling.`
          );
        } finally {
          await context.close();
        }
      }
    }
    for (const width of [375, 768, 1440]) {
      for (const colorScheme of ["light", "dark"]) {
        for (const locale of ["/zh", ""]) {
          const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme });
          try {
            page.on("pageerror", (error) => errors.push(error.message));
            await page.goto(`${base}${locale}/projects/multimodal-sentiment-analysis/`, { waitUntil: "domcontentloaded" });
            if (width < 576) await page.locator("[data-site-nav-toggle]").click();
            const language = page.locator("[data-language-switch]");
            const button = page.locator("#light-toggle");
            await language.waitFor({ state: "visible" });
            await button.waitFor({ state: "visible" });
            const originalPath = new URL(page.url()).pathname;
            const destination = new URL(await language.getAttribute("href"), base).href;
            assert.equal(await language.getAttribute("title"), await language.getAttribute("aria-label"));
            assert.equal(await language.locator('svg[aria-hidden="true"]').count(), 1);
            assert.equal(await page.locator(".nav-tools > .site-nav-tool").count(), 2);
            const languageBox = await language.boundingBox();
            const themeBox = await button.boundingBox();
            assert.equal(languageBox.width, themeBox.width);
            assert.equal(languageBox.height, themeBox.height);
            assert.ok(Math.abs(languageBox.y - themeBox.y) <= 0.1, "Language and theme controls must align vertically");
            assert.ok(languageBox.x + languageBox.width <= themeBox.x, "Language control must sit beside and before the theme control");
            const iconSizes = await page.locator(".site-nav-icon:visible").evaluateAll((icons) =>
              icons.map((icon) => ({
                width: icon.getBoundingClientRect().width,
                height: icon.getBoundingClientRect().height,
                stroke: getComputedStyle(icon).strokeWidth,
              }))
            );
            assert.equal(iconSizes.length, 2);
            assert.deepEqual(iconSizes[0], iconSizes[1], "Both controls must share icon size and stroke weight");
            await language.hover();
            const languageHover = await language.evaluate(async (element) => {
              await Promise.all(element.getAnimations().map((animation) => animation.finished));
              return { color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor };
            });
            await button.hover();
            const themeHover = await button.evaluate(async (element) => {
              await Promise.all(element.getAnimations().map((animation) => animation.finished));
              return { color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor };
            });
            assert.deepEqual(languageHover, themeHover, "Both controls must share hover styling");
            await page.keyboard.press("Tab");
            await language.focus();
            assert.equal(await language.evaluate((element) => getComputedStyle(element).outlineStyle), "solid");
            assert.deepEqual(await language.boundingBox(), languageBox, "Hover and focus must preserve the language control geometry");
            await button.focus();
            await page.keyboard.press("Enter");
            const selected = colorScheme === "light" ? "dark" : "light";
            await themeState(page, selected);
            await language.focus();
            await page.keyboard.press("Enter");
            await page.waitForURL(destination);
            assert.equal(await page.locator("html").getAttribute("lang"), locale === "/zh" ? "en" : "zh-CN");
            if (width < 576) await page.locator("[data-site-nav-toggle]").click();
            await themeState(page, selected);
            const returnPath = await page.locator("[data-language-switch]").getAttribute("href");
            assert.equal(new URL(returnPath, base).pathname, originalPath, "Language switching must retain the corresponding project");
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          } finally {
            await page.close();
          }
        }
      }
    }
    for (const mode of ["reduce", "unsupported"]) {
      const page = await browser.newPage({
        viewport: { width: 375, height: 900 },
        colorScheme: "light",
        reducedMotion: mode === "reduce" ? "reduce" : "no-preference",
      });
      page.on("pageerror", (error) => errors.push(error.message));
      if (mode === "unsupported") await page.addInitScript(() => (document.startViewTransition = undefined));
      await page.goto(`${base}/zh/projects/`, { waitUntil: "domcontentloaded" });
      await page.locator(".navbar-toggler").click();
      await page.evaluate(async () => {
        await document.fonts.ready;
        toggleThemeSetting();
      });
      await themeState(page, "dark");
      assert.equal(
        await page.evaluate(
          () => document.getAnimations().filter((animation) => animation.effect?.pseudoElement?.startsWith("::view-transition-")).length
        ),
        0
      );
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log(
      "Navigation controls passed 8 saved/system combinations and 12 viewport/theme/language configurations, including theme crossfades, rapid toggles, reduced motion, unsupported-browser fallback and paired navigation."
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
