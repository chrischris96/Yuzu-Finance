/** Local, single-user append-only SQLite archive. Intentionally not a public authentication server. */
import "./compile-book.mjs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
const { verifyRun } = createRequire(import.meta.url)(
  "../.book-build/bank-book.cjs",
);
const directory = path.resolve(process.env.YUZU_DATA_DIR || ".book-data");
mkdirSync(directory, { recursive: true });
const db = new DatabaseSync(path.join(directory, "bank-book.sqlite"));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, created_at TEXT NOT NULL, engine_version TEXT NOT NULL, input_hash TEXT NOT NULL, result_hash TEXT NOT NULL, payload TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS runs_no_update BEFORE UPDATE ON runs BEGIN SELECT RAISE(ABORT,'Runs are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS runs_no_delete BEFORE DELETE ON runs BEGIN SELECT RAISE(ABORT,'Runs are immutable'); END;`);
const port = Number(process.env.YUZU_ARCHIVE_PORT || 8787);
const origins = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);
const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  // Loopback bind, exact Host/Origin checks, JSON-only mutations and no credentials prevent browser drive-by writes.
  if (
    !["127.0.0.1:" + port, "localhost:" + port].includes(req.headers.host || "")
  ) {
    res.writeHead(403);
    res.end("Invalid host");
    return;
  }
  if (origin && !origins.has(origin)) {
    res.writeHead(403);
    res.end("Origin not allowed");
    return;
  }
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    if (req.url === "/health" && req.method === "GET") {
      res.end(
        JSON.stringify({
          status: "ok",
          storage: "SQLite",
          mode: "local-single-user",
        }),
      );
      return;
    }
    if (req.url !== "/runs") {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }
    if (req.method === "GET") {
      const rows = db
        .prepare("SELECT payload FROM runs ORDER BY created_at DESC LIMIT 100")
        .all();
      res.end("[" + rows.map((r) => r.payload).join(",") + "]");
      return;
    }
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end();
      return;
    }
    if (req.headers["content-type"] !== "application/json") {
      res.writeHead(415);
      res.end(JSON.stringify({ error: "JSON required" }));
      return;
    }
    let body = "",
      bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 15_000_000) throw Error("Run exceeds 15 MB limit");
      body += chunk.toString("utf8");
    }
    const run = JSON.parse(body);
    await verifyRun(run);
    if (
      typeof run.createdAt !== "string" ||
      !Number.isFinite(Date.parse(run.createdAt))
    )
      throw Error("Invalid run timestamp");
    const existing = db
      .prepare("SELECT result_hash FROM runs WHERE id=?")
      .get(run.id);
    if (existing && existing.result_hash !== run.resultHash)
      throw Error("Immutable run conflict");
    if (!existing)
      db.prepare("INSERT INTO runs VALUES(?,?,?,?,?,?)").run(
        run.id,
        run.createdAt,
        run.result.engineVersion,
        run.inputHash,
        run.resultHash,
        JSON.stringify(run),
      );
    res.writeHead(existing ? 200 : 201);
    res.end(JSON.stringify({ id: run.id }));
  } catch (error) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: error.message }));
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    "Local bank-book archive: http://127.0.0.1:" + port + " — " + directory,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
