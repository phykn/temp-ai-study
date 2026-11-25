// tests/api.test.js — 고정 테스트 10개 (SPEC.md 7절 AC-01~04)
// 이 파일은 고치지 않습니다. 테스트 이름이 곧 체크리스트입니다. 실행: npm test
//
// 테스트는 서버를 직접 켜서(node server.js) 진짜 주소로 부탁해 봅니다.
// 이때 DB_MODE=memory로 켜므로 진짜 DB(Supabase · SQLite)는 건드리지 않습니다.
// 그래서 AC-05 "껐다 켜도 남는다"는 테스트가 아니라 눈으로 확인합니다.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 18000 + Math.floor(Math.random() * 1000);
const BASE = `http://localhost:${PORT}`;
const RANK = { urgent: 0, warning: 1, info: 2, none: 3 };
const NAME = { urgent: "긴급", warning: "주의", info: "정보", none: "미분류" };

let server = null;
let log = "";
let notReady = null; // 서버를 못 켰으면 그 이유 (모든 테스트가 이 문장으로 실패)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tail = (s) => (s.trim() ? "\n── 서버 터미널 마지막 줄 ──\n" + s.trim().split("\n").slice(-8).join("\n") : "");

// ── 테스트 전에 서버 켜기 (최대 5초 기다림) ──
before(async () => {
  if (!existsSync(path.join(ROOT, "server.js"))) {
    notReady = "server.js가 아직 없습니다. SPEC.md 5절의 API를 만들면 하나씩 통과하기 시작합니다.";
    return;
  }
  server = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), DB_MODE: "memory" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (d) => (log += d));
  server.stderr.on("data", (d) => (log += d));
  const exited = new Promise((r) => server.once("exit", (code) => r({ code })));
  for (let i = 0; i < 50; i++) {
    const gone = await Promise.race([exited, sleep(100).then(() => null)]);
    if (gone) {
      notReady = `server.js가 켜지자마자 꺼졌습니다 (종료 코드 ${gone.code}).${tail(log)}`;
      server = null;
      return;
    }
    try {
      await fetch(`${BASE}/api/reports`);
      return; // 응답이 오면 준비 끝
    } catch {}
  }
  notReady = `5초 안에 서버가 응답하지 않았습니다. server.js가 PORT 환경변수(없으면 8080)로 켜지는지 확인하세요 (SPEC.md 5절).${tail(log)}`;
});
after(() => server?.kill());

// ── 도우미 ──
async function call(method, url, body) {
  if (notReady) assert.fail(notReady);
  const res = await fetch(BASE + url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}
function expectStatus(r, status) {
  assert.equal(r.status, status, `응답 코드가 ${status}여야 합니다. 받은 코드: ${r.status} · 받은 응답: ${JSON.stringify(r.data).slice(0, 200)}`);
}
function expectError(r, status, code) {
  expectStatus(r, status);
  assert.equal(
    r.data?.error?.code,
    code,
    `실패 응답은 { "error": { "code": "${code}", "message": "…" } } 모양이어야 합니다 (SPEC.md 5절). 받은 응답: ${JSON.stringify(r.data).slice(0, 200)}`
  );
  assert.equal(typeof r.data.error.message, "string", "error.message에 사람이 읽을 문장이 있어야 합니다");
}
async function list(query = "") {
  const r = await call("GET", "/api/reports" + query);
  expectStatus(r, 200);
  assert.ok(Array.isArray(r.data), `목록은 배열이어야 합니다. 받은 응답: ${JSON.stringify(r.data).slice(0, 200)}`);
  return r.data;
}
async function newReport(extra = {}) {
  const r = await call("POST", "/api/reports", {
    title: "2층 천장에서 물이 샙니다",
    location: "사무동 2F 복도",
    reporter_name: "김OO",
    body: "복도 끝 천장 타일이 젖어 있고 바닥에 물이 고였어요",
    ...extra,
  });
  expectStatus(r, 201);
  return r.data;
}

// ── AC-01 목록 (맨 먼저: 신고를 더하기 전의 40건을 봄) ──
test("목록은 40건을 긴급 → 주의 → 정보 → 미분류 순으로 준다", async () => {
  const rows = await list();
  assert.equal(rows.length, 40, `시드 40건이 모두 와야 합니다. 받은 건수: ${rows.length}`);
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    assert.ok(a.severity in RANK && b.severity in RANK, `severity는 urgent · warning · info · none 중 하나여야 합니다. ${a.id}번: ${a.severity} · ${b.id}번: ${b.severity}`);
    const ok = RANK[a.severity] < RANK[b.severity] || (RANK[a.severity] === RANK[b.severity] && a.id < b.id);
    assert.ok(ok, `${i}번째 카드(${a.id}번 · ${NAME[a.severity]}) 다음에 ${b.id}번 카드(${NAME[b.severity]})가 왔습니다. 심각도 순, 같으면 번호가 작은 것부터여야 합니다 (SPEC.md 5절 정렬 규칙)`);
  }
});

// ── AC-02 상태 필터 ──
test("상태 필터: open만 고르면 open만 온다", async () => {
  const all = await list();
  const open = await list("?status=open");
  assert.ok(open.length > 0, "접수(open) 신고가 1건 이상 와야 합니다");
  assert.ok(open.every((t) => t.status === "open"), `open이 아닌 신고가 섞였습니다: ${open.filter((t) => t.status !== "open").map((t) => t.id).join(", ")}번`);
  assert.equal(open.length, all.filter((t) => t.status === "open").length, "전체 목록의 open 건수와 필터 결과 건수가 같아야 합니다");
});

test("필터에 이상한 값(SQL 인젝션 문자열)을 넣어도 0건", async () => {
  const rows = await list("?status=" + encodeURIComponent("open' OR '1'='1"));
  assert.equal(rows.length, 0, `목록에 없는 status 값이면 빈 배열이어야 합니다. 받은 건수: ${rows.length}`);
});

// ── AC-03 신고 ──
test("신고 등록 → 201 · '접수' · 이름이 남는다", async () => {
  const t = await newReport();
  assert.equal(typeof t.id, "number", "새 신고에 번호(id)가 숫자로 붙어야 합니다");
  assert.equal(t.status, "open", "새 신고의 상태는 open(접수)이어야 합니다");
  assert.equal(t.severity, "none", "새 신고의 심각도는 none(미분류)이어야 합니다");
  assert.equal(t.reporter_name, "김OO", "신고자 이름이 그대로 남아야 합니다");
  assert.equal(t.title, "2층 천장에서 물이 샙니다");
  const rows = await list();
  assert.ok(rows.some((x) => x.id === t.id), "방금 만든 신고가 목록에 있어야 합니다");
});

test("제목이 비면 400", async () => {
  const before = (await list()).length;
  const r = await call("POST", "/api/reports", { title: "   ", location: "사무동 2F 복도", reporter_name: "김OO" });
  expectError(r, 400, "BAD_INPUT");
  assert.equal((await list()).length, before, "400이면 목록에 추가되지 않아야 합니다");
});

test("장소가 비면 400", async () => {
  const before = (await list()).length;
  const r = await call("POST", "/api/reports", { title: "2층 천장에서 물이 샙니다", location: "", reporter_name: "김OO" });
  expectError(r, 400, "BAD_INPUT");
  assert.equal((await list()).length, before, "400이면 목록에 추가되지 않아야 합니다");
});

// ── AC-04 처리 ──
test("배정하면 200 · 상태가 '배정'", async () => {
  const t = await newReport();
  const r = await call("PATCH", `/api/reports/${t.id}`, { assignee: "한과장" });
  expectStatus(r, 200);
  assert.equal(r.data.assignee, "한과장", "담당자가 바뀐 신고를 돌려줘야 합니다");
  assert.equal(r.data.status, "assigned", "담당자를 정하면 상태가 자동으로 assigned(배정)가 되어야 합니다");
});

test("완료하면 200 · 상태가 '완료'", async () => {
  const t = await newReport();
  expectStatus(await call("PATCH", `/api/reports/${t.id}`, { assignee: "한과장" }), 200);
  const r = await call("PATCH", `/api/reports/${t.id}`, { status: "resolved" });
  expectStatus(r, 200);
  assert.equal(r.data.status, "resolved", "상태가 resolved(완료)로 바뀐 신고를 돌려줘야 합니다");
});

test("없는 번호 404", async () => {
  const r = await call("PATCH", "/api/reports/99999", { status: "resolved" });
  expectError(r, 404, "NOT_FOUND");
});

test("상태에 목록 밖의 값을 보내면 400", async () => {
  const t = await newReport();
  const r = await call("PATCH", `/api/reports/${t.id}`, { status: "done" });
  expectError(r, 400, "BAD_INPUT");
  const still = (await list()).find((x) => x.id === t.id);
  assert.equal(still?.status, "open", "400이면 상태가 그대로(open)여야 합니다");
});
