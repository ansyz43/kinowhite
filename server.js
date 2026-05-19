// Простой статик-сервер для собранной Astro-версии (dist/).
// Используется хостингами вроде Timeweb Apps, которые ожидают `npm start`.
// Никаких внешних зависимостей — только встроенные Node-модули.

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "dist");
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif":  "image/gif",
  ".ico":  "image/x-icon",
  ".woff":  "font/woff",
  ".woff2": "font/woff2",
  ".ttf":   "font/ttf",
  ".otf":   "font/otf",
  ".txt":   "text/plain; charset=utf-8",
  ".xml":   "application/xml; charset=utf-8",
};

async function tryFile(p) {
  try {
    const s = await stat(p);
    if (s.isFile()) return p;
    if (s.isDirectory()) {
      const idx = join(p, "index.html");
      const s2 = await stat(idx);
      if (s2.isFile()) return idx;
    }
  } catch {}
  return null;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let p = decodeURIComponent(url.pathname);
    // защита от ../../ — нормализуем и обрезаем ведущие слэши
    p = normalize(p).replace(/^[\\/]+/, "");
    const full = resolve(ROOT, p);
    if (!full.startsWith(ROOT)) {
      res.writeHead(403); res.end("Forbidden"); return;
    }

    let file = await tryFile(full);
    if (!file) {
      // SPA-fallback на 404.html (Astro генерирует), иначе index.html, иначе 404
      file =
        (await tryFile(join(ROOT, "404.html"))) ||
        (await tryFile(join(ROOT, "index.html")));
      if (!file) { res.writeHead(404); res.end("Not Found"); return; }
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(await readFile(file));
      return;
    }

    const ext = extname(file).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": mime,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500); res.end("Server error");
    console.error(err);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[kinowhite] static server → http://${HOST}:${PORT}/  (root: ${ROOT})`);
});
