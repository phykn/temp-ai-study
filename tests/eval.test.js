// tests/eval.test.js — M2 평가셋 · 판단 보류 · 현장 수정 · docs/SPEC.md 10절 AC-E1 · AC-18 · AC-19
// 서버를 DB_MODE=memory로 켜고 ANTHROPIC_API_KEY를 비워 진짜 AI는 부르지 않는다. 실행: npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyHold, checkAiResult, FAQ } from "../src/ai.js";
import { evalCandidates } from "../src/golden.js";
import { scoreRow, summarize } from "../eval/run_eval.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 24000 + Math.floor(Math.random() * 900);
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

// AI 답(raw)을 checkAiResult → applyHold 순으로 통과시킴 (서버 classify와 같은 순서)
const hold = (raw, report) => applyHold(checkAiResult(raw), raw, report);
const answer = { severity: "warning", category: "HVAC", reason: "더워서 업무가 힘듦" };

test("AC-18 판단 보류: 보류이고 안전 단어가 있으면 긴급으로 올린다", () => {
  const report = { title: "회의실이 덥고 타는 냄새가 나요", body: "어디서 나는지는 모르겠어요." };
  const out = hold({ ...answer, needs_human: true }, report);
  assert.equal(out.ai_hold, 1);
  assert.equal(out.ai_severity, "urgent", "애매하면 높게");
  assert.equal(out.ai_category, "HVAC", "유형은 AI 제안 그대로");
  assert.equal(hold({ ...answer, needs_human: true }, { title: "회의실", body: "연기가 나는 것 같아요" }).ai_severity, "urgent", "내용의 안전 단어도 봄");
});

test("AC-18 판단 보류: 안전 단어가 없으면 AI 심각도 그대로 · needs_human이 없으면 보류 아님 · 이상한 값이면 버린다", () => {
  const calm = { title: "회의실이 좀 덥고 답답해요", body: "에어컨이 약한 것 같아요" };
  assert.deepEqual(hold({ ...answer, needs_human: true }, calm), { ai_severity: "warning", ai_category: "HVAC", ai_reason: "더워서 업무가 힘듦", ai_hold: 1 });
  assert.equal(hold(answer, calm).ai_hold, 0, "needs_human이 없으면 보류 아님");
  const smoky = { title: "타는 냄새", body: "" };
  assert.equal(hold({ ...answer, needs_human: false }, smoky).ai_severity, "warning", "보류가 아니면 안전 단어로 올리지 않음");
  for (const bad of ["yes", 1, null, "true"]) assert.equal(hold({ ...answer, needs_human: bad }, calm), null, `needs_human=${bad}`);
});

test("AC-18 보류 상한 이하: 10건 중 보류 3건까지만 통과로 본다", () => {
  const rowsWith = (n) => Array.from({ length: 10 }, (_, i) => ({ id: i, title: "t", expected: "info", ai: "info", correct: true, hold: i < n }));
  assert.equal(summarize(rowsWith(3)).holdOver, false, "3건은 상한 이하");
  assert.equal(summarize(rowsWith(4)).holdOver, true, "4건은 상한 초과");
  const s = summarize([
    { correct: true, hold: false },
    { correct: false, hold: true },
    { correct: false, hold: false },
  ]);
  assert.deepEqual([s.correct, s.holds, s.wrong, s.wrongHeld, s.restCorrect, s.restTotal], [1, 1, 2, 1, 1, 2], "틀린 건 중 보류로 걸러진 수 · 보류를 빼고 본 정확도");
});

test("AC-19 목록 밖 심각도는 400 · 사람이 정한 심각도는 200", async () => {
  for (const severity of ["very", "none", "", 1]) {
    const r = await call("PATCH", "/api/reports/1", { severity });
    assert.equal(r.status, 400, `severity=${JSON.stringify(severity)}`);
    assert.equal(r.data.error.code, "BAD_INPUT");
  }
  const ok = await call("PATCH", "/api/reports/1", { severity: "warning" });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.severity, "warning");
  assert.equal((await call("PATCH", "/api/reports/9999", { severity: "info" })).status, 404);
});

test("AC-19 평가셋 후보: 보류 건 · AI와 다르게 정한 건만 · golden.json과 같은 모양", () => {
  const base = { title: "t", location: "l", building: "office", asset_id: "", body: "b" };
  const reports = [
    { ...base, id: 1, severity: "urgent", ai_severity: "warning", ai_hold: 0 }, // AI와 다르게 정함 → 후보
    { ...base, id: 2, severity: "info", ai_severity: "info", ai_hold: 0 }, // 제안 그대로 → 제외
    { ...base, id: 3, severity: "warning", ai_severity: "urgent", ai_hold: 1 }, // 보류였던 건 → 후보
    { ...base, id: 4, severity: "urgent", ai_severity: "urgent", ai_hold: 1 }, // 보류 + 같은 값 → 후보 (보류 건은 같아도 남김)
    { ...base, id: 5, severity: "info", ai_severity: "", ai_hold: 0 }, // AI 제안 없던 건 → 제외
    { ...base, id: 6, severity: "none", ai_severity: "warning", ai_hold: 0 }, // 아직 사람이 안 정함 → 제외
  ];
  const items = evalCandidates(reports);
  assert.deepEqual(items.map((i) => i.id), [1, 3, 4]);
  assert.equal(items[0].expected, "urgent");
  assert.equal(items[0].why, "현장 수정: AI 제안 주의 → 사람 긴급");
  assert.equal(items[1].why, "판단 보류 → 사람 주의");
  const golden = JSON.parse(readFileSync(new URL("../eval/golden.json", import.meta.url), "utf-8"));
  assert.deepEqual(Object.keys(items[0]), Object.keys(golden.items[0]), "golden.json의 항목과 같은 칸");
});

test("AC-19 후보 주소는 200 { items }", async () => {
  const r = await call("GET", "/api/eval/candidates");
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { items: [] }, "시드에는 AI 제안이 없으므로 빈 목록 (사람이 정했어도 제안이 없던 건은 제외)");
});

test("AC-E1 평가 채점: 정답과 같으면 맞음 · 503이면 미분류로 틀림", () => {
  const item = { id: 21, title: "타는 냄새", expected: "urgent" };
  assert.deepEqual(scoreRow(item, { status: 200, data: { ai_severity: "urgent", ai_hold: 0 } }), { id: 21, title: "타는 냄새", expected: "urgent", ai: "urgent", correct: true, hold: false });
  assert.equal(scoreRow(item, { status: 200, data: { ai_severity: "warning", ai_hold: 1 } }).correct, false);
  assert.equal(scoreRow(item, { status: 200, data: { ai_severity: "warning", ai_hold: 1 } }).hold, true);
  const down = scoreRow(item, { status: 503, data: { error: {} } });
  assert.deepEqual([down.ai, down.correct, down.hold], ["none", false, false]);
});

test("AC-E1 키가 없으면 평가는 한국어 안내로 끝난다", () => {
  const env = { ...process.env, ANTHROPIC_API_KEY: "" };
  delete env.AI_FAULT;
  const r = spawnSync(process.execPath, ["eval/run_eval.js"], { cwd: ROOT, env, encoding: "utf-8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /평가를 끝내지 못했습니다.*ANTHROPIC_API_KEY/);
  assert.doesNotMatch(r.stderr, /\n\s+at /, "stack은 찍지 않음");
});

test("AC-12 FAQ 파일: 번호가 겹치지 않고 질문 · 답이 비어 있지 않다", () => {
  assert.ok(FAQ.length >= 1);
  assert.equal(new Set(FAQ.map((f) => f.id)).size, FAQ.length, "번호가 겹치면 sources가 엉뚱한 질문을 가리킴");
  for (const f of FAQ) assert.ok(Number.isInteger(f.id) && f.q.trim() && f.a.trim(), `FAQ ${f.id}`);
});
