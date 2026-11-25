// tests/deploy.test.js — Vercel 배포 준비 · docs/SPEC.md 11절 AC-D1
// 서버를 켜지 않고 입구 함수만 불러 시험한다. db.js · ai.js는 불러오는 순간 환경변수를 읽으므로, 먼저 정한 뒤 dynamic import한다. 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(ROOT, file), "utf-8");

process.env.DB_MODE = "memory"; // 진짜 DB는 건드리지 않음
process.env.ANTHROPIC_API_KEY = ""; // 진짜 AI는 부르지 않음
delete process.env.AI_FAULT;
delete process.env.AI_TIMEOUT_MS;

// 파일 목록 (하위 폴더까지)
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(path.join(dir, n)).isDirectory() ? walk(path.join(dir, n)) : [path.join(dir, n)]));

test("AC-D1 server.js는 Vercel 입구 함수를 기본으로 내보낸다", async () => {
  const mod = await import("../server.js"); // 직접 실행이 아니므로 서버가 켜지지 않아야 함
  assert.equal(typeof mod.default, "function", "export default가 함수여야 Vercel이 입구로 씀");
  assert.ok(!read("server.js").includes("createServer"), "루트 server.js에는 로직이 없음");
});

test("AC-D1 입구 함수 하나가 화면과 API를 모두 처리한다", async () => {
  const { default: handle } = await import("../server.js");
  const server = http.createServer(handle).listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://localhost:${server.address().port}`;
  try {
    const page = await fetch(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-type"), /text\/html/);
    const list = await fetch(`${base}/api/reports`);
    assert.equal(list.status, 200);
    assert.equal((await list.json()).length, 40, "시드 40건");
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});

test("AC-D1 화면 파일(src/public)에 키 · 서버 전용 키가 없다", () => {
  const banned = ["sk-ant-", "sb_secret_", "SUPABASE_SECRET_KEY", "ANTHROPIC_API_KEY"];
  const files = walk(path.join(ROOT, "src/public")).filter((f) => /\.(html|js|css|json)$/.test(f));
  assert.ok(files.length > 0);
  for (const f of files) {
    const text = readFileSync(f, "utf-8");
    for (const word of banned) assert.ok(!text.includes(word), `${path.relative(ROOT, f)}에 ${word}가 있음`);
  }
});

test("AC-D1 .env와 data/app.db는 올리지 않는다", () => {
  for (const file of [".gitignore", ".vercelignore"]) {
    const lines = read(file).split("\n").map((l) => l.trim());
    assert.ok(lines.includes(".env"), `${file}에 .env`);
    assert.ok(lines.some((l) => l.startsWith("data/app.db")), `${file}에 data/app.db`);
  }
});

test("AC-D1 Node는 24.x로 고정 · vercel.json은 서울 리전", () => {
  assert.equal(JSON.parse(read("package.json")).engines.node, "24.x", ">=24로 쓰면 Vercel이 버전을 못 고름");
  assert.deepEqual(JSON.parse(read("vercel.json")).regions, ["icn1"]);
});

test("AC-D1 Vercel에서는 SQLite 파일을 임시 폴더에 둔다", async () => {
  const { sqliteFile } = await import("../src/db.js");
  const local = sqliteFile({});
  assert.ok(local.endsWith(path.join("data", "app.db")), "로컬은 data/app.db");
  const vercel = sqliteFile({ VERCEL: "1" });
  const { tmpdir } = await import("node:os");
  assert.equal(vercel, path.join(tmpdir(), "app.db"));
});
