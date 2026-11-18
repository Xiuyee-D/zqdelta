// Formula rendering must work without the public CDN, including lazy extensions.
const assert = require("node:assert/strict");

module.exports = async function checkLocalMath(browser, base) {
  const context = await browser.newContext();
  const origin = new URL(base).origin;
  const external = [],
    failures = [],
    errors = [],
    resources = [];
  try {
    await context.route("**/*", (route) => {
      const url = route.request().url();
      if (new URL(url).origin === origin) return route.continue();
      external.push(url);
      return route.abort();
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) => {
      if (request.url().includes("/mathjax-3.2.2/")) failures.push(request.url());
    });
    page.on("response", (response) => {
      if (response.url().includes("/mathjax-3.2.2/")) {
        resources.push(response.url());
        if (!response.ok()) failures.push(`${response.status()} ${response.url()}`);
      }
    });
    for (const route of ["/zh/", "/projects/"]) {
      await page.goto(`${base}${route}`, { waitUntil: "load" });
      assert.equal(await page.locator("#MathJax-script").count(), 0, "Non-formula pages must not load MathJax");
    }
    assert.equal(resources.length, 0);
    for (const route of ["/zh/blog/transformer/", "/blog/affective-computing-04-messages/"]) {
      await page.goto(`${base}${route}`, { waitUntil: "load" });
      await page.waitForFunction(() => !!window.MathJax?.startup?.promise);
      await page.evaluate(() => MathJax.startup.promise);
      const expectedMinimum = route.includes("/transformer/") ? 50 : 4;
      assert.ok((await page.locator("mjx-container").count()) >= expectedMinimum, `Formulas not rendered: ${route}`);
      assert.equal(await page.locator("mjx-merror, [data-mml-node='merror']").count(), 0);
    }
    await page.evaluate(async () => {
      const formula = document.createElement("p");
      formula.id = "local-math-extension-check";
      formula.textContent = String.raw`\(\require{cancel}\cancel{x}\)`;
      document.querySelector("main").append(formula);
      await MathJax.typesetPromise([formula]);
      await document.fonts.ready;
    });
    assert.equal(await page.locator("#local-math-extension-check mjx-container").count(), 1);
    assert.equal(await page.locator("#local-math-extension-check mjx-merror, #local-math-extension-check [data-mml-node='merror']").count(), 0);
    assert.ok(
      resources.some((url) => url.endsWith("/input/tex/extensions/cancel.min.js")),
      "Load TeX extensions from the local versioned directory"
    );
    assert.ok(
      resources.some((url) => /\/output\/chtml\/fonts\/woff-v2\/.*\.woff$/.test(url)),
      "Load formula fonts locally"
    );
    assert.deepEqual(failures, [], "Every requested MathJax resource must load");
    assert.deepEqual(external, [], "Formula pages must not depend on external requests");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
  console.log("Local MathJax passed with external requests blocked: formula pages, fonts, lazy TeX extension and non-formula opt-out.");
};
