// tests/screen.test.js — 화면(html)과 화면 파일 응답 확인. 클릭 같은 동작은 브라우저로 본다.
// misik.test.js처럼 서버를 DB_MODE=memory로 직접 켠다. 실행: npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 20000 + Math.floor(Math.random() * 1000);
const BASE = `http://localhost:${PORT}`;
let server;

before(async () => {
  const env = { ...process.env, PORT: String(PORT), DB_MODE: "memory", ANTHROPIC_API_KEY: "" };
  server = spawn(process.execPath, ["server.js"], { cwd: ROOT, env, stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try {
      return void (await fetch(`${BASE}/api/me`));
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error("5초 안에 서버가 켜지지 않았습니다");
});
after(() => server?.kill());

test("화면: 응답이 예상과 달라도 죽지 않고 한국어 안내 문장을 가진다", async () => {
  const misik = await (await fetch(`${BASE}/misik/`)).text();
  const reports = await (await fetch(`${BASE}/`)).text();
  for (const html of [misik, reports]) {
    assert.ok(html.includes("서버에 연결하지 못했습니다"));
    assert.ok(html.includes("서버 응답을 읽지 못했습니다"));
    assert.ok(html.includes("Array.isArray"));
  }
  assert.ok(misik.includes("AI 추천을 받지 못했어요"), "recommended가 없을 때의 안내");
  assert.ok(misik.includes("Array.isArray(out?.recommended)"));
});

test("글꼴은 캐시 헤더와 함께 오고, 화면(html)은 캐시 헤더가 없다", async () => {
  const font = await fetch(`${BASE}/fonts/Galmuri11.woff2`);
  assert.equal(font.status, 200);
  assert.match(font.headers.get("cache-control"), /max-age=\d+/);
  assert.equal((await fetch(`${BASE}/misik/`)).headers.get("cache-control"), null);
});
