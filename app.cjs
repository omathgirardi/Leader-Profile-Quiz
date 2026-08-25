const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");
const { pathToFileURL } = require("node:url");

const clientRoot = path.join(__dirname, "dist", "client");
const serverEntryPath = path.join(__dirname, "dist", "server", "server.js");

const mimeTypes = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

let serverEntryPromise;

function getServerEntry() {
  if (!serverEntryPromise) {
    serverEntryPromise = import(pathToFileURL(serverEntryPath).href).then(
      (module) => module.default ?? module,
    );
  }
  return serverEntryPromise;
}

function resolveStaticFile(urlPathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(urlPathname);
  } catch {
    return null;
  }

  const relativePath = decodedPath.replace(/^\/+/, "");
  if (!relativePath || relativePath.includes("\0")) return null;

  const absolutePath = path.resolve(clientRoot, relativePath);
  const relativeToRoot = path.relative(clientRoot, absolutePath);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) return null;

  try {
    return fs.statSync(absolutePath).isFile() ? absolutePath : null;
  } catch {
    return null;
  }
}

function serveStaticFile(request, response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const immutable = filePath.includes(`${path.sep}assets${path.sep}`);

  response.statusCode = 200;
  response.setHeader("content-type", mimeTypes[extension] ?? "application/octet-stream");
  response.setHeader(
    "cache-control",
    immutable ? "public, max-age=31536000, immutable" : "public, max-age=3600",
  );

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  fs.createReadStream(filePath).pipe(response);
}

function toWebRequest(request) {
  const forwardedProtocol = request.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProtocol)
    ? forwardedProtocol[0]
    : forwardedProtocol?.split(",")[0] || "https";
  const host = request.headers.host || "quizzlider.inmerc.com.br";
  const url = new URL(request.url || "/", `${protocol}://${host}`);
  const method = request.method || "GET";
  const init = { method, headers: request.headers };

  if (method !== "GET" && method !== "HEAD") {
    init.body = Readable.toWeb(request);
    init.duplex = "half";
  }

  return new Request(url, init);
}

async function sendWebResponse(webResponse, nodeResponse) {
  nodeResponse.statusCode = webResponse.status;
  nodeResponse.statusMessage = webResponse.statusText;

  for (const [name, value] of webResponse.headers) {
    nodeResponse.setHeader(name, value);
  }

  if (!webResponse.body) {
    nodeResponse.end();
    return;
  }

  Readable.fromWeb(webResponse.body).pipe(nodeResponse);
}

const app = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", "http://localhost");
    const staticFile = resolveStaticFile(requestUrl.pathname);

    if (staticFile) {
      serveStaticFile(request, response, staticFile);
      return;
    }

    const serverEntry = await getServerEntry();
    const webResponse = await serverEntry.fetch(toWebRequest(request));
    await sendWebResponse(webResponse, response);
  } catch (error) {
    console.error("Application request failed:", error);
    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader("content-type", "text/plain; charset=utf-8");
    }
    response.end("Erro interno da aplicação.");
  }
});

const port = Number(process.env.PORT || 3000);
const host = process.env.IP || "0.0.0.0";

app.listen(port, host, () => {
  console.log(`Leader Profile Quiz listening on ${host}:${port}`);
});

module.exports = app;
