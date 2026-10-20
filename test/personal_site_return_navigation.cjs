// Run against bin/dev start. Exercise native fragment history before returning
// to a list, including restored history, reloads and older-browser fallbacks.
const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.PERSONAL_SITE_URL || "http://127.0.0.1:4000/zqdelta";

async function settled(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForFunction(() => !document.documentElement.classList.contains("site-navigation-pending"));
  await page.waitForTimeout(220);
}

async function outlineLinks(page) {
  const desktop = page.locator(".blog-outline");
  if (await desktop.isVisible()) return desktop.locator("nav a");
  const inline = page.locator(".blog-toc-inline");
  if ((await inline.getAttribute("open")) === null) await inline.locator("summary").click();
  return inline.locator("nav a");
}

async function clickOutline(page) {
  const links = await outlineLinks(page);
  for (const index of [0, 2, 4]) {
    const link = links.nth(index);
    const hash = await link.getAttribute("href");
    await link.click();
    await page.waitForFunction((hash) => location.hash === hash, hash);
  }
}

(async () => {
  const browser = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"], args: ["--disable-features=OverlayScrollbar"] });
  const errors = [];
  let count = 0;
  try {
    for (const width of [375, 1440]) {
      for (const scenario of [
        "plain",
        "top",
        "bottom",
        "reload",
        "back-forward",
        "direct",
        "fallback",
        "fallback-plain",
        "fallback-back",
        "fallback-reload",
      ]) {
        const fallback = scenario.startsWith("fallback");
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        page.on("pageerror", (error) => errors.push(error.message));
        if (fallback) await page.addInitScript(() => Object.defineProperty(window, "navigation", { value: undefined, configurable: true }));
        let listScroll;
        const direct = scenario === "direct";
        if (direct) {
          await page.goto(`${base}/zh/blog/python-qt/`, { waitUntil: "domcontentloaded" });
        } else {
          await page.goto(`${base}/zh/blog/`, { waitUntil: "domcontentloaded" });
          await settled(page);
          const card = page.locator('.blog-card[href$="/python-qt/"]');
          await card.scrollIntoViewIfNeeded();
          listScroll = await page.evaluate(() => scrollY);
          await card.click();
          await page.waitForURL(`${base}/zh/blog/python-qt/`, { waitUntil: "domcontentloaded" });
        }
        await settled(page);
        if (!["plain", "fallback-plain"].includes(scenario)) await clickOutline(page);
        if (["reload", "fallback-reload"].includes(scenario)) {
          await page.reload({ waitUntil: "domcontentloaded" });
          await settled(page);
        }
        if (["back-forward", "fallback-back"].includes(scenario)) {
          const current = page.url();
          await page.goBack();
          await page.waitForURL((url) => url.href !== current);
          assert.notEqual(page.url(), current);
          if (scenario === "back-forward") {
            await page.goForward();
            await page.waitForURL(current);
            assert.equal(page.url(), current);
          }
        }
        const returnLink = page.locator(scenario === "bottom" ? ".blog-bottom-return" : ".nano-back");
        await returnLink.click();
        await page.waitForURL((url) => url.pathname === new URL(`${base}/zh/blog/`).pathname, { waitUntil: "domcontentloaded" });
        await settled(page);
        const canonical = direct || (fallback && scenario !== "fallback-plain");
        if (canonical) {
          assert.equal(new URL(page.url()).hash, "#post-blog-python-qt", `${scenario}: fallback must target the article's list card`);
          const bounds = await page.locator("#post-blog-python-qt").boundingBox();
          assert.ok(bounds.y >= 0 && bounds.y < 900, `${scenario}: list card is not visible`);
        } else {
          assert.equal(new URL(page.url()).hash, "", `${scenario}: should restore the original list entry`);
          await page.waitForFunction((before) => Math.abs(scrollY - before) < 2, listScroll);
          assert.ok(Math.abs((await page.evaluate(() => scrollY)) - listScroll) < 2, `${scenario}: original list scroll was lost`);
        }
        await page.close();
        count++;
      }
      console.log(`Passed ${width}px: top/bottom return after multiple anchors, reload, back/forward, direct entry and Navigation API fallback.`);
    }

    const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
    await page.goto(`${base}/zh/blog/python-qt/`, { waitUntil: "load" });
    await clickOutline(page);
    await page.locator(".blog-bottom-return").click();
    await page.waitForURL(`${base}/zh/blog/#post-blog-python-qt`, { waitUntil: "domcontentloaded" });
    await page.close();
    assert.deepEqual(errors, []);
    console.log(`Return navigation passed ${count} scenarios and native no-JS return after outline navigation.`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
