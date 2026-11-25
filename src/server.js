// server.js — API 서버. 주소를 나누고 입력을 검사한다. DB 종류는 모른다(db.js가 앎).
//   신고함 API: docs/SPEC.md 5절 · 미식(회식 메뉴 가챠) API: docs/SPEC_MISIK.md
import http from "node:http";
import { randomInt } from "node:crypto";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as db from "./db.js";
import { askRecommendedMenus, checkRecommended, askReportClass, checkAiResult, askHandlerRecommend, checkRecommendResult, openNoticeStream, safetyLine, askFaqAnswer, checkChatResult, applyHold, AiError } from "./ai.js";
import { evalCandidates } from "./golden.js";
import { approveFields } from "./judge.js";
import { TOOLS, runTool } from "./tools.js";

const PORT = Number(process.env.PORT) || 8080;
const PUBLIC = fileURLToPath(new URL("./public/", import.meta.url));
const STATUSES = ["open", "assigned", "resolved"];
const SEVERITIES = ["urgent", "warning", "info"];
const HANDLERS = ["이주임", "최대리", "정사원", "한과장"];
const GRADES = ["R", "SR", "SSR"];
const ME = { name: "관리자" }; // 미식 자동 로그인 계정 (로그인 화면 없이 모두 이 계정으로 씀)

// 입력 규칙에 안 맞을 때 던지는 오류 → 400 / 404 / 409로 바뀜
class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const bad = (message) => new ApiError(400, "BAD_INPUT", message);
const notFound = (message) => new ApiError(404, "NOT_FOUND", message);
const conflict = (message) => new ApiError(409, "CONFLICT", message);
const aiDown = (message) => new ApiError(503, "AI_UNAVAILABLE", message);
const tooMany = (message) => new ApiError(429, "TOO_MANY_REQUESTS", message);

// ── 보안 ④ 연타 제한 (SPEC 12절 · AC-17) ──
// 접속 주소마다 1분에 AI 기능 10번 · 챗봇 20번. 넘으면 429 (돈이 드는 AI만 막고, 신고 접수는 막지 않음)
// 기록은 서버 메모리에만 있어 서버(Vercel 인스턴스)마다 따로 셈. 평가 스크립트는 AI_RATE_LIMIT=off로 끔
const LIMITS = {
  ai: { max: 10, message: "AI 기능은 1분에 10번까지입니다", path: /^\/api\/(reports\/\d+\/(classify|recommend|notice\/draft)|menus\/filter)$/ },
  chat: { max: 20, message: "챗봇은 1분에 20번까지입니다", path: /^\/api\/chat$/ },
};
const hits = new Map(); // "종류:주소" → 최근 1분 안의 요청 시각들

function limitAi(req, pathname) {
  if (req.method !== "POST" || process.env.AI_RATE_LIMIT === "off") return;
  const kind = Object.keys(LIMITS).find((k) => LIMITS[k].path.test(pathname));
  if (!kind) return; // AI가 아닌 주소는 제한 없음
  // 접속 주소: Vercel은 x-forwarded-for 머리말에 진짜 주소를 넣어 줌 (없으면 직접 연결한 주소)
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  const key = `${kind}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < 60_000); // 1분 지난 기록은 버림
  if (recent.length >= LIMITS[kind].max) throw tooMany(LIMITS[kind].message);
  recent.push(now);
  hits.set(key, recent);
}

// 글자 칸 꺼내기: 앞뒤 빈칸을 빼고, 글자가 아니면 빈칸으로 본다
const text = (v) => (typeof v === "string" ? v.trim() : "");

// ── 신고함 입력 검사 ──
// POST 신고하기 → DB에 넣을 칸만 골라 돌려줌
function checkNewReport(input) {
  const title = text(input.title);
  const location = text(input.location);
  const reporter_name = text(input.reporter_name);
  const building = text(input.building) || "office";
  const asset_id = text(input.asset_id);
  const body = text(input.body);
  if (!title) throw bad("제목을 입력하세요");
  if (title.length > 100) throw bad("제목은 100자 이하로 입력하세요");
  if (!location) throw bad("장소를 입력하세요");
  if (location.length > 50) throw bad("장소는 50자 이하로 입력하세요");
  if (!reporter_name) throw bad("이름을 입력하세요");
  if (reporter_name.length > 20) throw bad("이름은 20자 이하로 입력하세요");
  if (!["office", "plant"].includes(building)) throw bad("건물은 사무동(office) 또는 생산동(plant)이어야 합니다");
  if (asset_id.length > 20) throw bad("설비 번호는 20자 이하로 입력하세요");
  if (body.length > 1000) throw bad("내용은 1000자 이하로 입력하세요");
  return { title, location, reporter_name, building, asset_id, body };
}

// PATCH 처리하기 → 바꿀 칸만 돌려줌
function checkChange(input) {
  const fields = {};
  if (input.severity_by !== undefined) throw bad("심각도를 누가 정했는지(severity_by)는 서버가 정합니다. 보내지 마세요");
  if (input.severity !== undefined) {
    if (!SEVERITIES.includes(input.severity)) throw bad("심각도는 urgent · warning · info 중 하나여야 합니다"); // 사람이 정하는 값에는 none이 없음
    fields.severity = input.severity;
    fields.severity_by = "human"; // 사람이 고른 것 (SPEC 10.5)
  }
  if (input.assignee !== undefined) {
    if (!HANDLERS.includes(input.assignee)) throw bad(`담당자는 ${HANDLERS.join(" · ")} 중 한 명이어야 합니다`);
    fields.assignee = input.assignee;
    fields.status = "assigned"; // 담당자를 정하면 상태는 자동으로 배정
  }
  if (input.status !== undefined) {
    if (!STATUSES.includes(input.status)) throw bad("상태는 open · assigned · resolved 중 하나여야 합니다");
    fields.status = input.status;
  }
  if (!Object.keys(fields).length) throw bad("담당자(assignee) · 상태(status) · 심각도(severity) 중 하나를 보내세요");
  return fields;
}

// POST 챗봇 묻기 → 검사한 대화 [{ role, content }] (SPEC 9.5). 1턴 = 메시지 한 개, 최대 20개
function checkChat(input) {
  const { messages } = input;
  if (!Array.isArray(messages) || !messages.length) throw bad("대화(messages)를 배열로 보내세요");
  if (messages.length > 20) throw bad("대화가 너무 길어요. 20개 이하로 보내세요 (새 대화를 시작해 주세요)");
  const chat = messages.map((m) => ({ role: m?.role, content: text(m?.content) }));
  for (const m of chat) {
    if (m.role !== "user" && m.role !== "assistant") throw bad("role은 user 또는 assistant여야 합니다");
    if (!m.content) throw bad("메시지 내용을 입력하세요");
    if (m.content.length > 500) throw bad("메시지는 500자 이하로 입력하세요");
  }
  if (chat.at(-1).role !== "user") throw bad("마지막 메시지는 사용자의 질문이어야 합니다");
  return chat;
}

// ── 미식 입력 검사 ──
function checkNewMenu(input) {
  const name = text(input.name);
  if (!name) throw bad("메뉴 이름을 입력하세요");
  if (name.length > 30) throw bad("메뉴 이름은 30자 이하로 입력하세요");
  if (!GRADES.includes(input.grade)) throw bad("등급은 R · SR · SSR 중 하나입니다");
  return { name, grade: input.grade };
}

// 등급 가중치대로 메뉴 하나 고르기. rand는 0 이상 1 미만
// 예: R(6) 메뉴 하나 + SSR(1) 메뉴 하나면 R이 6/7, SSR이 1/7 확률
function pickWeighted(menus, grades, rand) {
  const weightOf = (m) => grades.find((g) => g.grade === m.grade)?.weight ?? 0;
  let left = rand * menus.reduce((sum, m) => sum + weightOf(m), 0);
  for (const m of menus) {
    left -= weightOf(m);
    if (left < 0) return m;
  }
  return menus[menus.length - 1];
}

// 요청 본문(JSON) 읽기. 본문이 없으면 빈 객체
async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf-8"); // 다 모은 뒤 글자로 (한글이 조각 사이에서 깨지지 않게)
  try {
    const data = JSON.parse(raw || "{}");
    if (data && typeof data === "object") return data;
  } catch {}
  throw bad("보낸 값이 JSON 객체가 아닙니다");
}

// 주소별로 할 일 나누기 → [상태 코드, 돌려줄 값]
async function route(req, url) {
  const { pathname: p } = url;
  const m = req.method;
  const id = Number(p.match(/^\/api\/\w+\/(\d+)/)?.[1]); // 주소 속 번호 (/api/reports/3 → 3)

  // 신고함
  if (p === "/api/reports" && m === "GET") {
    const status = url.searchParams.get("status");
    if (status && !STATUSES.includes(status)) return [200, []]; // 목록에 없는 값이면 빈 배열
    return [200, await db.listReports(status)];
  }
  if (p === "/api/reports" && m === "POST") return [201, await db.createReport(checkNewReport(await readJson(req)))];
  if (/^\/api\/reports\/\d+$/.test(p) && m === "PATCH") {
    const row = await db.updateReport(id, checkChange(await readJson(req)));
    if (!row) throw notFound(`${id}번 신고가 없습니다`);
    return [200, row];
  }
  // AI 분류 제안: 제안 칸(ai_*)에만 저장하고 심각도는 그대로 (SPEC 9.1 · AC-06)
  if (/^\/api\/reports\/\d+\/classify$/.test(p) && m === "POST") {
    const report = await db.getReport(id);
    if (!report) throw notFound(`${id}번 신고가 없습니다`);
    let fields;
    try {
      const raw = await askReportClass(report);
      fields = checkAiResult(raw);
      if (!fields) throw new AiError("AI 답이 정해진 값(심각도 · 유형) 밖입니다"); // SPEC 9-2: 제안 전체를 버림
      fields = applyHold(fields, raw, report); // 판단 보류 표시 (SPEC 10.2)
      if (!fields) throw new AiError("AI 답의 needs_human이 true · false가 아닙니다");
    } catch (err) {
      if (!(err instanceof AiError)) throw err;
      console.error(`[AI] ${err.message}`); // 자세한 이유는 서버 터미널에만
      throw aiDown("AI가 지금 응답하지 않습니다. 잠시 뒤 다시 [AI 분류]를 눌러 주세요");
    }
    return [200, await db.updateReport(id, fields)];
  }
  // 담당 추천: AI가 도구로 조회만 하고 추천. 저장하지 않으므로 상태는 그대로 (SPEC 9.2 · AC-08 · AC-09)
  if (/^\/api\/reports\/\d+\/recommend$/.test(p) && m === "POST") {
    const report = await db.getReport(id);
    if (!report) throw notFound(`${id}번 신고가 없습니다`);
    const reports = await db.listReports(); // 도구가 볼 신고 전체 (한 번만 읽음)
    try {
      const { answer, tools } = await askHandlerRecommend(report, TOOLS, (name, input) => runTool(name, input, report, reports));
      const out = checkRecommendResult(answer, Boolean(report.asset_id));
      if (!out) throw new AiError(`AI 답이 규칙 밖입니다: ${JSON.stringify(answer)}`); // SPEC 9.2 검사
      return [200, { ...out, tools }];
    } catch (err) {
      if (!(err instanceof AiError)) throw err;
      console.error(`[AI] ${err.message}`);
      throw aiDown("AI가 지금 응답하지 않습니다. 담당은 직접 골라 주세요");
    }
  }
  // 안내문 보내기: 사람이 고친 글을 저장 (SPEC 9.3 · AC-10). 초안 받기는 아래 streamNoticeDraft
  if (/^\/api\/reports\/\d+\/notice$/.test(p) && m === "POST") {
    const notice = text((await readJson(req)).notice);
    if (!notice) throw bad("안내문을 입력하세요");
    if (notice.length > 1000) throw bad("안내문은 1000자 이하로 입력하세요");
    const row = await db.updateReport(id, { notice });
    if (!row) throw notFound(`${id}번 신고가 없습니다`);
    return [200, row];
  }
  // 현장 수정 → 평가셋 후보: 계산만 하고 저장하지 않음 (SPEC 10.3 · AC-19)
  if (p === "/api/eval/candidates" && m === "GET") return [200, { items: evalCandidates(await db.listReports()) }];
  // FAQ 챗봇: 대화를 받아 FAQ 근거로 답함. 저장하지 않음 (SPEC 9.5 · AC-12)
  if (p === "/api/chat" && m === "POST") {
    const chat = checkChat(await readJson(req));
    try {
      const out = checkChatResult(await askFaqAnswer(chat));
      if (!out) throw new AiError("AI 답이 규칙 밖입니다 (빈 답 또는 FAQ에 없는 번호)");
      return [200, out];
    } catch (err) {
      if (!(err instanceof AiError)) throw err;
      console.error(`[AI] ${err.message}`);
      throw aiDown("AI가 지금 응답하지 않습니다. 잠시 뒤 다시 물어봐 주세요");
    }
  }
  // 승인: 사람이 누르면 제안을 심각도 · 유형으로 옮김 (SPEC 9-4 · AC-07)
  if (/^\/api\/reports\/\d+\/approve$/.test(p) && m === "POST") {
    const report = await db.getReport(id);
    if (!report) throw notFound(`${id}번 신고가 없습니다`);
    const { fields, error } = approveFields(report); // 판단 주체(severity_by)는 서버가 ai로 정함 (SPEC 10.5)
    if (error === "no_suggestion") throw conflict("승인할 AI 제안이 없습니다");
    if (error === "decided") throw conflict("이미 심각도가 정해진 신고입니다");
    return [200, await db.updateReport(id, fields)];
  }

  // 미식
  if (p === "/api/me" && m === "GET") return [200, ME];
  if (p === "/api/grades" && m === "GET") return [200, await db.listGrades()];
  if (p === "/api/menus" && m === "GET") return [200, await db.listMenus()];
  if (p === "/api/menus" && m === "POST") {
    const row = await db.createMenu(checkNewMenu(await readJson(req)));
    if (!row) throw conflict("이미 있는 메뉴입니다");
    return [201, row];
  }
  if (/^\/api\/menus\/\d+$/.test(p) && m === "DELETE") {
    const row = await db.removeMenu(id);
    if (!row) throw notFound("메뉴가 없습니다");
    return [200, row];
  }
  if (/^\/api\/menus\/\d+\/vote$/.test(p) && m === "POST") {
    const { value } = await readJson(req);
    if (value !== 1 && value !== -1) throw bad("투표 값은 1(좋아요) 또는 -1(싫어요)입니다");
    const out = await db.addVote(id, value);
    if (!out) throw notFound("메뉴가 없습니다");
    return [200, out];
  }
  if (p === "/api/draws" && m === "GET") {
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 10, 1), 50); // 1~50건, 기본 10건
    return [200, await db.listDraws(limit)];
  }
  if (p === "/api/menus/filter" && m === "POST") {
    // AI는 남길(추천) 메뉴만 고른다. 답은 checkRecommended로 검사한 뒤 돌려줌 (SPEC_MISIK AC-08)
    const condition = text((await readJson(req)).condition);
    if (!condition) throw bad("조건을 입력하세요");
    if (condition.length > 200) throw bad("조건은 200자 이하로 입력하세요");
    const menus = await db.listMenus();
    try {
      return [200, { recommended: checkRecommended(await askRecommendedMenus(menus, condition), menus) }];
    } catch (err) {
      if (!(err instanceof AiError)) throw err;
      console.error(`[AI] ${err.message}`); // 자세한 이유는 서버 터미널에만
      throw aiDown("AI가 지금 응답하지 않습니다. 조건 없이 뽑아 주세요");
    }
  }
  if (p === "/api/draws" && m === "POST") {
    // 뽑기는 서버에서 한다 (화면에서 결과를 조작하지 못하게). only: AI가 추천한 메뉴 번호들 (없으면 전체에서 뽑음)
    const { only } = await readJson(req);
    if (only !== undefined && (!Array.isArray(only) || !only.every(Number.isInteger))) throw bad("only는 메뉴 번호 배열이어야 합니다");
    const [all, grades] = await Promise.all([db.listMenus(), db.listGrades()]);
    const menus = only === undefined ? all : all.filter((x) => only.includes(x.id));
    if (!menus.length) throw conflict("뽑을 메뉴가 없습니다");
    const menu = pickWeighted(menus, grades, randomInt(1_000_000) / 1_000_000);
    const draw = await db.createDraw({ menu_id: menu.id, menu_name: menu.name, grade: menu.grade, user_name: ME.name });
    return [201, { menu, draw }];
  }

  throw notFound("없는 API 주소입니다");
}

// 안내문 초안 스트리밍 (SPEC 9.3): 받은 글자 조각을 바로바로 화면에 흘려보냄 · 저장하지 않음
// 시작 전 실패는 404 / 503 JSON, 시작한 뒤 끊기면 연결을 끊어 화면이 알게 함
async function streamNoticeDraft(res, id) {
  const report = await db.getReport(id);
  if (!report) throw notFound(`${id}번 신고가 없습니다`);
  // 첫 조각이 올 때까지는 아직 아무것도 안 보냄 → 빈 답 · 거절 · 시간 초과도 503으로 알릴 수 있음
  let pieces, first;
  try {
    pieces = (await openNoticeStream(report))[Symbol.asyncIterator]();
    first = await pieces.next();
  } catch (err) {
    if (!(err instanceof AiError)) throw err;
    console.error(`[AI] ${err.message}`);
    throw aiDown("AI가 지금 응답하지 않습니다. 안내문은 직접 써 주세요");
  }
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  res.write(safetyLine(report.severity)); // 안전 문구는 AI가 아니라 서버가 정한 문장
  try {
    for (let p = first; !p.done; p = await pieces.next()) res.write(p.value); // 받은 조각을 바로 보냄
    res.end();
  } catch (err) {
    console.error(`[AI] ${err.message}`);
    res.destroy(); // 중간에 끊김 → 화면은 받은 글을 그대로 두고 "끊겼어요"를 보임
  }
}

// ── 화면 파일 (src/public/) ──
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".woff2": "font/woff2", ".md": "text/plain; charset=utf-8" };

function serveFile(res, pathname) {
  let file = path.join(PUBLIC, decodeURIComponent(pathname));
  // public 폴더 밖(../ 등)은 내어 주지 않는다
  if (!file.startsWith(PUBLIC) || !existsSync(file)) return send(res, 404, TYPES[".md"], "없는 페이지입니다");
  if (statSync(file).isDirectory()) {
    if (!pathname.endsWith("/")) {
      res.writeHead(301, { Location: pathname + "/" }); // /misik → /misik/
      return res.end();
    }
    file = path.join(file, "index.html");
    if (!existsSync(file)) return send(res, 404, TYPES[".md"], "없는 페이지입니다");
  }
  // 글꼴(670KB)은 7일 동안 브라우저에 저장해 다시 받지 않게 함. html · css는 고치면 바로 보이게 그대로 둠
  const cache = pathname.startsWith("/fonts/") ? { "Cache-Control": "public, max-age=604800" } : {};
  send(res, 200, TYPES[path.extname(file)] || "application/octet-stream", readFileSync(file), cache);
}

const send = (res, status, type, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": type, ...headers });
  res.end(body);
};

// 요청 하나를 처리하는 함수. 로컬 서버(start)와 Vercel이 똑같이 이 함수를 입구로 씀 (SPEC 11절)
export default async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");

  if (!url.pathname.startsWith("/api/")) {
    if (req.method !== "GET") return send(res, 404, TYPES[".md"], "없는 페이지입니다");
    try {
      return serveFile(res, url.pathname);
    } catch {
      return send(res, 400, TYPES[".md"], "주소가 올바르지 않습니다"); // 깨진 %인코딩 등
    }
  }

  console.log(`[화면→API] ${req.method} ${url.pathname}${url.search}`);
  try {
    limitAi(req, url.pathname); // AI 주소면 연타 검사 (넘으면 429)
    const draftId =url.pathname.match(/^\/api\/reports\/(\d+)\/notice\/draft$/)?.[1];
    if (draftId && req.method === "POST") return await streamNoticeDraft(res, Number(draftId)); // 스트리밍은 따로
    const [status, data] = await route(req, url);
    send(res, status, "application/json; charset=utf-8", JSON.stringify(data));
  } catch (err) {
    if (!(err instanceof ApiError)) console.error(err); // 자세한 내용은 서버 터미널에만
    const e = err instanceof ApiError ? err : new ApiError(500, "SERVER_ERROR", "서버에서 오류가 났습니다");
    send(res, e.status, "application/json; charset=utf-8", JSON.stringify({ error: { code: e.code, message: e.message } }));
  }
}

// 서버 켜기: 직접 실행할 때만 부른다 (import만으로는 켜지지 않음)
export function start() {
  http.createServer(handle).listen(PORT, () => console.log(`SDI 시설 신고함: http://localhost:${PORT} · 회식 메뉴 가챠: http://localhost:${PORT}/misik/`));
}
