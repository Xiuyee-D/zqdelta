// Optional local audits of the production build; not part of ordinary site checks.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { fork } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const tools = { "axe-core": "4.14.0", lighthouse: "13.5.0" };
const mode = process.argv[2] || "--all";
if (process.argv.length > 3 || !["--all", "--axe", "--lighthouse", "--packages", "--help"].includes(mode)) {
  console.error("Usage: ./bin/dev audit [--axe|--lighthouse]");
  process.exit(2);
}
if (mode === "--help") {
  console.log("Usage: ./bin/dev audit [--axe|--lighthouse]\nInstall optional project-local tools with ./bin/dev audit-setup.");
  process.exit(0);
}
if (mode === "--packages") {
  console.log(
    Object.entries(tools)
      .map(([name, version]) => `${name}@${version}`)
      .join("\n")
  );
  process.exit(0);
}
const root = path.resolve(__dirname, "..");
const site = path.join(root, "_site");
const output = path.join(root, ".dev-tools/test-results/quality");
const toolDirectory = path.join(root, ".dev-tools/quality-tools");
const axeEnabled = mode !== "--lighthouse";
const lighthouseEnabled = mode !== "--axe";
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(path.join(root, ".dev-tools/browsers"))) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".dev-tools/browsers");
}

function resolveTool(name, filename) {
  const directory = path.join(toolDirectory, "node_modules", name);
  const metadata = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
  if (metadata.version !== tools[name]) throw new Error(`Expected ${name}@${tools[name]}, found ${metadata.version}.`);
  return path.join(directory, filename || metadata.main);
}

function routes(directory = site) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (directory === site && entry.name === "assets") return [];
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return routes(file);
    if (entry.name !== "index.html") return [];
    const relative = path.relative(site, directory).split(path.sep).filter(Boolean).join("/");
    return [`/${relative}${relative ? "/" : ""}`];
  });
}

function writeReport(name, data) {
  fs.writeFileSync(path.join(output, name), JSON.stringify(data, null, 2) + "\n");
}

function buildFingerprint() {
  const digest = crypto.createHash("sha256");
  for (const route of [...routes(), "/404.html"].sort()) {
    const file = path.join(site, route.endsWith("/") ? `${route.slice(1)}index.html` : route.slice(1));
    digest.update(route).update(fs.readFileSync(file));
  }
  return digest.digest("hex");
}

async function accessibility(chromium, base, axePath) {
  const browser = await chromium.launch({ args: ["--no-sandbox"], ignoreDefaultArgs: ["--hide-scrollbars"] });
  const results = [];
  try {
    for (const theme of ["light", "dark"]) {
      for (const width of [375, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
        try {
          const queue = [...routes(), "/404.html"];
          await Promise.all(
            [0, 1].map(async () => {
              const page = await context.newPage();
              try {
                while (queue.length) {
                  const route = queue.shift();
                  const response = await page.goto(base + route, { waitUntil: "load", timeout: 30000 });
                  if (response.status() !== 200) throw new Error(`Audit page returned ${response.status()}: ${route}`);
                  await page.evaluate(() => document.fonts.ready);
                  await page.addScriptTag({ path: axePath });
                  const data = await page.evaluate(async () => {
                    const result = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } });
                    return {
                      violations: result.violations.map(({ id, impact, help, nodes }) => ({
                        id,
                        impact,
                        help,
                        nodes: nodes.map(({ target, html, failureSummary }) => ({ target, html, summary: failureSummary })),
                      })),
                      incomplete: result.incomplete.map(({ id, nodes }) => ({ id, count: nodes.length })),
                    };
                  });
                  results.push({ route, width, theme, ...data });
                  writeReport("axe.json", results);
                }
              } finally {
                await page.close();
              }
            })
          );
          const page = await context.newPage();
          const missing = await page.goto(base + "/missing-quality-check/", { waitUntil: "load" });
          if (missing.status() !== 404 || (await page.locator(`main a[href="${new URL(base).pathname}/zh/"]`).count()) !== 1) {
            throw new Error("404 fallback or Chinese homepage link failed.");
          }
          if (width === 375) {
            for (const [route, selector] of [
              ["/zh/blog/rag/", ".nano-prose pre"],
              ["/zh/blog/regular-expressions/", ".blog-table"],
            ]) {
              await page.goto(base + route, { waitUntil: "load" });
              await page.evaluate(() => document.fonts.ready);
              const index = await page.locator(selector).evaluateAll((nodes) => nodes.findIndex((node) => node.scrollWidth > node.clientWidth + 2));
              if (index < 0) {
                if (selector === ".nano-prose pre") throw new Error("Missing overflowing code fixture.");
                continue;
              }
              await page.locator(selector).nth(index).focus();
              await page.keyboard.press("ArrowRight");
              await page.waitForFunction(({ selector, index }) => document.querySelectorAll(selector)[index].scrollLeft > 0, { selector, index });
            }
          }
          console.log(`Axe: ${width}px ${theme}; ${results.length} page/configuration checks complete.`);
        } finally {
          await context.close();
        }
      }
    }
    const violations = results.reduce((total, result) => total + result.violations.length, 0);
    return { checks: results.length, violations, version: tools["axe-core"], passed: violations === 0 };
  } finally {
    await browser.close();
  }
}

async function performance(chromium, base, lighthousePath) {
  const { default: lighthouse } = await import(pathToFileURL(lighthousePath));
  const browser = await chromium.launch({ args: ["--no-sandbox", "--remote-debugging-port=0"] });
  const results = {};
  try {
    // Playwright may use its lightweight headless shell instead of executablePath().
    // Read the allocated CDP port from this browser's own temporary profile.
    const session = await browser.newBrowserCDPSession();
    const { arguments: browserArguments } = await session.send("Browser.getBrowserCommandLine");
    const profile = browserArguments.find((argument) => argument.startsWith("--user-data-dir=")).slice("--user-data-dir=".length);
    const port = Number(fs.readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]);
    await session.detach();
    if (!Number.isInteger(port) || port <= 0) throw new Error("Chromium did not expose its allocated audit port.");
    for (const [name, route, formFactor] of [
      ["home-mobile", "/zh/", "mobile"],
      ["projects-mobile", "/zh/projects/", "mobile"],
      ["blog-desktop", "/blog/", "desktop"],
    ]) {
      const options = {
        port,
        output: ["html", "json"],
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        formFactor,
      };
      if (formFactor === "desktop") {
        options.screenEmulation = { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false };
        options.throttling = {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        };
      }
      const result = await lighthouse(base + route, options);
      if (result.lhr.runtimeError) throw new Error(result.lhr.runtimeError.message);
      fs.writeFileSync(path.join(output, name + ".html"), result.report[0]);
      fs.writeFileSync(path.join(output, name + ".json"), result.report[1]);
      results[name] = {
        scores: Object.fromEntries(Object.entries(result.lhr.categories).map(([key, category]) => [key, Math.round(category.score * 100)])),
        lcp: result.lhr.audits["largest-contentful-paint"].displayValue,
        cls: result.lhr.audits["cumulative-layout-shift"].displayValue,
        tbt: result.lhr.audits["total-blocking-time"].displayValue,
      };
      console.log(`Lighthouse ${name}: ${JSON.stringify(results[name])}`);
    }
    return results;
  } finally {
    await browser.close();
  }
}

(async () => {
  if (!fs.existsSync(path.join(site, "index.html"))) throw new Error("Build the site with ./bin/dev build first.");
  let axePath, lighthousePath;
  try {
    if (axeEnabled) axePath = resolveTool("axe-core", "axe.min.js");
    if (lighthouseEnabled) {
      const [major, minor] = process.versions.node.split(".").map(Number);
      if (major < 22 || (major === 22 && minor < 19)) throw new Error("Lighthouse requires Node.js 22.19 or newer; --axe can run separately.");
      lighthousePath = resolveTool("lighthouse");
    }
  } catch (error) {
    throw new Error(`${error.message}\nOptional tools: ./bin/dev audit-setup. No host packages are installed by this check.`);
  }
  const { chromium } = require("@playwright/test");
  fs.mkdirSync(output, { recursive: true });
  const report = { mode, build_sha256: buildFingerprint(), completed: false };
  writeReport("summary.json", report);
  const server = fork(path.join(__dirname, "serve-built-site.cjs"), [], {
    cwd: root,
    stdio: ["ignore", "inherit", "inherit", "ipc"],
    env: { ...process.env, PERSONAL_SITE_HTTP_CACHE: "1" },
  });
  try {
    const base = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Built-site server did not start within 10 seconds.")), 10000);
      const finish = (error, url) => {
        clearTimeout(timeout);
        error ? reject(error) : resolve(url);
      };
      server.once("message", ({ url }) => finish(null, url));
      server.once("error", (error) => finish(error));
      server.once("exit", () => finish(new Error("Built-site server exited.")));
    });
    if (axeEnabled) report.accessibility = await accessibility(chromium, base, axePath);
    if (lighthouseEnabled) report.lighthouse = await performance(chromium, base, lighthousePath);
    report.completed = true;
    if (report.accessibility?.violations) process.exitCode = 1;
  } finally {
    writeReport("summary.json", report);
    server.kill();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
