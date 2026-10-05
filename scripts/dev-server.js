import http from "node:http";
import https from "node:https";
import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT) || 4173;
const apiOrigin = new URL(process.env.MARU_API_ORIGIN || "http://127.0.0.1:5173");
// MARU_STATIC_DIR=dist serve o build de produção (npm run preview) em vez dos arquivos-fonte.
const staticDir = process.env.MARU_STATIC_DIR ? path.resolve(root, process.env.MARU_STATIC_DIR) : null;

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function serveFile(res, filename) {
  try {
    const stat = statSync(filename);
    if (!stat.isFile()) throw new Error("not a file");
    res.writeHead(200, {
      "Content-Type": types[path.extname(filename)] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "no-cache"
    });
    createReadStream(filename).pipe(res);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Arquivo não encontrado.");
  }
}

function safeFile(base, pathname) {
  const filename = path.resolve(base, "." + decodeURIComponent(pathname));
  return filename === base || filename.startsWith(base + path.sep) ? filename : null;
}

function proxyApi(req, res) {
  const transport = apiOrigin.protocol === "https:" ? https : http;
  // apiOrigin may itself carry a path (e.g. a Supabase function URL); prepend
  // it instead of letting the incoming absolute path replace it outright.
  const incoming = new URL(req.url || "/api", "http://placeholder");
  const target = new URL(apiOrigin);
  target.pathname = (apiOrigin.pathname === "/" ? "" : apiOrigin.pathname.replace(/\/$/, "")) + incoming.pathname;
  target.search = incoming.search;
  const upstream = transport.request(target, {
    method: req.method,
    headers: { ...req.headers, host: apiOrigin.host }
  }, response => {
    res.writeHead(response.statusCode || 502, response.headers);
    response.pipe(res);
  });
  upstream.on("error", () => {
    if (res.headersSent) return res.destroy();
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "A API do Maru não está disponível. Inicie o maru-backend." }));
  });
  req.pipe(upstream);
}

http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname.startsWith("/api/")) return proxyApi(req, res);

  if (staticDir) {
    const filename = url.pathname === "/" ? null : safeFile(staticDir, url.pathname);
    try { if (filename && statSync(filename).isFile()) return serveFile(res, filename); } catch {}
    return serveFile(res, path.join(staticDir, "index.html"));
  }

  if (url.pathname.startsWith("/shared/")) {
    const filename = safeFile(path.join(root, "shared"), url.pathname.slice("/shared".length));
    return filename ? serveFile(res, filename) : serveFile(res, "");
  }

  if (url.pathname !== "/") {
    const filename = safeFile(path.join(root, "frontend"), url.pathname);
    if (filename) {
      try {
        if (statSync(filename).isFile()) return serveFile(res, filename);
      } catch {}
    }
  }

  return serveFile(res, path.join(root, "frontend", "index.html"));
}).listen(port, host, () => {
  console.log(`Frontend do Maru em http://${host}:${port}${staticDir ? " (build em " + path.relative(root, staticDir) + "/)" : ""}`);
  console.log(`Encaminhando /api para ${apiOrigin.origin}`);
});
