// tests/usage.test.js — 1-7 usage 표 시연 · docs/SPEC.md 9.6절 AC-U1
// 진짜 AI는 부르지 않는다 (표 만드는 함수와 요청 모양만 확인). 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBody } from "../src/ai.js";
import { pickUsage, sumUsage, sameClass, pickReports, makeReference, formatUsageTable, formatCompareTable } from "../eval/usage_demo.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = { system: "규칙", messages: [{ role: "user", content: "질문" }], schema: { type: "object" }, maxTokens: 100 };

test("usage 시연 요청: system에 캐시 표시 · effort가 바뀐다", () => {
  const plain = buildBody(base);
  assert.equal(plain.system, "규칙", "기본은 지금처럼 글자 그대로");
  assert.equal(plain.output_config.effort, "low", "기본 effort는 low");

  const demo = buildBody({ ...base, cacheSystem: true, effort: "high" });
  assert.deepEqual(demo.system, [{ type: "text", text: "규칙", cache_control: { type: "ephemeral" } }]);
  assert.equal(demo.output_config.effort, "high");
  assert.equal(demo.output_config.format.type, "json_schema");
});

test("usage 표: 캐시 쓰기 · 읽기를 더해 합계를 낸다", () => {
  const rows = [
    { n: 1, effort: "high", ...pickUsage({ input_tokens: 10, cache_creation_input_tokens: 900, cache_read_input_tokens: 0, output_tokens: 50 }) },
    { n: 2, effort: "low", ...pickUsage({ input_tokens: 12, cache_read_input_tokens: 900, output_tokens: 20 }) },
    { n: 3, effort: "low", ...pickUsage(undefined) },
  ];
  assert.deepEqual(sumUsage(rows), { input: 22, cacheWrite: 900, cacheRead: 900, output: 70 });
  const table = formatUsageTable(rows);
  assert.match(table, /합계\s+22\s+900\s+900\s+70/);
});

test("분류 비교: 심각도와 유형이 둘 다 같아야 같음", () => {
  const a = { ai_severity: "urgent", ai_category: "BUILDING", ai_reason: "다칠 수 있음" };
  assert.ok(sameClass(a, { ...a, ai_reason: "다른 문장" }), "이유 문장은 달라도 같음");
  assert.ok(!sameClass(a, { ...a, ai_severity: "warning" }));
  assert.ok(!sameClass(a, { ...a, ai_category: "HVAC" }));
  assert.ok(!sameClass(a, null), "검사에서 버려진 답은 같지 않음");
  const table = formatCompareTable([{ title: "t1", high: a, low: a }, { title: "t2", high: a, low: null }]);
  assert.match(table, /같음 1\/2/);
});

test("usage 시연: 시연 신고와 참고 사례는 겹치지 않고, 참고 글은 늘 똑같다", () => {
  const all = JSON.parse(readFileSync(new URL("../data/seed.json", import.meta.url), "utf-8"));
  const { demo, rest } = pickReports(all);
  assert.equal(demo.length, 8);
  assert.ok(demo.every((r) => r.severity !== "none"));
  assert.ok(rest.every((r) => !demo.includes(r)));
  assert.equal(makeReference(rest), makeReference(rest), "캐시가 읽히려면 호출마다 같아야 함");
});

test("키가 없으면 usage 시연은 한국어 안내로 끝난다", () => {
  const env = { ...process.env, ANTHROPIC_API_KEY: "" };
  delete env.AI_FAULT; // 바깥 셸 값이 따라 들어오지 않게
  delete env.AI_TIMEOUT_MS;
  const r = spawnSync(process.execPath, ["eval/usage_demo.js"], { cwd: ROOT, env, encoding: "utf-8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /AI를 부르지 못했습니다/);
  assert.doesNotMatch(r.stderr, /\n\s+at /, "stack은 찍지 않음");
});
