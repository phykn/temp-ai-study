// tests/ai.test.js — 신고 AI 분류 + [승인] · 담당 추천 · 도구 · 안내문 · docs/SPEC.md 9절 AC-06 ~ AC-10
// 서버를 DB_MODE=memory로 켜고 ANTHROPIC_API_KEY를 비워 진짜 AI는 부르지 않는다. 실행: npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkAiResult, checkRecommendResult, safetyLine } from "../src/ai.js";
import { getHandlerLoad, getAssetHistory } from "../src/tools.js";
import { readFileSync } from "node:fs";

const SEED = JSON.parse(readFileSync(new URL("../data/seed.json", import.meta.url), "utf-8"));

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 21000 + Math.floor(Math.random() * 1000);
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

test("AC-06 AI가 멈추면 분류는 503 · 신고는 미분류 그대로", async () => {
  const { data: report } = await call("POST", "/api/reports", { title: "2층 천장에서 물이 샙니다", location: "사무동 2F 복도", reporter_name: "김OO" });
  assert.equal(report.ai_severity, "", "새 신고는 AI 제안이 비어 있음");
  const r = await call("POST", `/api/reports/${report.id}/classify`);
  assert.equal(r.status, 503);
  assert.equal(r.data.error.code, "AI_UNAVAILABLE");
  const after = (await call("GET", "/api/reports")).data.find((x) => x.id === report.id);
  assert.equal(after.severity, "none", "AI가 멈춰도 신고는 남고 미분류 그대로");
  assert.equal((await call("POST", "/api/reports/9999/classify")).status, 404);
});

test("AC-06 AI 답 검사: 목록 밖 심각도 · 유형이면 버린다", () => {
  assert.deepEqual(checkAiResult({ severity: "urgent", category: "BUILDING", reason: " 물이 새면 미끄러져 다칠 수 있음 " }), {
    ai_severity: "urgent",
    ai_category: "BUILDING",
    ai_reason: "물이 새면 미끄러져 다칠 수 있음",
  });
  assert.equal(checkAiResult({ severity: "매우 긴급", category: "BUILDING", reason: "누수" }), null);
  assert.equal(checkAiResult({ severity: "urgent", category: "PLUMBING", reason: "누수" }), null);
  assert.equal(checkAiResult({ severity: "none", category: "BUILDING", reason: "누수" }), null, "AI는 미분류를 제안하지 않음");
  assert.equal(checkAiResult({ severity: "urgent", category: "BUILDING", reason: " " }), null, "이유 없는 제안은 버림");
  assert.equal(checkAiResult("이상한 답"), null);
});

test("AC-07 제안이 없으면 승인 409 · 없는 번호 404", async () => {
  const { data: report } = await call("POST", "/api/reports", { title: "형광등 깜빡임", location: "사무동 3F", reporter_name: "박OO" });
  const r = await call("POST", `/api/reports/${report.id}/approve`);
  assert.equal(r.status, 409);
  assert.equal(r.data.error.code, "CONFLICT");
  assert.equal((await call("POST", "/api/reports/9999/approve")).status, 404);
});

test("AC-08 AI가 멈추면 담당 추천 503 · 상태는 접수 그대로", async () => {
  const before = (await call("GET", "/api/reports")).data.find((x) => x.status === "open");
  const r = await call("POST", `/api/reports/${before.id}/recommend`);
  assert.equal(r.status, 503);
  assert.equal(r.data.error.code, "AI_UNAVAILABLE");
  const after = (await call("GET", "/api/reports")).data.find((x) => x.id === before.id);
  assert.equal(after.status, "open");
  assert.equal(after.assignee, "");
  assert.equal((await call("POST", "/api/reports/9999/recommend")).status, 404);
});

test("AC-08 담당 추천 답 검사: 4명 밖 · 빈 이유 · 설비 판단이 안 맞으면 버린다", () => {
  const ok = { assignee: "정사원", reason: " IT기기 담당 ", asset_advice: "교체 검토" };
  assert.deepEqual(checkRecommendResult(ok, true), { assignee: "정사원", reason: "IT기기 담당", asset_advice: "교체 검토" });
  assert.equal(checkRecommendResult({ ...ok, assignee: "김부장" }, true), null);
  assert.equal(checkRecommendResult({ ...ok, reason: " " }, true), null);
  assert.equal(checkRecommendResult({ ...ok, asset_advice: "폐기" }, true), null);
  assert.equal(checkRecommendResult(ok, false), null, "설비 번호가 없는데 설비 판단을 냄");
  assert.equal(checkRecommendResult({ ...ok, asset_advice: "" }, true), null, "설비 번호가 있는데 판단이 빠짐");
});

test("AC-08 get_handler_load는 담당자별 '배정' 신고 수를 센다", () => {
  assert.deepEqual(
    getHandlerLoad(SEED).map((h) => [h.name, h.field, h.assigned]),
    [["이주임", "전기", 2], ["최대리", "공조", 3], ["정사원", "IT기기", 4], ["한과장", "건물", 1]]
  );
});

test("AC-09 get_asset_history: 최근 7일은 신고 접수 시각 기준 · PR-3F-02는 3건", () => {
  const stuck = SEED.find((r) => r.id === 23); // 3층 복합기가 또 멈췄어요 (11/23)
  const h = getAssetHistory("PR-3F-02", stuck, SEED);
  assert.equal(h.found, true);
  assert.equal(h.recent_7days, 3, "11/18 토너 · 11/20 용지 걸림 · 11/23 멈춤");
  assert.equal(h.base_time, stuck.created_at);
  const first = SEED.find((r) => r.id === 8); // 같은 설비의 11/18 신고 → 그때까지는 1건
  assert.equal(getAssetHistory("PR-3F-02", first, SEED).recent_7days, 1);
  assert.equal(getAssetHistory("XX-00", stuck, SEED).found, false);
});

test("AC-10 AI가 멈추면 안내문 초안 503 · 아무것도 저장 안 됨", async () => {
  const target = (await call("GET", "/api/reports")).data.find((x) => x.severity === "urgent");
  const r = await call("POST", `/api/reports/${target.id}/notice/draft`);
  assert.equal(r.status, 503);
  assert.equal(r.data.error.code, "AI_UNAVAILABLE");
  const after = (await call("GET", "/api/reports")).data.find((x) => x.id === target.id);
  assert.equal(after.notice, "", "초안을 받으려 한 것만으로는 저장되지 않음");
  assert.equal((await call("POST", "/api/reports/9999/notice/draft")).status, 404);
});

test("AC-10 안내문 보내기 200 · 빈칸 · 1000자 넘으면 400 · 없는 번호 404", async () => {
  const target = (await call("GET", "/api/reports")).data[0];
  const r = await call("POST", `/api/reports/${target.id}/notice`, { notice: "  2층 복도 끝은 돌아가 주세요.  " });
  assert.equal(r.status, 200);
  assert.equal(r.data.notice, "2층 복도 끝은 돌아가 주세요.", "앞뒤 빈칸은 빼고 저장");
  const empty = await call("POST", `/api/reports/${target.id}/notice`, { notice: " " });
  assert.equal(empty.status, 400);
  assert.equal(empty.data.error.message, "안내문을 입력하세요");
  assert.equal((await call("POST", `/api/reports/${target.id}/notice`, { notice: "가".repeat(1001) })).status, 400);
  assert.equal((await call("POST", "/api/reports/9999/notice", { notice: "안내" })).status, 404);
});

test("AC-10 안전 문구는 긴급일 때만 서버 고정 문장", () => {
  assert.match(safetyLine("urgent"), /^\[안전\] 해당 장소에 가까이 가지 마시고/);
  for (const s of ["warning", "info", "none"]) assert.equal(safetyLine(s), "");
});
