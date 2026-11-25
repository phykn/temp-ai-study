// tests/fault.test.js — 고장 주입 4종 · docs/SPEC.md 9.4절 AC-11
// 고장마다 서버를 AI_FAULT를 넣어 따로 켠다 (키는 비움 → 진짜 AI는 안 부름). 실행: npm test
// 503만 보면 "키가 없어서 503"과 구별이 안 되므로, 서버 터미널(stderr)에 찍힌 이유도 확인한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let nextPort = 22000 + Math.floor(Math.random() * 900);

// AI_FAULT를 넣어 서버를 켜고, 터미널 출력을 모아 둔다
async function startServer(fault) {
  const port = nextPort++;
  const env = { ...process.env, PORT: String(port), DB_MODE: "memory", ANTHROPIC_API_KEY: "", AI_FAULT: fault, AI_TIMEOUT_MS: "300" };
  const proc = spawn(process.execPath, ["server.js"], { cwd: ROOT, env });
  const log = { out: "", err: "" };
  proc.stdout.on("data", (d) => (log.out += d));
  proc.stderr.on("data", (d) => (log.err += d));
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${base}/api/me`);
      return { base, log, stop: () => proc.kill() };
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  proc.kill();
  throw new Error("5초 안에 서버가 켜지지 않았습니다");
}

async function call(base, method, url, body) {
  const res = await fetch(base + url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

// 고장 이름 → 서버 터미널에 남아야 하는 이유
const FAULTS = {
  auth: /Claude API 401/,
  slow: /timeout/i,
  empty: /AI 답이 비어 있습니다/,
  refusal: /refusal/,
};

for (const [fault, reason] of Object.entries(FAULTS)) {
  test(`고장 주입 ${fault}: AI는 503이어도 신고는 201`, async () => {
    const s = await startServer(fault);
    try {
      assert.match(s.log.out, new RegExp(`고장 주입 중: ${fault}`), "켤 때 터미널에 경고가 찍힘");

      const created = await call(s.base, "POST", "/api/reports", { title: "2층 천장에서 물이 샙니다", location: "사무동 2F 복도", reporter_name: "김OO" });
      assert.equal(created.status, 201, "AI가 고장 나도 신고는 접수");

      const t0 = Date.now();
      const classify = await call(s.base, "POST", `/api/reports/${created.data.id}/classify`);
      const took = Date.now() - t0;
      assert.equal(classify.status, 503);
      assert.equal(classify.data.error.code, "AI_UNAVAILABLE");
      if (fault === "slow") assert.ok(took >= 250 && took < 3000, `AI_TIMEOUT_MS(300) 안팎에서 포기해야 함: ${took}ms`);

      const recommend = await call(s.base, "POST", `/api/reports/${created.data.id}/recommend`);
      assert.equal(recommend.status, 503);
      const draft = await call(s.base, "POST", `/api/reports/${created.data.id}/notice/draft`);
      assert.equal(draft.status, 503, "안내문 초안도 시작 전에 503");
      const misik = await call(s.base, "POST", "/api/menus/filter", { condition: "해장" });
      assert.equal(misik.status, 503, "미식 AI 추천도 503");

      const after = (await call(s.base, "GET", "/api/reports")).data.find((r) => r.id === created.data.id);
      assert.equal(after.severity, "none");
      assert.equal(after.status, "open");
      assert.equal(after.ai_severity, "");

      assert.match(s.log.err, reason, `서버 터미널에 '${fault}' 고장 이유가 남아야 함`);
    } finally {
      s.stop();
    }
  });
}
