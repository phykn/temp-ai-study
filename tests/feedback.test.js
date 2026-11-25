// tests/feedback.test.js — M2 현장 피드백 FB-1 · docs/SPEC.md 10.5절 AC-13 (판단 주체)
// 서버를 DB_MODE=memory로 켜고 ANTHROPIC_API_KEY를 비워 진짜 AI는 부르지 않는다. 실행: npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { approveFields } from "../src/judge.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 25000 + Math.floor(Math.random() * 900);
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

async function call(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

test("AC-13 새 신고와 시드는 판단 칸이 비어 있다", async () => {
  const made = await call("POST", "/api/reports", { title: "복도 등이 나갔어요", location: "사무동 2F", reporter_name: "김OO" });
  assert.equal(made.data.severity_by, "");
  const list = (await call("GET", "/api/reports")).data;
  assert.ok(list.every((r) => r.severity_by === ""), "시드는 판단 주체를 모름(빈칸)");
});

test("AC-13 사람이 심각도를 고르면 판단은 시설팀 직접", async () => {
  const r = await call("PATCH", "/api/reports/2", { severity: "info" });
  assert.equal(r.status, 200);
  assert.equal(r.data.severity, "info");
  assert.equal(r.data.severity_by, "human");
  const after = (await call("GET", "/api/reports")).data.find((x) => x.id === 2);
  assert.equal(after.severity_by, "human", "목록에도 남음");
});

test("AC-13 [승인]하면 판단은 AI 제안 승인", () => {
  const out = approveFields({ severity: "none", ai_severity: "urgent", ai_category: "BUILDING" });
  assert.deepEqual(out, { fields: { severity: "urgent", category: "BUILDING", severity_by: "ai" } });
  assert.deepEqual(approveFields({ severity: "none", ai_severity: "" }), { error: "no_suggestion" });
});

test("AC-13 이미 사람이 정한 신고는 [승인]으로 덮어쓰지 않는다", () => {
  // 사람이 심각도를 고른 뒤 승인 주소를 직접 부르면 사람 판단이 AI 제안으로 바뀌고 판단 주체도 ai가 됐음 (뚫기에서 찾음)
  const human = { severity: "info", severity_by: "human", ai_severity: "urgent", ai_category: "BUILDING" };
  assert.deepEqual(approveFields(human), { error: "decided" });
});

test("AC-13 판단 주체는 화면이 보낼 수 없다(400)", async () => {
  for (const body of [{ severity: "urgent", severity_by: "ai" }, { severity_by: "ai" }, { assignee: "한과장", severity_by: "human" }]) {
    const r = await call("PATCH", "/api/reports/3", body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(r.data.error.code, "BAD_INPUT");
  }
  const row = (await call("GET", "/api/reports")).data.find((x) => x.id === 3);
  assert.equal(row.severity_by, "", "거절된 요청은 아무것도 바꾸지 않음");
  assert.equal((await call("POST", "/api/reports/3/approve")).status, 409, "AI 제안이 없으면 승인 409 그대로");
});

test("AC-13 카드에 판단 주체가 보인다", () => {
  const html = readFileSync(new URL("../src/public/index.html", import.meta.url), "utf-8");
  assert.match(html, /판단: AI 제안 승인/);
  assert.match(html, /판단: 시설팀 직접/);
});
