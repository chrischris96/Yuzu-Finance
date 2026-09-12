import "./compile-book.mjs";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
const e = createRequire(import.meta.url)("../.book-build/bank-book.cjs");
const probe = createServer();
await new Promise((r) => probe.listen(0, "127.0.0.1", r));
const port = probe.address().port;
await new Promise((r) => probe.close(r));
const directory = path.resolve(".book-build/archive-test-" + randomUUID());
mkdirSync(directory, { recursive: true });
let processHandle;
async function start() {
  processHandle = spawn(process.execPath, ["scripts/book-server.mjs"], {
    env: {
      ...process.env,
      YUZU_DATA_DIR: directory,
      YUZU_ARCHIVE_PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(Error("Archive server startup timeout")),
      20000,
    );
    processHandle.stdout.on("data", (chunk) => {
      if (String(chunk).includes("Local bank-book archive:")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    processHandle.on("exit", (code) => {
      clearTimeout(timeout);
      reject(Error("Archive exited " + code));
    });
  });
}
async function stop() {
  const child = processHandle;
  processHandle = null;
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = new Promise((r) => child.once("exit", r));
    child.kill();
    await exited;
  }
}
const base = "http://127.0.0.1:" + port;
const run = await e.createRun(
  e.sampleBook(),
  e.sampleCurve(),
  e.sampleModel(),
  12,
);
try {
  await start();
  assert.equal((await fetch(base + "/health")).status, 200);
  assert.equal(
    (
      await fetch(base + "/runs", {
        headers: { Origin: "https://untrusted.example" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/runs", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "{}",
      })
    ).status,
    415,
  );
  const post = (data) =>
    fetch(base + "/runs", {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  assert.equal((await post(run)).status, 201);
  assert.equal((await post(run)).status, 200);
  const corrupt = structuredClone(run);
  corrupt.result.metrics.eveDelta = 123;
  assert.equal((await post(corrupt)).status, 400);
  assert.equal((await fetch(base + "/runs", { method: "DELETE" })).status, 405);
  await stop();
  await start();
  const records = await (await fetch(base + "/runs")).json();
  assert.equal(records.length, 1);
  await e.verifyRun(records[0]);
  await stop();
  const db = new DatabaseSync(path.join(directory, "bank-book.sqlite"));
  assert.throws(() => db.exec("DELETE FROM runs"), /immutable/);
  assert.throws(
    () => db.exec("UPDATE runs SET created_at='changed'"),
    /immutable/,
  );
  db.close();
  console.log(
    "PASS 9 archive checks: health, origin restriction, JSON-only writes, save, idempotency, tamper rejection, no delete API, restart/replay, SQLite immutability",
  );
} finally {
  await stop();
}
