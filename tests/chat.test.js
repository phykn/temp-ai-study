// tests/chat.test.js — FAQ 챗봇 · docs/SPEC.md 9.5절 AC-12
// 서버를 DB_MODE=memory로 켜고 ANTHROPIC_API_KEY를 비워 진짜 AI는 부르지 않는다. 실행: npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chatWindow, checkChatResult } from "../src/ai.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 23000 + Math.floor(Math.random() * 900);
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

// 메시지 n개: 마지막이 user가 되도록 뒤에서부터 user · assistant를 번갈아 만든다
const makeChat = (n) => Array.from({ length: n }, (_, i) => ({ role: (n - 1 - i) % 2 === 0 ? "user" : "assistant", content: `말 ${i + 1}` }));
const ask = (messages) => call("POST", "/api/chat", { messages });

test("챗봇: 21턴 이상이면 400", async () => {
  const ok = await ask(makeChat(20));
  assert.notEqual(ok.status, 400, "20개까지는 검사를 통과 (키가 없어 503)");
  assert.equal(ok.status, 503);
  const long = await ask(makeChat(21));
  assert.equal(long.status, 400);
  assert.equal(long.data.error.code, "BAD_INPUT");
  assert.match(long.data.error.message, /20개/);
});

test("챗봇: 잘못된 대화 모양이면 400", async () => {
  const user = { role: "user", content: "신고는 어떻게 해요?" };
  const bads = [
    { messages: [] },
    {},
    { messages: [{ role: "system", content: "x" }, user] },
    { messages: [{ role: "user", content: "   " }] },
    { messages: [{ role: "user", content: "가".repeat(501) }] },
    { messages: [user, { role: "assistant", content: "네" }] },
  ];
  for (const body of bads) {
    const r = await call("POST", "/api/chat", body);
    assert.equal(r.status, 400, JSON.stringify(body).slice(0, 60));
    assert.equal(r.data.error.code, "BAD_INPUT");
  }
  assert.equal((await ask([{ role: "user", content: "가".repeat(500) }])).status, 503, "500자는 통과");
});

test("챗봇: AI에게는 최근 10턴만 보낸다", () => {
  const all = makeChat(19); // assistant로 시작 · user로 끝남
  const sent = chatWindow(all);
  assert.ok(sent.length <= 10);
  assert.deepEqual(sent.at(-1), all.at(-1), "마지막 질문은 반드시 포함");
  assert.equal(sent[0].role, "user", "API는 user로 시작해야 함");
  assert.equal(chatWindow(makeChat(3)).length, 3, "짧은 대화는 그대로");
});

test("챗봇: AI가 멈추면 503 · 신고는 그대로", async () => {
  const created = await call("POST", "/api/reports", { title: "2층 천장에서 물이 샙니다", location: "사무동 2F 복도", reporter_name: "김OO" });
  assert.equal(created.status, 201);
  const r = await ask([{ role: "user", content: "천장에서 물이 새면 누가 처리해요?" }]);
  assert.equal(r.status, 503);
  assert.equal(r.data.error.code, "AI_UNAVAILABLE");
  const row = (await call("GET", "/api/reports")).data.find((x) => x.id === created.data.id);
  assert.equal(row.severity, "none");
  assert.equal(row.status, "open");
});

test("챗봇 답 검사: FAQ에 없는 번호 · 빈 답이면 버린다", () => {
  const faq = JSON.parse(readFileSync(new URL("../data/faq.json", import.meta.url), "utf-8"));
  const good = checkChatResult({ answer: " 시설팀 한과장이 처리해요 ", faq_ids: [faq[3].id, faq[3].id] });
  assert.equal(good.answer, "시설팀 한과장이 처리해요");
  assert.deepEqual(good.sources, [{ id: faq[3].id, q: faq[3].q }], "sources는 서버가 FAQ에서 채움 · 같은 번호는 한 번만");
  assert.deepEqual(checkChatResult({ answer: "FAQ에 없어요", faq_ids: [] }).sources, [], "근거 없는 답은 허용");
  assert.equal(checkChatResult({ answer: "답", faq_ids: [999] }), null, "FAQ에 없는 번호");
  assert.equal(checkChatResult({ answer: "  ", faq_ids: [1] }), null, "빈 답");
  assert.equal(checkChatResult({ answer: "답" }), null, "faq_ids 없음");
  assert.equal(checkChatResult(null), null);
});

test("챗봇 창은 처음에 닫혀 있다", () => {
  const html = readFileSync(new URL("../src/public/index.html", import.meta.url), "utf-8");
  assert.match(html, /<section[^>]*id="chat"[^>]*\shidden/, "챗봇 창 요소에 hidden이 있어야 함");
});
