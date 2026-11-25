// tests/misik.test.js — 회식 메뉴 가챠(미식) · docs/SPEC_MISIK.md의 AC-01~08
// api.test.js처럼 서버를 DB_MODE=memory로 직접 켜서 진짜 주소로 부탁해 본다. 실행: npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkRecommended } from "../src/ai.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 19000 + Math.floor(Math.random() * 1000);
const BASE = `http://localhost:${PORT}`;
let server;

before(async () => {
  // ANTHROPIC_API_KEY를 비워 진짜 AI는 부르지 않는다 (AI가 멈춘 경우를 확인)
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
    redirect: "manual",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: res.status, data, headers: res.headers };
}
const menuNamed = async (name) => (await call("GET", "/api/menus")).data.find((m) => m.name === name);

// 테스트는 위에서부터 차례로 돈다 (메뉴를 더하고 지우므로 순서가 중요)
test("AC-01 메뉴 100개가 등급 · 좋아요 · 싫어요 수와 함께 오고, 등급 가중치는 R 6 · SR 3 · SSR 1", async () => {
  const menus = (await call("GET", "/api/menus")).data;
  assert.equal(menus.length, 100);
  assert.deepEqual(Object.keys(menus[0]).sort(), ["created_at", "dislikes", "grade", "id", "likes", "name"]);
  const grades = (await call("GET", "/api/grades")).data;
  assert.deepEqual(grades.map((g) => [g.grade, g.weight]), [["R", 6], ["SR", 3], ["SSR", 1]]);
});

test("AC-02 뽑기는 서버가 하고 기록이 남는다 · 최근 기록은 최신순 (AC-05)", async () => {
  const r = await call("POST", "/api/draws");
  assert.equal(r.status, 201);
  assert.equal(r.data.draw.menu_name, r.data.menu.name);
  const second = await call("POST", "/api/draws");
  const list = (await call("GET", "/api/draws")).data;
  assert.equal(list.length, 2);
  assert.equal(list[0].id, second.data.draw.id, "가장 최근 뽑기가 맨 앞");
  assert.equal((await call("GET", "/api/draws?limit=1")).data.length, 1);
});

test("AC-03 메뉴 추가 201 · 같은 이름 409 · 빈 이름 · 없는 등급 400", async () => {
  const r = await call("POST", "/api/menus", { name: "  탕후루  ", grade: "SR" });
  assert.equal(r.status, 201);
  assert.equal(r.data.name, "탕후루", "앞뒤 빈칸은 빼고 저장");
  const dup = await call("POST", "/api/menus", { name: "탕후루", grade: "R" });
  assert.equal(dup.status, 409);
  assert.equal(dup.data.error.message, "이미 있는 메뉴입니다");
  const empty = await call("POST", "/api/menus", { name: " ", grade: "R" });
  assert.equal(empty.status, 400);
  assert.equal(empty.data.error.message, "메뉴 이름을 입력하세요");
  assert.equal((await call("POST", "/api/menus", { name: "라면", grade: "UR" })).status, 400);
  assert.equal((await call("POST", "/api/menus", { name: "가".repeat(31), grade: "R" })).status, 400);
});

test("AC-04 좋아요 · 싫어요는 누를 때마다 1씩 오르고 목록에도 남는다", async () => {
  const { id } = await menuNamed("치킨");
  await call("POST", `/api/menus/${id}/vote`, { value: 1 });
  await call("POST", `/api/menus/${id}/vote`, { value: 1 });
  const r = await call("POST", `/api/menus/${id}/vote`, { value: -1 });
  assert.deepEqual(r.data, { menu_id: id, likes: 2, dislikes: 1 });
  const menu = await menuNamed("치킨");
  assert.equal(menu.likes, 2);
  assert.equal(menu.dislikes, 1);
  assert.equal((await call("POST", `/api/menus/${id}/vote`, { value: 5 })).status, 400);
  assert.equal((await call("POST", "/api/menus/999/vote", { value: 1 })).status, 404);
});

test("AC-08 AI 추천: 조건이 비거나 200자를 넘으면 400 · AI가 멈추면 503 AI_UNAVAILABLE", async () => {
  assert.equal((await call("POST", "/api/menus/filter", { condition: "  " })).status, 400);
  assert.equal((await call("POST", "/api/menus/filter", { condition: "가".repeat(201) })).status, 400);
  const r = await call("POST", "/api/menus/filter", { condition: "갑각류 알레르기" });
  assert.equal(r.status, 503);
  assert.equal(r.data.error.code, "AI_UNAVAILABLE");
});

test("AC-08 뽑기는 추천 메뉴(only) 중에서만 · 추천 0개면 409 · 이상한 only는 400", async () => {
  const menus = (await call("GET", "/api/menus")).data;
  const raw = menus.find((m) => m.name === "회");
  const chicken = menus.find((m) => m.name === "치킨");
  for (let i = 0; i < 5; i++) {
    const r = await call("POST", "/api/draws", { only: [raw.id] });
    assert.equal(r.data.menu.id, raw.id, "추천이 '회' 하나뿐");
  }
  const two = await call("POST", "/api/draws", { only: [raw.id, chicken.id] });
  assert.ok([raw.id, chicken.id].includes(two.data.menu.id));
  assert.equal((await call("POST", "/api/draws", { only: [] })).status, 409);
  assert.equal((await call("POST", "/api/draws", { only: [99999] })).status, 409);
  assert.equal((await call("POST", "/api/draws", { only: "1,2" })).status, 400);
});

test("AC-08 AI 답 검사: 목록에 없는 번호 · 같은 번호 두 번은 버리고, 이유가 없으면 기본 문장", () => {
  const menus = [{ id: 1, name: "회" }, { id: 2, name: "치킨" }];
  const raw = [{ id: 1, reason: " 날것 " }, { id: 1, reason: "또" }, { id: 99, reason: "없는 메뉴" }, { id: 2 }];
  assert.deepEqual(checkRecommended(raw, menus), [
    { id: 1, name: "회", reason: "날것" },
    { id: 2, name: "치킨", reason: "조건에 맞음" },
  ]);
  assert.deepEqual(checkRecommended("이상한 답", menus), []);
});

test("AC-06 메뉴 삭제 200 · 다시 지우면 404 · 메뉴가 0개면 뽑기 409", async () => {
  const { id } = await menuNamed("삼겹살");
  assert.equal((await call("DELETE", `/api/menus/${id}`)).status, 200);
  assert.equal((await call("DELETE", `/api/menus/${id}`)).status, 404);
  for (const m of (await call("GET", "/api/menus")).data) await call("DELETE", `/api/menus/${m.id}`);
  const r = await call("POST", "/api/draws");
  assert.equal(r.status, 409);
  assert.equal(r.data.error.code, "CONFLICT");
});

test("AC-07 자동 로그인: 로그인 없이 쓰고 '관리자'로 기록된다 · 화면은 /misik/", async () => {
  assert.deepEqual((await call("GET", "/api/me")).data, { name: "관리자" });
  await call("POST", "/api/menus", { name: "냉면", grade: "R" });
  assert.equal((await call("POST", "/api/draws")).data.draw.user_name, "관리자");
  const page = await call("GET", "/misik/");
  assert.equal(page.status, 200);
  assert.match(page.data, /회식 메뉴 가챠/);
  const redirect = await call("GET", "/misik");
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get("location"), "/misik/");
});
