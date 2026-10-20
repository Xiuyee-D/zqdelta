// Run against bin/dev start. A local proxy delays images without disabling
// Chromium's native cross-document transitions, as request interception can do.
const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");
const upstream = new URL(process.env.PERSONAL_SITE_URL || "http://127.0.0.1:4000/zqdelta");
const output = process.env.IMAGE_NAV_SCREENSHOTS;
if (output) fs.mkdirSync(output, { recursive: true });
let policy = {};
const requests = [];
const proxy = http.createServer((request, response) => {
  const image = /\.(?:webp|png)(?:\?|$)/.test(request.url);
  const target = policy.avatar ? request.url.includes("/dzq") : request.url.includes("/cover.webp");
  const delay = image && target ? policy.delay || 0 : 0;
  requests.push({ url: request.url, delay });
  if (image && target && policy.fail) {
    response.writeHead(404);
    response.end();
    return;
  }
  const forwarded = http.request(new URL(request.url, upstream), { headers: { ...request.headers, host: upstream.host } }, (result) => {
    const headers = { ...result.headers };
    // Every destination must really fetch its images, rather than only testing
    // a previously decoded image from memory or the HTTP cache.
    if (image) headers["cache-control"] = "no-store";
    response.writeHead(result.statusCode, headers);
    if (delay) {
      const chunks = [];
      result.on("data", (chunk) => chunks.push(chunk));
      result.on("end", () => setTimeout(() => response.end(Buffer.concat(chunks)), delay));
    } else result.pipe(response);
  });
  forwarded.on("error", () => {
    if (!response.headersSent) response.writeHead(502);
    response.end();
  });
  request.pipe(forwarded);
});

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (window.imageNavigationProbe?.finished) await window.imageNavigationProbe.finished;
  });
}

async function navigate(page, link, expectedPath) {
  await link.click({ noWaitAfter: true });
  await page.waitForURL((url) => url.pathname === expectedPath, { waitUntil: "domcontentloaded" });
  await settle(page);
  return page.evaluate(() => window.imageNavigationProbe);
}

async function blogTab(page) {
  const toggle = page.locator(".navbar-toggler");
  if (await toggle.isVisible()) await toggle.click();
  return page.locator('a.nav-link[href$="/zh/blog/"]');
}

function checkPrepared(probe, label) {
  assert.ok(probe.active, `${label}: expected a real native transition`);
  const waiting = probe.frames.filter((frame) => frame.pending);
  assert.ok(waiting.length > 2, `${label}: slow images must retain the old view`);
  for (const frame of waiting) {
    assert.equal(frame.oldOpacity, "1", `${label}: old content must stay opaque`);
    assert.equal(frame.newOpacity, "0", `${label}: incomplete covers must not fade in`);
    assert.equal(frame.oldProfile, "block");
    assert.equal(frame.newProfile, "none");
  }
  const released = probe.frames.find((frame) => !frame.pending);
  assert.ok(released, `${label}: navigation did not resume`);
  assert.ok(
    released.images.every((image) => image.loaded),
    `${label}: visible images were not ready`
  );
  assert.ok(probe.frames.some((frame) => Number(frame.newOpacity) > 0 && Number(frame.newOpacity) < 1));
}

(async () => {
  await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  const basePath = upstream.pathname.replace(/\/$/, "");
  const base = `http://127.0.0.1:${proxy.address().port}${basePath}`;
  const browser = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"], args: ["--disable-features=OverlayScrollbar"] });
  const errors = [];
  try {
    // Fresh profiles verify actual candidate selection and matching preload use.
    for (const [width, deviceScaleFactor, maximum] of [
      [375, 1, 150],
      [375, 2, 150],
      [375, 3, 225],
      [1440, 1, 225],
      [1440, 2, 350],
    ]) {
      policy = {};
      const avatarPage = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor, isMobile: width < 576 });
      await avatarPage.goto(`${base}/zh/projects/`, { waitUntil: "load" });
      const sample = await avatarPage.locator(".about-avatar").evaluate(async (image) => {
        await image.decode();
        const source = image.parentElement.querySelector("source");
        const preload = document.querySelector('link[rel="preload"][as="image"]');
        return {
          src: image.currentSrc,
          srcset: source.srcset.replace(/\s+/g, " ").trim(),
          preload: preload.imageSrcset.replace(/\s+/g, " ").trim(),
          sizes: [source.sizes, preload.imageSizes],
          viewportFirst: !!(document.querySelector('meta[name="viewport"]').compareDocumentPosition(preload) & Node.DOCUMENT_POSITION_FOLLOWING),
          requests: performance
            .getEntriesByType("resource")
            .filter((entry) => /\/assets\/img\/(?:profile\/)?dzq/.test(entry.name))
            .map((entry) => entry.name),
        };
      });
      assert.equal(sample.srcset, sample.preload, "Avatar preload and picture must use identical candidates");
      assert.equal(sample.sizes[0], sample.sizes[1]);
      assert.ok(sample.viewportFirst, "Declare the mobile viewport before choosing responsive image preloads");
      const candidate = Number(sample.src.match(/dzq-(\d+)-[a-f0-9]+\.webp/)[1]);
      assert.ok(candidate <= maximum, `Oversized avatar for ${width}px at DPR ${deviceScaleFactor}`);
      assert.deepEqual(sample.requests, [sample.src], "Do not fetch duplicate or original avatar files");
      await avatarPage.close();
    }
    console.log("Avatar selection passed five viewport/density combinations with one matching preload request each.");
    for (const width of [375, 1440]) {
      for (const theme of ["light", "dark"]) {
        policy = {};
        const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: theme });
        page.on("pageerror", (error) => errors.push(error.message));
        await page.addInitScript(() => {
          addEventListener("pagereveal", (event) => {
            const probe = { active: !!event.viewTransition, frames: [] };
            window.imageNavigationProbe = probe;
            if (!event.viewTransition) return;
            const root = document.documentElement;
            const start = performance.now();
            let finished = false;
            const sample = () => {
              const images = [...document.querySelectorAll(".about-avatar,.blog-card-cover img")].filter((image) => {
                const bounds = image.getBoundingClientRect();
                return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < innerHeight;
              });
              probe.frames.push({
                ms: performance.now() - start,
                pending: root.classList.contains("site-navigation-pending"),
                oldOpacity: getComputedStyle(root, "::view-transition-old(page-content)").opacity,
                newOpacity: getComputedStyle(root, "::view-transition-new(page-content)").opacity,
                oldProfile: getComputedStyle(root, "::view-transition-old(author-profile)").display,
                newProfile: getComputedStyle(root, "::view-transition-new(author-profile)").display,
                images: images.map((image) => ({ loaded: image.complete && image.naturalWidth > 0, avatar: image.matches(".about-avatar") })),
              });
              if (!finished) requestAnimationFrame(sample);
            };
            event.viewTransition.ready.then(() => requestAnimationFrame(sample)).catch(() => {});
            probe.finished = event.viewTransition.finished.then(() => {
              sample();
              finished = true;
            });
          });
        });
        await page.goto(`${base}/zh/projects/`, { waitUntil: "domcontentloaded" });
        await settle(page);
        await page.locator(".about-avatar").evaluate((image) => image.decode());
        assert.equal(await page.locator('link[rel="preload"][as="image"]').count(), 1);

        policy = { delay: 550 };
        if (width < 576) await page.locator(".navbar-toggler").click();
        const avatar = await page.locator(".about-avatar").boundingBox();
        const oldAvatar = PNG.sync.read(await page.screenshot({ clip: avatar }));
        await page.locator('a.nav-link[href$="/zh/blog/"]').click({ noWaitAfter: true });
        await page.waitForURL(`${base}/zh/blog/`, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => window.imageNavigationProbe?.frames.some((frame) => frame.pending));
        const retained = PNG.sync.read(await page.screenshot({ clip: avatar }));
        if (output) {
          fs.writeFileSync(path.join(output, `avatar-old-${width}-${theme}.png`), PNG.sync.write(oldAvatar));
          fs.writeFileSync(path.join(output, `avatar-retained-${width}-${theme}.png`), PNG.sync.write(retained));
        }
        // Native snapshot compositing can round color channels by one byte.
        // Reject any larger difference, including a blank or shifted portrait.
        // The compact profile can be covered by the source page's mobile menu.
        if (width >= 925) {
          assert.equal(retained.data.length, oldAvatar.data.length);
          let maximum = 0;
          const error = retained.data.reduce((sum, value, index) => {
            const difference = Math.abs(value - oldAvatar.data[index]);
            maximum = Math.max(maximum, difference);
            return sum + difference;
          }, 0);
          assert.ok(maximum <= 1, `The old avatar must remain painted while covers load (maximum ${maximum}, mean ${error / retained.data.length})`);
        }
        await settle(page);
        checkPrepared(await page.evaluate(() => window.imageNavigationProbe), `${width}px ${theme} covers`);
        assert.equal(await page.locator('.blog-card-cover img[loading="eager"]').count(), 2);
        assert.equal(await page.locator('.blog-card-cover img[loading="lazy"]').count(), 8);
        assert.equal(await page.locator('link[rel="preload"][as="image"]').count(), 3);
        if (output) await page.screenshot({ path: path.join(output, `blog-${width}-${theme}.png`) });

        policy = { avatar: true, delay: 450 };
        const article = await navigate(page, page.locator(".blog-card").first(), `${basePath}/zh/blog/bmad/`);
        checkPrepared(article, `${width}px ${theme} avatar`);
        assert.ok(article.frames.some((frame) => frame.images.some((image) => image.avatar && !image.loaded)));
        policy = { delay: 450 };
        const returned = await navigate(page, page.locator(".nano-back"), `${basePath}/zh/blog/`);
        if (returned.frames.some((frame) => frame.images.some((image) => !image.loaded))) {
          checkPrepared(returned, `${width}px ${theme} history`);
        } else {
          assert.ok(returned.active, "History must retain native transitions when restored images are already ready");
          assert.ok(returned.frames.some((frame) => !frame.pending));
        }

        policy = { delay: 1600 };
        await navigate(page, page.locator(".blog-card").first(), `${basePath}/zh/blog/bmad/`);
        const timeout = await navigate(page, await blogTab(page), `${basePath}/zh/blog/`);
        const resumed = timeout.frames.find((frame) => !frame.pending);
        assert.ok(resumed && resumed.ms < 1100, "Slow images must not freeze navigation beyond the bounded preparation window");
        assert.ok(
          resumed.images.some((image) => !image.loaded),
          "The timeout case must contain genuinely pending images"
        );

        policy = { fail: true };
        await navigate(page, page.locator(".blog-card").first(), `${basePath}/zh/blog/bmad/`);
        await navigate(page, await blogTab(page), `${basePath}/zh/blog/`);
        assert.ok(!(await page.locator("html").getAttribute("class"))?.includes("site-navigation-pending"));
        console.log(`Passed ${width}px ${theme}: slow covers, painted avatar, history return, timeout and failed-image fallback.`);
        await page.close();
      }
    }
    for (const options of [{ reducedMotion: "reduce" }, { javaScriptEnabled: false }]) {
      policy = {};
      const page = await browser.newPage({ ...options, viewport: { width: 375, height: 900 } });
      await page.goto(`${base}/zh/projects/`, { waitUntil: "domcontentloaded" });
      await page.locator(".project-card").first().click();
      await page.waitForURL(`${base}/zh/projects/olfactory-flavor-perception/`, { waitUntil: "domcontentloaded" });
      assert.ok(!(await page.locator("html").getAttribute("class"))?.includes("site-navigation-pending"));
      await page.close();
    }
    assert.deepEqual(errors, []);
    assert.ok(requests.some((request) => request.delay >= 450));
    console.log("Image navigation passed: four viewport/theme combinations, reduced motion and native no-JS links.");
  } finally {
    await browser.close();
    proxy.closeAllConnections();
    await new Promise((resolve) => proxy.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
