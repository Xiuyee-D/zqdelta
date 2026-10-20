// Run against bin/dev start; optionally set PERSONAL_SITE_URL.
const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");

async function responsiveFrame(browser, base) {
  const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
  const samples = [];
  try {
    await page.goto(`${base}/zh/blog/python-qt/`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    for (const width of [375, 575, 576, 767, 768, 924, 925, 1024, 1100, 1268, 1269, 1279, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      const sample = await page.evaluate(() => {
        const rect = (selector) => {
          const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
          return { x, y, width, height };
        };
        return {
          nav: rect("#navbar"),
          profile: rect(".about-profile"),
          avatar: rect(".about-avatar"),
          main: rect("main"),
          article: rect(".blog-detail"),
          outline: getComputedStyle(document.querySelector(".blog-outline")).display !== "none",
          padding: parseFloat(getComputedStyle(document.body).paddingTop),
          toggleHeight: document.querySelector(".navbar-toggler").getBoundingClientRect().height,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
      });
      assert.ok(Math.abs(sample.nav.height - sample.padding) <= 0.1, `Header and reserved space must match at ${width}px`);
      assert.equal(sample.padding, width < 576 ? 52 : 60);
      if (width < 576) assert.ok(sample.toggleHeight >= 44, "Mobile menu must have a usable touch target");
      assert.equal(sample.outline, sample.main.width >= 964, `Outline must use available space at ${width}px`);
      assert.ok(Math.abs(sample.article.width - Math.min(sample.main.width, 760)) <= 0.1);
      assert.ok(!sample.overflow, `Responsive frame overflows at ${width}px`);
      samples.push({ width, ...sample });
    }
    const before = samples.find((sample) => sample.width === 1279);
    const after = samples.find((sample) => sample.width === 1280);
    for (const role of ["main", "profile", "avatar"]) {
      for (const axis of ["x", "width", "height"]) {
        assert.ok(Math.abs(after[role][axis] - before[role][axis]) <= 1, `Responsive ${role} ${axis} jumps at 1280px`);
      }
    }
    console.log(`Responsive frame passed ${samples.length} widths: header space, touch target, fluid geometry and available-space outlines.`);
  } finally {
    await page.close();
  }
}

(async () => {
  // Headless Chromium hides scrollbars by default, masking layout shifts
  // between a long projects page and short pages such as blog or awards.
  const browser = await chromium.launch({
    ignoreDefaultArgs: ["--hide-scrollbars"],
    args: ["--disable-features=OverlayScrollbar"],
  });
  try {
    const page = await browser.newPage();
    const samples = [];
    const errors = [];
    const base = process.env.PERSONAL_SITE_URL || "http://127.0.0.1:4000/zqdelta";
    page.on("pageerror", (error) => errors.push(error.message));
    await page.exposeFunction("reportPagePositions", (sample) => samples.push(sample));
    await page.addInitScript(() => {
      addEventListener("pagereveal", (event) => {
        const frames = [];
        const transition = { requested: !!event.viewTransition };
        if (event.viewTransition) {
          event.viewTransition.ready
            .then(() => {
              transition.viewportHeight = innerHeight;
              transition.snapshotHeight = parseFloat(getComputedStyle(document.documentElement, "::view-transition-group(page-content)").height);
              transition.layers = ["page-content", "author-profile", "site-navigation"].map((name) =>
                Number(getComputedStyle(document.documentElement, `::view-transition-group(${name})`).zIndex)
              );
              transition.animations = document
                .getAnimations()
                .filter((animation) => animation.effect?.pseudoElement?.startsWith("::view-transition-"))
                .map((animation) => ({
                  pseudo: animation.effect.pseudoElement,
                  duration: animation.effect.getTiming().duration,
                  properties: [...new Set(animation.effect.getKeyframes().flatMap((frame) => Object.keys(frame)))],
                }));
            })
            .catch((error) => {
              transition.skipped = error.message;
            });
        }
        const start = performance.now();
        function measure() {
          const position = (selector) => {
            const element = document.querySelector(selector);
            const rect = element.getBoundingClientRect();
            return { x: rect.x, y: rect.y };
          };
          frames.push({ profile: position(".about-profile"), main: position("main") });
          if (performance.now() - start < 500) requestAnimationFrame(measure);
          else window.reportPagePositions({ url: location.pathname, width: innerWidth, frames, transition });
        }
        requestAnimationFrame(measure);
      });
    });

    for (const { width, height } of [
      { width: 390, height: 900 },
      { width: 1100, height: 900 },
      { width: 1280, height: 900 },
      { width: 1440, height: 900 },
      { width: 1440, height: 600 },
    ]) {
      await page.setViewportSize({ width, height });
      for (const locale of ["/zh", ""]) {
        await page.goto(`${base}${locale}/`, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(550);
        const referenceProfile = await page.locator(".about-profile").boundingBox();
        const referenceMain = await page.locator("main").boundingBox();
        for (const section of ["projects", "blog", "awards", "projects"]) {
          if (width < 576) await page.locator("[data-site-nav-toggle]").click();
          await page.locator(`.navbar a[href="/zqdelta${locale}/${section}/"]`).click();
          await page.waitForLoadState("domcontentloaded");
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(550);
          const profile = await page.locator(".about-profile").boundingBox();
          const main = await page.locator("main").boundingBox();
          for (const axis of ["x", "y", "width", "height"]) {
            assert.ok(
              Math.abs(profile[axis] - referenceProfile[axis]) <= 0.1,
              `${locale}/${section} at ${width}px: sidebar ${axis} changed between pages`
            );
          }
          for (const axis of ["x", "y", "width"]) {
            assert.ok(Math.abs(main[axis] - referenceMain[axis]) <= 0.1, `${locale}/${section} at ${width}px: main ${axis} changed between pages`);
          }
          assert.equal(await page.locator(".nano-header > p, .post-header > .post-description").count(), 0, "Section headers must omit taglines");
          if (width >= 925) {
            await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
            const scrolledProfile = await page.locator(".about-profile").boundingBox();
            assert.ok(
              Math.abs(scrolledProfile.y - referenceProfile.y) <= 0.1,
              `${locale}/${section} at ${width}x${height}: sidebar moves near the footer`
            );
          }
        }
        const projectLink = page.locator(`a[href="/zqdelta${locale}/projects/railway-knowledge/"]`);
        await projectLink.scrollIntoViewIfNeeded();
        const listCard = await projectLink.boundingBox();
        const listScroll = await page.evaluate(() => scrollY);
        await projectLink.click();
        await page.waitForLoadState("domcontentloaded");
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(550);
        const detail = await page.locator(".project-detail").boundingBox();
        const article = await page.locator(".project-detail .nano-prose").boundingBox();
        for (const axis of ["x", "width"]) {
          assert.ok(Math.abs(detail[axis] - listCard[axis]) <= 0.1, `Detail ${axis} must align with project cards`);
          assert.ok(Math.abs(article[axis] - listCard[axis]) <= 0.1, `Article ${axis} must align with project cards`);
        }
        assert.equal(await page.locator(".project-workflow, .project-highlights, .project-work-label, .nano-prose table").count(), 0);
        assert.equal(await page.locator(".project-template-note").count(), 0);
        assert.equal(await page.locator(".nano-prose > #background, .nano-prose > #contributions").count(), 2);
        assert.equal(await page.locator(".project-card-primary").count(), 0);
        assert.ok(!/分钟阅读|min read/.test(await page.locator("main").textContent()));
        assert.equal(await page.locator(".detail-summary").count(), 0);
        const facts = await page.locator(".project-facts").boundingBox();
        const background = await page.locator("#background").boundingBox();
        assert.ok(facts.y + facts.height < background.y, "Internship overview and facts should precede the background");
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Page overflows the viewport");
        if (width >= 925) {
          const initialProfile = await page.locator(".about-profile").boundingBox();
          await page.evaluate(() => window.scrollTo(0, 600));
          await page.waitForTimeout(100);
          const stickyProfile = await page.locator(".about-profile").boundingBox();
          assert.ok(Math.abs(initialProfile.y - stickyProfile.y) <= 0.1, "Sticky author profile changes height when scrolling");
        }
        await page.locator(".nano-back").click();
        await page.waitForLoadState("domcontentloaded");
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(550);
        assert.equal(await page.locator(".project-card-primary:visible").count(), 7);
        assert.ok(Math.abs((await page.evaluate(() => scrollY)) - listScroll) <= 1, "Returning to projects must restore the list position");
      }
    }
    assert.deepEqual(errors, []);
    assert.ok(samples.length >= 60, "Expected first-frame samples from both locales and all viewport sizes");
    for (const sample of samples) {
      if (sample.transition.animations) {
        assert.ok(
          sample.transition.layers[1] > sample.transition.layers[0] && sample.transition.layers[2] > sample.transition.layers[0],
          "Content snapshots must not cover the shared sidebar or header"
        );
        assert.ok(
          Math.abs(sample.transition.snapshotHeight - sample.transition.viewportHeight) <= 1,
          "Snapshots must use the viewport, not document height"
        );
        const fades = sample.transition.animations.filter((animation) => animation.properties.includes("opacity"));
        assert.equal(fades.length, 2, "Navigation must have exactly one outgoing/incoming content crossfade");
        for (const animation of sample.transition.animations) {
          assert.ok(animation.pseudo.includes("page-content"), "Shared profile and navigation must remain still");
          assert.equal(animation.duration, 200);
          assert.ok(
            !animation.properties.some((property) => ["transform", "width", "height"].includes(property)),
            "Text must not resize or slide during navigation"
          );
        }
      }
      for (const selector of ["profile", "main"]) {
        for (const axis of ["x", "y"]) {
          const positions = sample.frames.map((frame) => frame[selector][axis]);
          const drift = Math.max(...positions) - Math.min(...positions);
          assert.ok(drift <= 0.1, `${sample.url} at ${sample.width}px: ${selector} moved ${drift}px on ${axis}`);
        }
      }
    }
    assert.ok(
      samples.some((sample) => sample.transition.animations?.length),
      "Expected native transitions during real link/history navigation"
    );
    console.log(
      `Passed ${samples.length} navigation samples with visible scrollbars: stable positions within and between pages, bilingual details, list restoration, and mobile layout.`
    );
    await responsiveFrame(browser, base);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
