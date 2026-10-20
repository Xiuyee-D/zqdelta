// Serve the verified build without LiveReload. Used only by local checks.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { pipeline } = require("node:stream");
const root = path.resolve(__dirname, "../_site");
const cacheControl = process.env.PERSONAL_SITE_HTTP_CACHE === "1" ? "public, max-age=600" : "no-store";
const config = fs.readFileSync(path.resolve(__dirname, "../_config.yml"), "utf8");
const base = config.match(/^baseurl:\s*["']?([^"'\s]+)["']?\s*$/m)?.[1];
if (!base || !fs.existsSync(path.join(root, "index.html"))) throw new Error("Build _site before starting the test server");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".xml": "application/xml",
};
const server = http.createServer((request, response) => {
  try {
    const route = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (route === base) {
      response.writeHead(301, { Location: `${base}/` });
      response.end();
      return;
    }
    if (!route.startsWith(`${base}/`)) {
      response.writeHead(404);
      response.end();
      return;
    }
    let file = path.resolve(root, `.${route.slice(base.length)}`);
    if (file !== root && !file.startsWith(root + path.sep)) {
      response.writeHead(404);
      response.end();
      return;
    }
    let stat = fs.statSync(file);
    if (stat.isDirectory()) {
      file = path.join(file, "index.html");
      stat = fs.statSync(file);
    }
    response.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": cacheControl,
    });
    if (request.method === "HEAD") response.end();
    else pipeline(fs.createReadStream(file), response, () => {});
  } catch {
    const notFound = path.join(root, "404.html");
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    if (request.method === "HEAD" || !fs.existsSync(notFound)) response.end();
    else pipeline(fs.createReadStream(notFound), response, () => {});
  }
});
server.listen(0, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${server.address().port}${base}`;
  if (process.send) process.send({ url });
  else console.log(url);
});
