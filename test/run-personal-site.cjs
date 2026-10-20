// One entry point for the isolated integration test and the real-site browser suites.
const { spawnSync, fork } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const root = path.resolve(__dirname, "..");
process.chdir(root);
const mode = process.argv[2] || "--all";
if (!["--all", "--browser", "--integration", "--compatibility", "--chromium"].includes(mode) || process.argv.length > 3) {
  console.error("Usage: node test/run-personal-site.cjs [--all|--browser|--integration|--compatibility|--chromium]");
  process.exit(2);
}
const env = { ...process.env };
if (!env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(path.join(root, ".dev-tools/browsers"))) {
  env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".dev-tools/browsers");
}
const failures = [];
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit" });
  if (result.error || result.status !== 0) {
    failures.push(`${command} ${args.join(" ")}`);
    if (result.error) console.error(result.error.message);
    return false;
  }
  return true;
}
(async () => {
  if (["--all", "--integration"].includes(mode)) run("./bin/dev", ["bundle", "exec", "ruby", "test/personal_site_test.rb"]);
  if (!["--integration", "--compatibility"].includes(mode)) {
    if (!env.PERSONAL_SITE_URL && !run("./bin/dev", ["start"])) process.exit(1);
    const url = `${env.PERSONAL_SITE_URL || "http://127.0.0.1:4000/zqdelta"}/`;
    const deadline = Date.now() + 120000;
    let ready = false;
    while (Date.now() < deadline) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        /* The preview can still be starting. */
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error(`Preview did not become ready: ${url}`);
    if (mode !== "--compatibility")
      for (const suite of ["bilingual", "projects", "blog", "navigation", "image_navigation", "return_navigation", "theme", "voice_terminal"]) {
        run(process.execPath, [`test/personal_site_${suite}.cjs`]);
      }
  }
  if (["--all", "--browser", "--compatibility"].includes(mode)) {
    let server;
    try {
      if (!process.env.PERSONAL_SITE_URL) {
        if (!run("./bin/dev", ["build"])) process.exit(1);
        server = fork(path.join(__dirname, "serve-built-site.cjs"), [], { cwd: root, env, stdio: ["ignore", "inherit", "inherit", "ipc"] });
        env.PERSONAL_SITE_URL = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Built-site server did not start")), 10000);
          server.once("message", ({ url }) => {
            clearTimeout(timeout);
            resolve(url);
          });
          server.once("error", reject);
          server.once("exit", () => {
            clearTimeout(timeout);
            reject(new Error("Built-site server exited before readiness"));
          });
        });
      }
      run("./bin/test-browsers", []);
    } finally {
      server?.kill();
    }
  }
  if (failures.length) {
    console.error(`Failed checks:\n${failures.join("\n")}`);
    process.exitCode = 1;
  } else console.log("Personal-site checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
