// eval/usage_demo.js — 1-7 usage 표 시연 (docs/SPEC.md 9.6절 · AC-U1). 서버와 화면은 쓰지 않는 강사용 스크립트
// 신고 몇 건을 effort high → low 순서로 분류해서 ① 토큰 사용량 표 ② 분류 비교표를 찍는다 (진짜 Claude를 부름 · 비용이 듦)
// 실행(사내망): node --use-env-proxy --use-system-ca --env-file=.env eval/usage_demo.js
// 실행(사내망 밖): node --env-file=.env eval/usage_demo.js
import { readFileSync } from "node:fs";
import { askReportClassUsage, checkAiResult, AiError } from "../src/ai.js";

const PER_SEVERITY = { urgent: 2, warning: 3, info: 3 }; // 시연에 쓸 신고 수 (심각도가 정해진 것 중 앞에서부터)
const EFFORTS = ["high", "low"]; // effort를 바꾸면 캐시가 깨질 수 있어서 high를 다 돌린 뒤 low를 다 돌린다

// 표 만들기에 쓰는 순수 함수들 (테스트에서 직접 부름) ──

// usage 한 줄 → 우리가 보는 네 칸 (usage가 없으면 0)
export function pickUsage(usage) {
  return {
    input: usage?.input_tokens ?? 0,
    cacheWrite: usage?.cache_creation_input_tokens ?? 0,
    cacheRead: usage?.cache_read_input_tokens ?? 0,
    output: usage?.output_tokens ?? 0,
  };
}

// 여러 줄의 합계
export function sumUsage(rows) {
  const total = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
  for (const r of rows) for (const k of Object.keys(total)) total[k] += r[k];
  return total;
}

// 심각도와 유형이 둘 다 같아야 같은 분류 (이유 문장은 달라도 됨)
export function sameClass(a, b) {
  return Boolean(a && b) && a.ai_severity === b.ai_severity && a.ai_category === b.ai_category;
}

const pad = (v, n) => String(v).padStart(n);
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

// ① usage 표. rows: [{ n, effort, input, cacheWrite, cacheRead, output }]
export function formatUsageTable(rows) {
  const lines = ["호출  effort  input  캐시쓰기  캐시읽기  output"];
  for (const r of rows) lines.push(`${pad(r.n, 4)}  ${r.effort.padEnd(6)}  ${pad(r.input, 5)}  ${pad(r.cacheWrite, 8)}  ${pad(r.cacheRead, 8)}  ${pad(r.output, 6)}`);
  const t = sumUsage(rows);
  lines.push(`합계  ${"".padEnd(6)}  ${pad(t.input, 5)}  ${pad(t.cacheWrite, 8)}  ${pad(t.cacheRead, 8)}  ${pad(t.output, 6)}`);
  return lines.join("\n");
}

// ② 분류 비교표. pairs: [{ title, high, low }] (high · low는 checkAiResult를 지난 값 또는 null)
export function formatCompareTable(pairs) {
  const show = (c) => (c ? `${c.ai_severity} · ${c.ai_category}` : "(없음)");
  const lines = ["신고                              high                  low                   같음"];
  for (const p of pairs) lines.push(`${cut(p.title, 16).padEnd(30)}  ${show(p.high).padEnd(20)}  ${show(p.low).padEnd(20)}  ${sameClass(p.high, p.low) ? "○" : "×"}`);
  lines.push(`같음 ${pairs.filter((p) => sameClass(p.high, p.low)).length}/${pairs.length}`);
  return lines.join("\n");
}

// 시연에 쓸 신고 고르기: 심각도가 정해진 신고 중 시연 건 + 나머지는 참고 사례 (정답이 참고에 새지 않게 갈라 둠)
export function pickReports(all) {
  const left = { ...PER_SEVERITY };
  const demo = [];
  const rest = [];
  for (const r of all.filter((x) => x.severity !== "none")) {
    if (left[r.severity] > 0) {
      left[r.severity]--;
      demo.push(r);
    } else rest.push(r);
  }
  return { demo, rest };
}

// 참고 사례 글: 시연과 상관없는 신고의 심각도 · 유형 모음. 모든 호출에 똑같이 들어가야 캐시가 읽힘 (시간 · 무작위 금지)
export function makeReference(rest) {
  const cases = rest.map((r) => `- ${r.title} / ${r.body} → ${r.severity} · ${r.category}`).join("\n");
  return `<examples>\n지난 신고에서 시설팀이 승인한 분류 사례다.\n${cases}\n</examples>`;
}

// 실행 ──
async function main() {
  const all = JSON.parse(readFileSync(new URL("../data/seed.json", import.meta.url), "utf-8"));
  const { demo, rest } = pickReports(all);
  const extraSystem = makeReference(rest);

  const usageRows = [];
  const results = { high: [], low: [] };
  let n = 0;
  for (const effort of EFFORTS) {
    for (const report of demo) {
      const { raw, usage } = await askReportClassUsage(report, { effort, extraSystem });
      results[effort].push(checkAiResult(raw));
      usageRows.push({ n: ++n, effort, ...pickUsage(usage) });
    }
  }

  console.log(`시연 신고 ${demo.length}건 · 참고 사례 ${rest.length}건 · 호출 ${n}번 (effort ${EFFORTS.join(" → ")})\n`);
  console.log("① 토큰 사용량\n" + formatUsageTable(usageRows) + "\n");
  console.log("② 분류 비교 (effort high vs low)\n" + formatCompareTable(demo.map((r, i) => ({ title: r.title, high: results.high[i], low: results.low[i] }))));
  const read = sumUsage(usageRows).cacheRead;
  console.log(`\n캐시 읽기 합계 ${read}토큰 → ${read > 0 ? "캐시가 걸렸어요" : "캐시 읽기가 0이에요 (확인 필요)"}`);
}

// 불러오기만 할 때(테스트)는 돌지 않고, 직접 실행할 때만 돈다
if (import.meta.main) {
  main().catch((err) => {
    console.error(err instanceof AiError ? `AI를 부르지 못했습니다: ${err.message}` : `시연이 멈췄습니다: ${err.message}`); // stack은 찍지 않음
    process.exit(1);
  });
}
