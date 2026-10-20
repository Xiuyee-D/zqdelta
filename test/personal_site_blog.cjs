// Run against bin/dev start. Covers imported articles, covers, reading and outlines.
const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.PERSONAL_SITE_URL || "http://127.0.0.1:4000/zqdelta";
const output = path.join(process.cwd(), ".dev-tools/test-results/blog");

async function ready(page, url, math = false) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  if (math) {
    await page.waitForFunction(() => !!window.MathJax?.startup?.promise, undefined, { timeout: 15000 });
    await page.evaluate(() => MathJax.startup.promise);
  }
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function readingGeometry(page, width) {
  const sizes = await page.evaluate(() => {
    const rect = (selector) => {
      const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
      return { x, y, width, height };
    };
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      article: rect(".blog-detail .nano-prose"),
      detail: rect(".blog-detail"),
      main: rect("main"),
      profile: rect(".about-profile"),
    };
  });
  assert.ok(!sizes.overflow, `Article overflows at ${width}px: ${page.url()}`);
  assert.ok(Math.abs(sizes.detail.x - sizes.article.x) < 1);
  assert.ok(Math.abs(sizes.detail.width - sizes.article.width) < 1);
  assert.ok(Math.abs(sizes.main.x - sizes.article.x) < 1);
  assert.ok(sizes.article.width <= 760);
  const desktopOutline = sizes.main.width >= 964;
  assert.equal(await page.locator(".blog-outline").isVisible(), desktopOutline, "Outline must depend on the available reading-column space");
  if (desktopOutline) {
    assert.ok(Math.abs(sizes.article.width - 760) < 1);
    assert.ok(await page.locator(".blog-outline").isVisible());
    assert.ok(!(await page.locator(".blog-toc-inline").isVisible()));
    const initialOutline = await page.locator(".blog-outline-sticky").boundingBox();
    for (const distance of [1, 4, 8, 100]) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), distance);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
      const outline = await page.locator(".blog-outline-sticky").boundingBox();
      for (const axis of ["x", "y", "width", "height"]) {
        assert.ok(Math.abs(outline[axis] - initialOutline[axis]) <= 0.1, `Outline ${axis} moves on first scroll at ${width}px: ${page.url()}`);
      }
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  } else {
    assert.ok(!(await page.locator(".blog-outline").isVisible()));
    assert.ok(await page.locator(".blog-toc-inline").isVisible());
  }
  return sizes;
}

async function backToTopFeedback(page, activation = "click") {
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: "instant" }));
  await page.waitForFunction(() => {
    const button = document.getElementById("back-to-top");
    return button && !button.classList.contains("hidden") && Number(getComputedStyle(button).opacity) === 1;
  });
  const button = page.locator("#back-to-top");
  assert.equal(await button.getAttribute("role"), "button");
  assert.equal(await button.getAttribute("aria-label"), "返回顶部");
  assert.equal(await button.getAttribute("tabindex"), "0");
  assert.equal(await button.getAttribute("aria-hidden"), "false");
  if (await page.locator(".blog-outline").isVisible()) {
    const outline = await page.locator(".blog-outline .blog-toc-nav").boundingBox();
    const box = await button.boundingBox();
    assert.ok(outline.y + outline.height <= box.y, "Outline must leave space above the back-to-top control, including short viewports");
  }
  const checkIcon = async () => {
    const box = await button.boundingBox();
    const icon = await button.locator("svg").boundingBox();
    for (const [axis, size] of [
      ["x", "width"],
      ["y", "height"],
    ]) {
      assert.ok(Math.abs(icon[axis] + icon[size] / 2 - (box[axis] + box[size] / 2)) <= 0.1, `Back-to-top icon is off-center on ${axis}`);
    }
  };
  await page.mouse.move(0, 0);
  await page.waitForFunction(() => getComputedStyle(document.getElementById("back-to-top")).transform === "none");
  await checkIcon();
  const originalBackground = await button.evaluate((element) => getComputedStyle(element).backgroundColor);
  await button.hover();
  await page.waitForFunction(
    (background) => getComputedStyle(document.getElementById("back-to-top")).backgroundColor !== background,
    originalBackground
  );
  const shouldLift = await page.evaluate(() => matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches);
  await page.waitForFunction(
    (lift) => getComputedStyle(document.getElementById("back-to-top")).transform === (lift ? "matrix(1, 0, 0, 1, 0, -2)" : "none"),
    shouldLift
  );
  await checkIcon();
  if (activation === "click") await button.click();
  else {
    await button.focus();
    await page.keyboard.press(activation);
  }
  await page.waitForFunction(() => scrollY < 1 && document.getElementById("back-to-top").classList.contains("hidden"));
  assert.equal(await button.getAttribute("tabindex"), "-1");
  assert.equal(await button.getAttribute("aria-hidden"), "true");
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"], args: ["--disable-features=OverlayScrollbar"] });
  const errors = [];
  const resources = new Set();
  try {
    const audit = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    try {
      const page = await audit.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      await ready(page, `${base}/zh/blog/`);
      const entries = await page
        .locator(".blog-card")
        .evaluateAll((cards) =>
          cards.map((card) => ({ url: card.href, title: card.querySelector("h2").textContent, date: card.querySelector("time").dateTime }))
        );
      assert.equal(entries.length, 15);
      assert.equal(await page.locator(".blog-card-cover").count(), 10);
      assert.equal(await page.locator(".blog-card-series").count(), 7);
      assert.equal(await page.locator(".blog-card-cover.is-cropped").count(), 1);
      assert.equal(await page.locator(".blog-year").count(), 0);
      assert.deepEqual(
        entries.map((entry) => Date.parse(entry.date)),
        entries.map((entry) => Date.parse(entry.date)).sort((a, b) => b - a)
      );
      assert.ok(entries[0].url.endsWith("/bmad/"));
      assert.ok(entries.at(-1).url.endsWith("/ble/"));
      for (const src of await page.locator(".blog-card-cover img").evaluateAll((images) => images.map((image) => image.src))) resources.add(src);
      let articleImages = 0;
      let courseCount = 0;
      for (const entry of entries) {
        await ready(page, entry.url);
        assert.equal(await page.locator("main h1").count(), 1);
        assert.equal((await page.locator("h1").textContent()).trim(), entry.title.trim());
        assert.equal(await page.locator(".blog-detail-meta time").getAttribute("datetime"), entry.date);
        assert.equal(await page.locator(".blog-detail-meta time").count(), 1, "Only the creation date is displayed");
        assert.equal(await page.locator(".about-profile").count(), 1);
        assert.equal(await page.locator(".detail-cover, iframe, #search-toggle, ninja-keys").count(), 0);
        const content = await page.locator(".nano-prose").textContent();
        assert.ok(!/\[!tip\]|\{:\s*\.blog-callout\}/.test(content));
        assert.equal(
          await page
            .locator(".nano-prose a[href$='.md']")
            .evaluateAll((links) => links.filter((link) => new URL(link.href).origin === location.origin).length),
          0,
          "Missing local Markdown references must be removed"
        );
        const outline = await page
          .locator(".blog-outline a")
          .evaluateAll((links) => links.map((link) => ({ id: decodeURIComponent(link.hash.slice(1)), text: link.textContent })));
        assert.ok(outline.length > 0);
        const ids = await page.locator("[id]").evaluateAll((nodes) => nodes.map((node) => node.id));
        assert.equal(new Set(ids).size, ids.length, `Duplicate IDs: ${entry.url}`);
        for (const link of outline) assert.ok(ids.includes(link.id), `Missing outline destination ${link.id}`);
        if (entry.url.includes("/python-qt/")) {
          const omitted = await page.locator(".nano-prose .no_toc_section h3").evaluateAll((headings) => headings.map((heading) => heading.id));
          assert.ok(omitted.length > 0, "Widget APIs retain semantic headings without crowding the outline");
          assert.ok(omitted.every((id) => !outline.some((link) => link.id === id)));
          const sectionId = await page.locator(".nano-prose h2").filter({ hasText: "常用控件" }).getAttribute("id");
          await page
            .locator(".nano-prose .no_toc_section h3")
            .first()
            .evaluate((heading) => {
              window.scrollTo(0, heading.getBoundingClientRect().top + scrollY - 96);
            });
          await page.waitForFunction(
            (id) => decodeURIComponent(document.querySelector('.blog-outline a[aria-current="location"]')?.hash.slice(1) || "") === id,
            sectionId
          );
        }
        const images = await page
          .locator(".nano-prose .blog-image")
          .evaluateAll((nodes) =>
            nodes.map((image) => ({ src: image.src, width: image.getAttribute("width"), height: image.getAttribute("height") }))
          );
        articleImages += images.length;
        for (const image of images) {
          assert.ok(image.src.startsWith(`${base}/assets/img/blog/`));
          assert.ok(Number(image.width) > 0 && Number(image.height) > 0);
          resources.add(image.src);
        }
        if (entry.url.includes("affective-computing-")) {
          courseCount++;
          const links = await page.locator(".blog-series-pagination a").evaluateAll((nodes) => nodes.map((node) => node.href));
          assert.ok(links.length > 0 && links.every((url) => url.startsWith(`${base}/zh/blog/affective-computing-`)));
        }
        const back = await page.locator(".nano-back").getAttribute("href");
        assert.ok(back.startsWith("/zqdelta/zh/blog/#post-"));
      }
      assert.equal(courseCount, 7);
      assert.equal(articleImages, 71);
      for (const url of resources) {
        const response = await audit.request.get(url);
        assert.equal(response.status(), 200, `Missing local image ${url}`);
        assert.ok(response.headers()["content-type"].startsWith("image/"));
      }
      // Copy controls must remain visible and functional after icon fonts are removed.
      await audit.grantPermissions(["clipboard-read", "clipboard-write"]);
      await ready(page, `${base}/zh/blog/python-qt/`);
      const copyButton = page.locator("button.copy").first();
      assert.equal(await copyButton.getAttribute("aria-label"), "复制代码");
      assert.equal(await copyButton.locator("svg").count(), 1);
      assert.equal(await page.locator(".fa-solid, .fa-regular").count(), 0);
      const expectedCode = await page.locator(".code-display-wrapper").first().locator("code").innerText();
      await page.evaluate(() => navigator.clipboard.writeText(""));
      await copyButton.click();
      await page.waitForFunction(() => document.querySelector("button.copy")?.getAttribute("aria-label") === "已复制");
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expectedCode.trim());
      console.log(`Imported content passed: ${entries.length} articles, ${courseCount} chapters, ${resources.size} local images and covers.`);
    } finally {
      await audit.close();
    }

    for (const width of [375, 768, 1279, 1280, 1440]) {
      for (const colorScheme of ["light", "dark"]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme });
        try {
          const page = await context.newPage();
          page.on("pageerror", (error) => errors.push(error.message));
          await ready(page, `${base}/zh/blog/`);
          const card = page.locator(".blog-card").first();
          const before = await card.boundingBox();
          await card.hover();
          await card.focus();
          assert.deepEqual(await card.boundingBox(), before, "Hover/focus must preserve card geometry");
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          const profile = await page.locator(".about-profile").boundingBox();
          if ([375, 1440].includes(width)) await page.screenshot({ path: path.join(output, `list-${width}-${colorScheme}.png`), fullPage: true });

          for (const slug of ["rag", "python-qt", "transformer", "regular-expressions", "affective-computing-04-messages"]) {
            await ready(page, `${base}/zh/blog/${slug}/`, ["transformer", "affective-computing-04-messages"].includes(slug));
            const sizes = await readingGeometry(page, width);
            for (const key of ["x", "y", "width", "height"]) assert.ok(Math.abs(sizes.profile[key] - profile[key]) < 1, `Sidebar ${key} moved`);
            assert.equal(await page.locator("mjx-merror, [data-mml-node='merror']").count(), 0, "Invalid rendered formula");
            if (slug === "transformer") assert.ok((await page.locator("mjx-container").count()) > 50);
            if (slug === "affective-computing-04-messages") {
              assert.equal(await page.locator(".nano-prose table").count(), 0, "Conditional probability must not become a Markdown table");
              for (const label of ["二元模型", "三元模型"]) {
                const example = page.locator(".nano-prose li").filter({ hasText: label });
                assert.equal(await example.locator("mjx-container").count(), 1, `${label} must contain a rendered probability formula`);
                assert.ok(!(await example.innerText()).includes("$$"), `${label} contains raw formula delimiters`);
              }
            }
            const desktopOutline = await page.locator(".blog-outline").isVisible();
            const container = desktopOutline ? page.locator(".blog-outline") : page.locator(".blog-toc-inline");
            if (!desktopOutline) {
              await container.locator("summary").focus();
              await page.keyboard.press("Enter");
              assert.ok((await container.getAttribute("open")) !== null);
            }
            const links = container.locator("nav a");
            const target = links.nth(Math.floor((await links.count()) / 2));
            const hash = await target.getAttribute("href");
            await target.focus();
            await page.keyboard.press("Enter");
            await page.waitForFunction((hash) => location.hash === hash, hash);
            await page.waitForFunction((id) => document.querySelector('.blog-outline a[aria-current="location"]')?.hash === id, hash);
            const heading = await page.evaluate(
              (hash) => document.getElementById(decodeURIComponent(hash.slice(1))).getBoundingClientRect().top,
              hash
            );
            assert.ok(heading >= (await page.locator("#navbar").boundingBox()).height - 1, "Anchor is hidden behind navigation");
            if ([375, 1440].includes(width) && slug === "transformer") {
              await page.evaluate(() => scrollTo(0, 0));
              await page.screenshot({ path: path.join(output, `detail-${width}-${colorScheme}.png`) });
            }
            if (width >= 925) {
              await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
              const bottom = await page.locator(".about-profile").boundingBox();
              assert.ok(Math.abs(bottom.y - profile.y) < 1, "Sidebar moves near article end");
            }
          }
          await backToTopFeedback(page);
          console.log(
            `Reading passed ${width}px ${colorScheme}: content, stable first-scroll outline, centered back-to-top icon, hover feedback and return.`
          );
        } finally {
          await context.close();
        }
      }
    }

    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await ready(page, `${base}/zh/blog/`);
    const target = page.locator('.blog-card[href$="/python-qt/"]');
    await target.scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await target.click();
    await page.waitForURL(`${base}/zh/blog/python-qt/`);
    await page.locator(".nano-back").click();
    await page.waitForURL(`${base}/zh/blog/`);
    await page.waitForFunction((before) => Math.abs(scrollY - before) < 2, scroll);
    await page.close();

    const reducedMotion = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 600 } });
    try {
      const page = await reducedMotion.newPage();
      await ready(page, `${base}/zh/blog/python-qt/`);
      await readingGeometry(page, 1440);
      for (const key of ["Enter", "Space"]) await backToTopFeedback(page, key);
      await page.locator("#light-toggle").click();
      assert.ok(!(await page.locator("html").getAttribute("class"))?.includes("transition"));
      assert.ok(
        await page.locator(".nano-back").evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration) <= 0.01),
        "Reduced-motion preference must also apply during theme changes"
      );
    } finally {
      await reducedMotion.close();
    }

    const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
    try {
      const page = await noScript.newPage();
      await page.goto(`${base}/zh/blog/python-qt/`, { waitUntil: "load" });
      await page.locator(".blog-toc-inline summary").click();
      assert.ok(await page.locator(".blog-toc-inline a").first().isVisible());
      await page.locator(".nano-back").click();
      await page.waitForURL(/\/zh\/blog\/#post-blog-python-qt$/);
    } finally {
      await noScript.close();
    }
    // A slow off-screen image must reserve its height before the response arrives.
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      let releaseImage;
      const heldImage = new Promise((resolve) => (releaseImage = resolve));
      await context.route(/\/fixed-button-alignment\.png(?:\?|$)/, async (route) => {
        await heldImage;
        await route.continue();
      });
      try {
        const page = await context.newPage();
        await ready(page, `${base}/zh/blog/python-qt/`);
        const image = page.locator('img[src*="fixed-button-alignment.png"]');
        await image.evaluate((element) => {
          element.loading = "eager";
          element.scrollIntoView({ block: "center", behavior: "instant" });
        });
        const geometry = () =>
          image.evaluate((element) => {
            const next = document.evaluate("following::p[1]", element, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            return { height: element.getBoundingClientRect().height, nextTop: next.getBoundingClientRect().top + scrollY };
          });
        const before = await geometry();
        assert.ok(before.height > 0, "A pending image must keep its intrinsic height");
        releaseImage();
        await image.evaluate((element) => element.decode());
        const after = await geometry();
        assert.ok(Math.abs(before.height - after.height) <= 0.25, "Image height changes after loading");
        assert.ok(Math.abs(before.nextTop - after.nextTop) <= 0.25, "Image loading moves the following paragraph");
        console.log(`Pending blog image geometry passed at ${width}px.`);
      } finally {
        releaseImage();
        await context.close();
      }
    }
    assert.deepEqual(errors, []);
    console.log(
      "Blog checks passed: all imports, 10 viewport/theme configurations, available-space outlines, keyboard anchors, return restoration and no-JS navigation."
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
