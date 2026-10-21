import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
const base = path.resolve("dist");
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const relative =
        pathname.replace(/^\/localWeather\//, "").replace(/^\//, "") ||
        "index.html";
      const file = path.resolve(base, relative);
      if (!file.startsWith(base + path.sep)) throw Error("outside root");
      const body = await fs.readFile(file);
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".json": "application/json",
          ".svg": "image/svg+xml",
          ".webmanifest": "application/manifest+json",
        }[path.extname(file)] || "application/octet-stream",
      );
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(4173, "127.0.0.1");
