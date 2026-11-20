const assert = require("node:assert/strict");

module.exports = async function checkProjectVideo(browser, base, { playback = true } = {}) {
  for (const language of ["zh", "en"]) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      const requests = [];
      const downloads = [];
      page.on("request", (request) => {
        if (new URL(request.url()).pathname.endsWith(".mp4")) requests.push(request.url());
      });
      page.on("response", (response) => {
        // Linux WebKit announces a synthetic status-0 media response before HTTP starts.
        if (new URL(response.url()).pathname.endsWith(".mp4") && response.status() > 0) downloads.push(response.url());
      });
      await page.goto(`${base}${language === "zh" ? "/zh" : ""}/projects/family-recipe-manager/`, { waitUntil: "networkidle" });
      const video = page.locator(".project-demo video");
      await video.scrollIntoViewIfNeeded();
      assert.equal(downloads.length, 0, "Do not download demo videos before playback");
      assert.equal(await video.evaluate((element) => element.paused), true);
      const poster = await video.evaluate(async (element) => {
        const image = new Image();
        image.src = element.poster;
        await image.decode();
        return { width: image.naturalWidth, height: image.naturalHeight, url: element.poster };
      });
      assert.equal(poster.width, 1920);
      assert.equal(poster.height, 1080);
      assert.ok(poster.url.endsWith(`/demo-poster-${language}.jpg`));
      assert.ok((await video.locator("source").getAttribute("src")).endsWith(`/demo-${language}.mp4`));
      const before = await video.boundingBox();
      assert.ok(Math.abs(before.width / before.height - 16 / 9) < 0.01);
      if (!playback) continue;
      await video.evaluate((element) =>
        Promise.race([element.play(), new Promise((_, reject) => setTimeout(() => reject(new Error("Demo playback timed out")), 10000))])
      );
      await page.waitForFunction(() => document.querySelector(".project-demo video").currentTime > 0.25, null, { timeout: 10000 });
      const metadata = await video.evaluate((element) => ({ width: element.videoWidth, height: element.videoHeight, duration: element.duration }));
      assert.deepEqual(metadata, { width: 1920, height: 1080, duration: 56 });
      await video.evaluate((element) => {
        element.pause();
        element.currentTime = 28;
      });
      await page.waitForFunction(
        () => {
          const video = document.querySelector(".project-demo video");
          return !video.seeking && video.readyState >= 2 && Math.abs(video.currentTime - 28) < 0.1;
        },
        null,
        { timeout: 10000 }
      );
      assert.ok(
        requests.every((url) => url.endsWith(`/demo-${language}.mp4`)),
        "Only request the localized video"
      );
      const after = await video.boundingBox();
      for (const key of ["x", "y", "width", "height"]) assert.ok(Math.abs(before[key] - after[key]) < 1, "Playback must not shift the page");
    } finally {
      await context.close();
    }
  }
  const result = playback
    ? "Both languages passed: poster, on-demand playback, video dimensions, seeking and stable layout."
    : "Both languages passed poster, layout and paused-state checks. Playback NOT VERIFIED on Linux WebKit; Safari/macOS verification is required.";
  console.log(`Project demo: ${result}`);
  return result;
};
