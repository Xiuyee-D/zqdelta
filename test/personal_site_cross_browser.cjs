// Firefox/WebKit functional coverage; Chromium keeps its detailed snapshot tests.
const playwright = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const engine = process.argv[2];
assert.ok(["firefox", "webkit"].includes(engine), "Choose firefox or webkit");
const base = (process.env.PERSONAL_SITE_URL || "http://127.0.0.1:4000/zqdelta").replace(/\/$/, "");
const output = path.join(process.cwd(), ".dev-tools/test-results/compatibility", engine);
fs.mkdirSync(output, { recursive: true });
const report = { engine, pages: 0, configurations: 0, errors: [], screenshots: [], checks: [] };
const origin = new URL(base).origin;

async function settled(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForFunction(() => !document.documentElement.classList.contains("site-navigation-pending"));
}
async function visit(page, url) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  assert.equal(response.status(), 200, url);
  await settled(page);
}
function observe(page) {
  page.on("pageerror", (error) => report.errors.push({ url: page.url(), error: error.message }));
}
async function layout(page) {
  const result = await page.evaluate(async () => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    };
    const images = [...document.querySelectorAll("main img, .about-avatar")].filter((image) => {
      const r = image.getBoundingClientRect();
      return r.width && r.height && r.bottom > 0 && r.top < innerHeight;
    });
    const loaded = await Promise.all(
      images.map((image) =>
        image.decode().then(
          () => true,
          () => false
        )
      )
    );
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      profile: rect(".about-profile"),
      main: rect("main"),
      header: rect("#navbar"),
      text: document.querySelector("main").textContent.trim().length,
      loaded,
      failedFonts: [...document.fonts].filter((font) => font.status === "error").length,
      loadedAcademicFonts: [...document.fonts].filter((font) => font.family.replaceAll('"', "") === "Academic Sans" && font.status === "loaded")
        .length,
      columns: [...document.querySelectorAll(".project-detail, .blog-detail, .project-card")].map((element) => element.getBoundingClientRect().width),
      footer: !!document.querySelector("footer"),
    };
  });
  assert.ok(!result.overflow, `Horizontal page overflow: ${page.url()}`);
  assert.ok(result.text > 20, `Empty main: ${page.url()}`);
  assert.ok(result.loaded.every(Boolean), `Visible image failed: ${page.url()}`);
  assert.equal(result.failedFonts, 0, `Font subset failed to load: ${page.url()}`);
  assert.ok(result.loadedAcademicFonts > 0, `Academic Sans is missing: ${page.url()}`);
  assert.ok(
    result.columns.every((width) => width <= 761),
    `Reading column too wide: ${page.url()}`
  );
  assert.ok(!result.footer);
  return result;
}
async function nav(page, open = true) {
  const toggle = page.locator("[data-site-nav-toggle]");
  if ((await toggle.isVisible()) && ((await toggle.getAttribute("aria-expanded")) === "true") !== open) await toggle.click();
}
async function state(page, theme) {
  await page.waitForFunction(
    (value) => document.documentElement.dataset.theme === value && !document.documentElement.classList.contains("site-theme-transition"),
    theme
  );
  const target = theme === "light" ? "dark" : "light";
  assert.notEqual(await page.locator(`#light-toggle [data-theme-icon="${target}"]`).evaluate((element) => getComputedStyle(element).display), "none");
  assert.equal(await page.locator(`#light-toggle [data-theme-icon="${theme}"]`).evaluate((element) => getComputedStyle(element).display), "none");
}
async function screenshot(page, name) {
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(output, file), animations: "disabled" });
  report.screenshots.push(file);
}
async function reading(page) {
  await visit(page, `${base}/zh/blog/transformer/`);
  await page.waitForFunction(() => !!window.MathJax?.startup?.promise);
  await page.evaluate(() => MathJax.startup.promise);
  assert.equal(await page.locator("mjx-merror, [data-mml-node='merror']").count(), 0);
  assert.ok((await page.locator("mjx-container").count()) > 50);
  await layout(page);
  const outline = page.locator(".blog-outline");
  const desktop = await outline.isVisible();
  const initial = desktop ? await page.locator(".blog-outline-sticky").boundingBox() : null;
  await page.evaluate(() => window.scrollTo({ top: 8, behavior: "instant" }));
  await page.evaluate(() => new Promise(requestAnimationFrame));
  if (desktop) {
    const after = await page.locator(".blog-outline-sticky").boundingBox();
    assert.ok(Math.abs(after.y - initial.y) < 1, "Outline shifts on first scroll");
  }
  const inline = page.locator(".blog-toc-inline");
  if (!desktop) await inline.locator("summary").click();
  const links = page.locator(desktop ? ".blog-outline nav a" : ".blog-toc-inline nav a");
  for (const index of [0, 2]) {
    const link = links.nth(index);
    const hash = await link.getAttribute("href");
    await link.click();
    await page.waitForFunction((value) => location.hash === value, hash);
  }
  await page.locator(".nano-back").click();
  await page.waitForURL((url) => url.pathname === new URL(`${base}/zh/blog/`).pathname);
  await settled(page);
  await visit(page, `${base}/zh/blog/python-qt/`);
  const button = page.locator("button.copy").first();
  assert.equal(await button.locator("svg").count(), 1);
  await button.click();
  await page.waitForFunction(() => document.querySelector("button.copy")?.getAttribute("aria-label") === "已复制");
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "instant" }));
  const top = page.locator("#back-to-top");
  await page.waitForFunction(() => document.getElementById("back-to-top")?.getAttribute("aria-hidden") === "false");
  const box = await top.boundingBox(),
    icon = await top.locator("svg").boundingBox();
  assert.ok(Math.abs(box.x + box.width / 2 - icon.x - icon.width / 2) < 1);
  assert.ok(Math.abs(box.y + box.height / 2 - icon.y - icon.height / 2) < 1);
  await top.click();
  await page.waitForFunction(() => scrollY < 1);
}
async function controls(page, theme) {
  await visit(page, `${base}/zh/projects/`);
  const before = await layout(page);
  await nav(page);
  assert.equal(await page.locator(".nav-tools .site-nav-tool").count(), 2);
  const tools = await page.locator(".nav-tools .site-nav-tool").evaluateAll((elements) =>
    elements.map((e) => {
      const r = e.getBoundingClientRect();
      return { y: r.y, width: r.width, height: r.height };
    })
  );
  assert.ok(Math.abs(tools[0].y - tools[1].y) < 1);
  assert.ok(tools.every((r) => Math.abs(r.width - 32) < 1 && Math.abs(r.height - 32) < 1));
  const background = await page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.locator("#light-toggle").click();
  await state(page, theme === "dark" ? "light" : "dark");
  assert.notEqual(await page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor), background);
  await page.locator("#light-toggle").click();
  await state(page, theme);
  await nav(page, false);
  const after = await layout(page);
  for (const key of ["profile", "main"])
    for (const axis of ["x", "y", "width"]) assert.ok(Math.abs(after[key][axis] - before[key][axis]) < 1, `Theme moved ${key} ${axis}`);
  const card = page.locator(".project-card").first();
  const destination = await card.getAttribute("href");
  await card.focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(new URL(destination, base).href);
  await settled(page);
  assert.equal(await page.locator(".project-meta").count(), 1);
  assert.equal(await page.locator(".project-section-nav").count(), 0);
  await nav(page);
  const translated = await page.locator("[data-language-switch]").getAttribute("href");
  await page.locator("[data-language-switch]").click();
  await page.waitForURL(new URL(translated, base).href);
  await settled(page);
  await state(page, theme);
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  await page.locator(".nano-back").click();
  await page.waitForURL((url) => url.pathname === new URL(`${base}/projects/`).pathname);
  await settled(page);
}
async function viewer(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
  const page = await context.newPage();
  observe(page);
  let models = 0;
  page.on("request", (request) => {
    if (request.url().endsWith(".vtm")) models++;
  });
  await visit(page, `${base}/zh/projects/portable-ai-voice-terminal/`);
  const figure = page.locator(".voice-terminal");
  await figure.scrollIntoViewIfNeeded();
  assert.equal(models, 0);
  const before = await figure.boundingBox();
  const webgl2 = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  });
  report.capabilities.webgl2 = webgl2;
  await figure.locator("[data-vt-activate]").click();
  await page.waitForFunction(() => {
    const f = document.querySelector(".voice-terminal");
    return f.classList.contains("is-ready") || f.querySelector("button").textContent === f.dataset.retry;
  });
  if (await figure.evaluate((f) => f.classList.contains("is-ready"))) {
    const frame = await (await figure.locator("iframe").elementHandle()).contentFrame();
    const initial = await frame.evaluate(() => window.voiceTerminal.snapshot());
    assert.equal(initial.partCount, 7);
    assert.equal(models, 1);
    await frame.getByRole("button", { name: "展开", exact: true }).click();
    await frame.waitForFunction(() => window.voiceTerminal.snapshot().progress === 1);
    const expanded = await frame.evaluate(() => window.voiceTerminal.snapshot());
    assert.deepEqual(expanded.parts.find((x) => x.id === "rear").offset, expanded.parts.find((x) => x.id === "clip").offset);
    await frame.getByRole("button", { name: "复位", exact: true }).click();
    assert.equal(await frame.evaluate(() => window.voiceTerminal.snapshot().progress), 0);
    await nav(page);
    await page.locator("#light-toggle").click();
    await state(page, "light");
    await frame.waitForFunction(() => document.documentElement.dataset.theme === "light");
    report.cad = "interactive model: load, explode, reset, theme sync";
  } else {
    assert.equal(webgl2, false, "The model failed even though WebGL2 is available");
    assert.ok(await figure.locator("img:visible").isVisible());
    assert.equal(await figure.locator("iframe").count(), 0);
    report.cad = "static poster and retry verified; interactive WebGL unavailable in this environment";
  }
  const after = await figure.boundingBox();
  for (const key of ["x", "width", "height"]) assert.ok(Math.abs(after[key] - before[key]) < 1);
  await context.close();
}
(async () => {
  const browserEnv = { ...process.env };
  const proxyAddress = browserEnv.https_proxy || browserEnv.HTTPS_PROXY || browserEnv.http_proxy || browserEnv.HTTP_PROXY;
  for (const key of ["http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY", "all_proxy", "ALL_PROXY"]) delete browserEnv[key];
  let proxy;
  if (proxyAddress) {
    const url = new URL(proxyAddress);
    proxy = { server: `${url.protocol}//${url.host}`, bypass: "127.0.0.1,localhost" };
    if (url.username) {
      proxy.username = decodeURIComponent(url.username);
      proxy.password = decodeURIComponent(url.password);
    }
  }
  const browser = await playwright[engine].launch({ headless: process.env.PERSONAL_SITE_HEADED !== "1", env: browserEnv, proxy });
  report.version = browser.version();
  try {
    const audit = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
    const page = await audit.newPage();
    observe(page);
    const urls = new Set();
    for (const prefix of ["", "/zh"])
      for (const section of ["/", "/projects/", "/blog/", "/awards/"]) {
        const url = `${base}${prefix}${section}`;
        urls.add(url);
        await visit(page, url);
        for (const link of await page.locator(".project-card, .blog-card").evaluateAll((nodes) => nodes.map((n) => n.href))) urls.add(link);
      }
    assert.equal(urls.size, 52);
    for (const url of urls) {
      await visit(page, url);
      await layout(page);
      report.pages++;
    }
    report.capabilities = await page.evaluate(() => ({
      themeViewTransitions: typeof document.startViewTransition === "function",
      navigationAPI: !!window.navigation,
      scrollbarGutter: CSS.supports("scrollbar-gutter: stable"),
    }));
    const missing = await page.goto(`${base}/missing-compatibility-check/`, { waitUntil: "domcontentloaded" });
    assert.equal(missing.status(), 404);
    await settled(page);
    assert.equal(await page.locator('main a[href="/zqdelta/"]').count(), 1);
    assert.equal(await page.locator('main a[href="/zqdelta/zh/"]').count(), 1);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, follow");
    await layout(page);
    await audit.close();
    console.log(`${engine}: all ${report.pages} localized pages rendered without page overflow or broken visible images.`);
    for (const width of [375, 768, 1440])
      for (const theme of ["light", "dark"]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          colorScheme: theme,
          ...(engine === "webkit" && width === 375 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
        });
        const page = await context.newPage();
        observe(page);
        const references = new Map();
        for (const prefix of ["/zh", ""])
          for (const section of ["/", "/projects/", "/blog/", "/awards/"]) {
            await visit(page, `${base}${prefix}${section}`);
            const sample = await layout(page);
            if (!references.has(prefix)) references.set(prefix, sample.profile);
            const reference = references.get(prefix);
            for (const axis of ["x", "y", "width", "height"])
              assert.ok(Math.abs(sample.profile[axis] - reference[axis]) < 1, `${engine} sidebar moved ${axis}: ${width} ${theme} ${section}`);
            if ((prefix === "/zh" && section === "/projects/") || (prefix === "" && section === "/blog/"))
              await screenshot(page, `${width}-${theme}-${prefix ? "projects-zh" : "blog-en"}`);
          }
        await controls(page, theme);
        await reading(page);
        await context.close();
        report.configurations++;
        console.log(
          `${engine}: ${width}px ${theme}: sections, sidebar, theme, language, project entry/return, outline/return, formulas, copy and back-to-top passed.`
        );
      }
    await viewer(browser);
    const unavailable = await browser.newContext();
    await unavailable.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type === "webgl2" ? null : original.call(this, type, ...args);
      };
    });
    const unavailablePage = await unavailable.newPage();
    observe(unavailablePage);
    await visit(unavailablePage, `${base}/zh/projects/portable-ai-voice-terminal/`);
    await unavailablePage.locator("[data-vt-activate]").click();
    await unavailablePage.waitForFunction(() => {
      const f = document.querySelector(".voice-terminal");
      return f.querySelector("button").textContent === f.dataset.retry;
    });
    assert.equal(await unavailablePage.locator(".voice-terminal iframe").count(), 0);
    assert.ok(await unavailablePage.locator(".voice-terminal img:visible").isVisible());
    await unavailable.close();
    report.checks.push("forced WebGL unavailability: static poster and retry");
    const reduced = await browser.newContext({ reducedMotion: "reduce", colorScheme: "light" });
    const reducedPage = await reduced.newPage();
    observe(reducedPage);
    await visit(reducedPage, `${base}/zh/projects/`);
    await reducedPage.locator("#light-toggle").click();
    await state(reducedPage, "dark");
    assert.ok(!(await reducedPage.locator("html").getAttribute("class"))?.includes("site-theme-transition"));
    await reduced.close();
    const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
    const staticPage = await noJS.newPage();
    await staticPage.goto(`${base}/blog/python-qt/`, { waitUntil: "domcontentloaded" });
    await staticPage.locator(".blog-toc-inline summary").click();
    assert.ok(await staticPage.locator(".blog-toc-inline nav a").first().isVisible());
    await staticPage.locator(".nano-back").click();
    await staticPage.waitForURL((url) => url.pathname === new URL(`${base}/blog/`).pathname);
    await staticPage.goto(`${base}/zh/projects/portable-ai-voice-terminal/`, { waitUntil: "domcontentloaded" });
    assert.equal(await staticPage.locator(".voice-terminal button:visible").count(), 0);
    assert.ok(await staticPage.locator(".voice-terminal img:visible").isVisible());
    await noJS.close();
    assert.deepEqual(report.errors, []);
    report.checks.push(
      "52 localized pages",
      "bilingual 404 fallback",
      "six viewport/theme configurations",
      "native navigation and language links",
      "theme and reduced motion",
      "reading and math",
      "clipboard write feedback",
      "CAD",
      "no-JavaScript fallbacks"
    );
    report.passed = true;
    console.log(`${engine} ${report.version}: compatibility passed; ${report.cad}.`);
  } finally {
    fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
})().catch((error) => {
  report.passed = false;
  report.failure = error.stack;
  fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.error(error);
  process.exitCode = 1;
});
