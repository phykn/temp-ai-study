// eval/run_eval.js — 평가셋 정확도 표 (docs/SPEC.md 10.1절 · AC-E1). 서버와 화면은 쓰지 않는 강사용 스크립트
// 서버를 memory 모드로 잠깐 켜고(진짜 DB는 안 건드림), golden.json의 글로 신고를 만들어 [AI 분류] API로 채점한다 (진짜 Claude를 부름 · 비용이 듦)
// 실행(사내망): node --use-env-proxy --use-system-ca --env-file=.env eval/run_eval.js
// 실행(사내망 밖): node --env-file=.env eval/run_eval.js
import { spawn } from "node:child_process";
import http from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export const HOLD_LIMIT = 3; // 보류는 10건 중 3건까지 (SPEC 10.2)
const NAME = { urgent: "긴급", warning: "주의", info: "정보", none: "미분류" };

// 채점·표 만들기에 쓰는 순수 함수들 (테스트에서 직접 부름) ──

// 한 건 채점. res: classify API 응답 { status, data } · 503 등 실패면 AI는 미분류로 보고 틀린 것으로 셈
export function scoreRow(item, res) {
  const ok = res.status === 200;
  const ai = ok ? res.data.ai_severity : "none";
  return { id: item.id, title: item.title, expected: item.expected, ai, correct: ai === item.expected, hold: ok && res.data.ai_hold === 1 };
}

// 요약: 정확도 · 보류 수 · 틀린 건 중 보류로 걸러진 수 · 보류를 빼고 본 정확도
export function summarize(rows, limit = HOLD_LIMIT) {
  const holds = rows.filter((r) => r.hold);
  const rest = rows.filter((r) => !r.hold);
  return {
    total: rows.length,
    correct: rows.filter((r) => r.correct).length,
    holds: holds.length,
    holdOver: holds.length > limit,
    wrong: rows.filter((r) => !r.correct).length,
    wrongHeld: holds.filter((r) => !r.correct).length,
    restTotal: rest.length,
    restCorrect: rest.filter((r) => r.correct).length,
  };
}

const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function formatEvalTable(rows) {
  const lines = ["번호  제목                  정답  AI    맞음  보류"];
  for (const r of rows) lines.push(`${String(r.id).padStart(4)}  ${cut(r.title, 14).padEnd(16)}  ${NAME[r.expected].padEnd(3)}  ${NAME[r.ai].padEnd(3)}  ${r.correct ? "○" : "×"}     ${r.hold ? "보류" : "-"}`);
  const s = summarize(rows);
  lines.push("");
  lines.push(`정확도 ${s.correct}/${s.total}`);
  lines.push(`보류 ${s.holds}건 (상한 ${HOLD_LIMIT}건)${s.holdOver ? " → 보류 상한 초과" : " → 상한 이하"}`);
  lines.push(`틀린 ${s.wrong}건 중 보류로 걸러진 건 ${s.wrongHeld}건`);
  lines.push(`보류를 빼고 본 정확도 ${s.restCorrect}/${s.restTotal}`);
  return lines.join("\n");
}

// 실행 ──

// 내 서버에 요청 보내기. --use-env-proxy가 있으면 fetch와 기본 http가 localhost도 회사 프록시로 보내 버려서, 새 Agent를 따로 만들어 쓴다
const localAgent = new http.Agent();
function call(base, method, url, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(base + url, { method, headers: body ? { "Content-Type": "application/json" } : {}, timeout: 60_000, agent: localAgent }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString("utf-8")) });
        } catch {
          reject(new Error(`서버 응답을 읽지 못했습니다 (${method} ${url})`));
        }
      });
    });
    req.on("timeout", () => req.destroy(new Error(`서버가 60초 안에 답하지 않았습니다 (${method} ${url})`)));
    req.on("error", reject);
    req.end(body && JSON.stringify(body));
  });
}

// 서버 켜기: 켜진 주소를 돌려줌. DB_MODE=memory는 spawn이 주고, --env-file은 이미 있는 값을 덮어쓰지 않으므로 .env가 바꾸지 못함
async function startServer() {
  const port = 19500 + Math.floor(Math.random() * 400);
  const env = { ...process.env, PORT: String(port), DB_MODE: "memory" };
  delete env.AI_FAULT; // 고장 주입 · 짧은 대기 시간이 평가에 섞이지 않게
  delete env.AI_TIMEOUT_MS;
  const child = spawn(process.execPath, [...process.execArgv, "server.js"], { cwd: ROOT, env, stdio: "ignore" });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 50; i++) {
    try {
      await call(base, "GET", "/api/me");
      return { base, stop: () => child.kill() };
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  child.kill();
  throw new Error("5초 안에 서버가 켜지지 않았습니다");
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY가 없습니다. --env-file=.env를 붙여 실행하세요 (진짜 Claude를 부르는 평가입니다)");
  const { items } = JSON.parse(readFileSync(new URL("./golden.json", import.meta.url), "utf-8"));
  const server = await startServer();
  try {
    const rows = [];
    for (const item of items) {
      // 시드 번호에 묶이지 않게, 글로 신고를 새로 만들고 새 번호로 분류한다
      const { title, location, building, asset_id, body } = item;
      const made = await call(server.base, "POST", "/api/reports", { title, location, building, asset_id, body, reporter_name: "평가" });
      rows.push(scoreRow(item, await call(server.base, "POST", `/api/reports/${made.data.id}/classify`)));
    }
    console.log(`평가셋 ${items.length}건 (진짜 Claude로 분류)\n`);
    console.log(formatEvalTable(rows));
  } finally {
    server.stop();
  }
}

// 불러오기만 할 때(테스트)는 돌지 않고, 직접 실행할 때만 돈다
if (import.meta.main) {
  main().catch((err) => {
    console.error(`평가를 끝내지 못했습니다: ${err.message}`); // stack은 찍지 않음
    process.exit(1);
  });
}
