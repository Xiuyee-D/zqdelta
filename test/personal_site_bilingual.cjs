// Run against bin/dev start. Blog bodies stay Chinese in both localized views.
const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const base = process.env.PERSONAL_SITE_URL || "http://127.0.0.1:4000/zqdelta";
const han = /[\u3400-\u9fff]/;
const posts = fs.readdirSync("_posts").filter((name) => name.endsWith(".en.md"));
const screenshots = process.env.BILINGUAL_SCREENSHOTS;
if (screenshots) fs.mkdirSync(screenshots, { recursive: true });

async function ready(page, url) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  assert.equal(response.status(), 200, url);
  await page.evaluate(() => document.fonts.ready);
}

async function fits(page) {
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    `Horizontal overflow: ${page.url()}`
  );
}

(async () => {
  assert.equal(posts.length, 15);
  const browser = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"], args: ["--disable-features=OverlayScrollbar"] });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on("pageerror", (error) => errors.push(error.message));
    for (const name of posts) {
      const metadata = fs.readFileSync(path.join("_posts", name), "utf8");
      const chinese = fs.readFileSync(path.join("_posts", name.replace(".en.md", ".zh.md")), "utf8");
      for (const content of [metadata, chinese]) {
        assert.ok(/^body_include: blog-content\/[a-z0-9-]+\.md$/m.test(content));
        assert.ok(/^---\r?\n[\s\S]*?\r?\n---\s*$/.test(content), "Localized sources must contain metadata only");
      }
      assert.equal(metadata.match(/^body_include: (.+)$/m)[1], chinese.match(/^body_include: (.+)$/m)[1]);
      const route = metadata.match(/^permalink: (.+)$/m)[1];
      await ready(page, `${base}${route}`);
      assert.equal(await page.locator("html").getAttribute("lang"), "en");
      assert.equal(await page.locator(".nano-prose").getAttribute("lang"), "zh-CN");
      assert.ok(!han.test(await page.locator(".detail-header").innerText()), `Untranslated article metadata: ${name}`);
      assert.equal(await page.locator(".blog-detail-meta .blog-language").innerText(), "Body: Chinese");
      assert.notEqual(
        await page
          .locator(".nano-prose p")
          .first()
          .evaluate((element) => getComputedStyle(element).textAlign),
        "justify",
        "Chinese bodies must keep Chinese alignment inside the English interface"
      );
      const labels = await page.locator(".blog-toc-inline nav a").allTextContents();
      assert.ok(labels.length && labels.every((label) => !han.test(label)), `Untranslated outline: ${name}`);
      assert.ok(
        await page
          .locator(".blog-toc-inline nav a")
          .evaluateAll((links) => links.every((link) => document.getElementById(decodeURIComponent(link.getAttribute("href").slice(1))))),
        `Broken translated outline anchors: ${name}`
      );
      const counterpart = await page.locator("[data-language-switch]").getAttribute("href");
      assert.equal(counterpart, `/zqdelta/zh${route}`);
      const englishHTML = await (await page.request.get(`${base}${route}`)).text();
      const chineseHTML = await (await page.request.get(`${base}/zh${route}`)).text();
      const bodies = await page.evaluate(
        (documents) => documents.map((html) => new DOMParser().parseFromString(html, "text/html").querySelector(".nano-prose").innerHTML),
        [englishHTML, chineseHTML]
      );
      assert.equal(bodies[0], bodies[1], `Localized views differ in their shared body: ${name}`);
      for (const text of await page.locator(".blog-series-pagination a").allTextContents()) assert.ok(!han.test(text));
      for (const href of await page.locator(".blog-series-pagination a").evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
        assert.ok(href.startsWith("/zqdelta/blog/"));
      }
      assert.equal(await page.locator(".nano-back").getAttribute("href"), `/zqdelta/blog/#post-${metadata.match(/^translation_key: (.+)$/m)[1]}`);
      await fits(page);
    }
    console.log("Passed all 15 localized blog views: metadata, English outlines, original anchors, single shared Chinese bodies, and chapter links.");

    for (const width of [375, 768, 1440]) {
      for (const colorScheme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme });
        for (const route of ["/", "/awards/", "/projects/", "/blog/", "/blog/affective-computing-03-theories/"]) {
          await ready(page, `${base}${route}`);
          await fits(page);
          assert.equal(await page.locator("html").getAttribute("data-theme"), colorScheme);
          assert.ok(!han.test(await page.locator(".about-profile").innerText()));
          assert.ok(await page.locator("[data-language-switch]").count());
          if (route === "/") {
            assert.ok((await page.locator(".about-biography").innerText()).includes("Control Science and Engineering"));
            assert.equal(await page.locator(".about-opportunity a").innerText(), "ziqden.ai@gmail.com");
            assert.equal(
              await page
                .locator(".about-biography > p")
                .first()
                .evaluate((element) => getComputedStyle(element).textAlign),
              "justify"
            );
            assert.ok((await page.locator(".home-content").innerText()).includes("Sep 2024 – present"));
          }
          if (route === "/awards/") {
            assert.equal(await page.locator(".award-entry").count(), 12);
            assert.ok(!han.test(await page.locator(".awards-list").innerText()));
            assert.notEqual(
              await page
                .locator(".award-name")
                .first()
                .evaluate((element) => getComputedStyle(element).textAlign),
              "justify",
              "Award names are structured metadata, not prose paragraphs"
            );
          }
          if (route === "/blog/") {
            assert.equal(await page.locator(".blog-card").count(), 15);
            assert.equal(await page.locator(".blog-card .blog-language").count(), 15);
            assert.ok(!han.test(await page.locator(".blog-page").innerText()));
            const dates = await page.locator(".blog-card time").allTextContents();
            assert.deepEqual(dates, [...dates].sort().reverse());
            for (const image of await page.locator(".blog-card-cover img").all()) {
              assert.equal((await page.request.get(new URL(await image.getAttribute("src"), base).href)).status(), 200);
            }
            const covers = await page
              .locator(".blog-card-cover img")
              .evaluateAll((images) => images.slice(0, 2).map((image) => image.getAttribute("src")));
            const preloads = await page
              .locator('head link[rel="preload"][as="image"]')
              .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
            assert.ok(
              covers.every((cover) => preloads.includes(cover)),
              "Preload the actual English-list covers"
            );
            assert.ok((await page.locator(".blog-card-series").allTextContents()).every((label) => label === "Multimodal Affective Computing"));
          }
          if (screenshots) {
            const label = route === "/" ? "about" : route.replaceAll("/", "-").replace(/^-|-$/g, "");
            await page.screenshot({ path: path.join(screenshots, `${label}-${width}-${colorScheme}.png`), fullPage: true, animations: "disabled" });
          }
        }
      }
    }
    console.log("Passed English About, Awards, Projects, Blog and a long course title at 375/768/1440px in both themes.");
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
    try {
      const native = await context.newPage();
      await native.goto(`${base}/blog/python-qt/`);
      assert.equal(await native.locator(".nano-prose").getAttribute("lang"), "zh-CN");
      await native.locator(".blog-toc-inline summary").click();
      assert.ok(!han.test(await native.locator(".blog-toc-inline").innerText()));
      await native.locator(".blog-toc-inline a").nth(1).click();
      assert.ok(new URL(native.url()).hash);
      await native.locator(".nano-back").click();
      assert.equal(new URL(native.url()).pathname, "/zqdelta/blog/");
    } finally {
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log("Passed no-JavaScript English outlines, anchor links and native return navigation.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
