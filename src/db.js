// db.js — DB 창구. 어떤 DB를 쓰는지(DB_MODE)는 이 파일만 안다.
// 세 DB(memory · sqlite · supabase)가 같은 이름의 함수를 갖고, 맨 아래 export 함수가 그걸 부른다.
//   신고(reports): list · get · create · update
//   미식(menus 등): listGrades · listMenus · createMenu · removeMenu · addVote · createDraw · listDraws
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

const MODE = process.env.DB_MODE || "supabase";
const RANK = { urgent: 0, warning: 1, info: 2, none: 3 };
const readSeed = (file) => JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), "utf-8"));
const seed = readSeed("seed.json");
const misikSeed = readSeed("misik_seed.json");

// ── memory: 서버 메모리 배열 (테스트용 · 껐다 켜면 시드로 돌아감) ──
function openMemory() {
  const now = () => new Date().toISOString();
  const AI_EMPTY = { ai_severity: "", ai_category: "", ai_reason: "", ai_hold: 0, severity_by: "", notice: "" }; // AI 제안 · 보류 · 판단 주체 · 안내문 칸 (003 ~ 006 마이그레이션과 같은 기본값)
  const rows = seed.map((r) => ({ ...AI_EMPTY, ...r }));
  let nextId = Math.max(...rows.map((r) => r.id)) + 1;
  const grades = structuredClone(misikSeed.grades);
  let menus = misikSeed.menus.map((m, i) => ({ id: i + 1, ...m, created_at: now() }));
  let votes = [];
  const draws = [];
  let nextMenuId = menus.length + 1;
  let nextDrawId = 1;
  const countVotes = (menu_id) => ({
    likes: votes.filter((v) => v.menu_id === menu_id && v.value === 1).length,
    dislikes: votes.filter((v) => v.menu_id === menu_id && v.value === -1).length,
  });

  return {
    list: async (status) => rows.filter((r) => !status || r.status === status),
    get: async (id) => rows.find((r) => r.id === id) ?? null,
    create: async (fields) => {
      const row = { id: nextId++, severity: "none", category: "none", status: "open", assignee: "", ...AI_EMPTY, created_at: now(), ...fields };
      rows.push(row);
      return row;
    },
    update: async (id, fields) => {
      const row = rows.find((r) => r.id === id);
      return row ? Object.assign(row, fields) : null;
    },

    listGrades: async () => grades,
    listMenus: async () => menus.map((m) => ({ ...m, ...countVotes(m.id) })),
    createMenu: async ({ name, grade }) => {
      if (menus.some((m) => m.name === name)) return null;
      const row = { id: nextMenuId++, name, grade, created_at: now() };
      menus.push(row);
      return { ...row, likes: 0, dislikes: 0 };
    },
    removeMenu: async (id) => {
      const row = menus.find((m) => m.id === id);
      if (!row) return null;
      menus = menus.filter((m) => m !== row);
      votes = votes.filter((v) => v.menu_id !== id);
      draws.forEach((d) => d.menu_id === id && (d.menu_id = null));
      return row;
    },
    addVote: async (menu_id, value) => {
      if (!menus.some((m) => m.id === menu_id)) return null;
      votes.push({ menu_id, value });
      return { menu_id, ...countVotes(menu_id) };
    },
    createDraw: async (fields) => {
      const row = { id: nextDrawId++, ...fields, drawn_at: now() };
      draws.push(row);
      return row;
    },
    listDraws: async (limit) => draws.slice(-limit).reverse(),
  };
}

// ── sqlite: data/app.db 파일 하나 ──
// Vercel(VERCEL 환경변수가 있음)은 함수 폴더에 쓸 수 없어서 임시 폴더에 둔다. 서버마다 따로라 데이터는 시드로 돌아감 (SPEC 11절)
export const sqliteFile = (env = process.env) => (env.VERCEL ? path.join(tmpdir(), "app.db") : fileURLToPath(new URL("../data/app.db", import.meta.url)));

async function openSqlite() {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(sqliteFile());

  // 마이그레이션: migrations/sqlite/ 파일 중 아직 안 돌린 것만 번호 순으로 실행
  db.exec("CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY)");
  const dir = new URL("./migrations/sqlite/", import.meta.url);
  for (const name of readdirSync(dir).sort()) {
    if (db.prepare("SELECT 1 FROM migrations WHERE name = ?").get(name)) continue;
    db.exec(readFileSync(new URL(name, dir), "utf-8"));
    db.prepare("INSERT INTO migrations (name) VALUES (?)").run(name);
    console.log(`[API→DB] 마이그레이션 실행: ${name}`);
  }

  // 칸 이름은 서버 코드가 정한 것만 들어온다. 값은 항상 ? 자리표시자로 넘긴다.
  const insert = (table, fields) => {
    const cols = Object.keys(fields);
    const sql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")}) RETURNING *`;
    return db.prepare(sql).get(...Object.values(fields));
  };
  const isEmpty = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n === 0;
  const countVotes = (menu_id) =>
    db.prepare("SELECT COUNT(CASE WHEN value = 1 THEN 1 END) AS likes, COUNT(CASE WHEN value = -1 THEN 1 END) AS dislikes FROM misik_votes WHERE menu_id = ?").get(menu_id);

  // 처음 켤 때(테이블이 비었을 때)만 시드 넣기. 번호는 DB가 1부터 붙인다.
  if (isEmpty("reports")) {
    for (const { id, ...row } of seed) insert("reports", row);
    console.log(`[API→DB] 신고 시드 ${seed.length}건 넣음`);
  }
  if (isEmpty("misik_grades")) {
    misikSeed.grades.forEach((g) => insert("misik_grades", g));
    misikSeed.menus.forEach((m) => insert("misik_menus", m));
    console.log(`[API→DB] 미식 시드 메뉴 ${misikSeed.menus.length}개 넣음`);
  }

  return {
    list: async (status) =>
      status ? db.prepare("SELECT * FROM reports WHERE status = ?").all(status) : db.prepare("SELECT * FROM reports").all(),
    get: async (id) => db.prepare("SELECT * FROM reports WHERE id = ?").get(id) ?? null,
    create: async (fields) => insert("reports", fields),
    update: async (id, fields) => {
      const sets = Object.keys(fields).map((c) => `${c} = ?`).join(", ");
      return db.prepare(`UPDATE reports SET ${sets} WHERE id = ? RETURNING *`).get(...Object.values(fields), id) ?? null;
    },

    listGrades: async () => db.prepare("SELECT * FROM misik_grades ORDER BY weight DESC").all(),
    // 투표 수는 한 번의 조회로 같이 셈 (메뉴마다 따로 세면 100개일 때 101번 조회)
    listMenus: async () =>
      db.prepare(
        `SELECT m.*, COUNT(CASE WHEN v.value = 1 THEN 1 END) AS likes, COUNT(CASE WHEN v.value = -1 THEN 1 END) AS dislikes
         FROM misik_menus m LEFT JOIN misik_votes v ON v.menu_id = m.id GROUP BY m.id ORDER BY m.id`
      ).all(),
    createMenu: async ({ name, grade }) => {
      if (db.prepare("SELECT 1 FROM misik_menus WHERE name = ?").get(name)) return null;
      return { ...insert("misik_menus", { name, grade }), likes: 0, dislikes: 0 };
    },
    removeMenu: async (id) => db.prepare("DELETE FROM misik_menus WHERE id = ? RETURNING *").get(id) ?? null,
    addVote: async (menu_id, value) => {
      if (!db.prepare("SELECT 1 FROM misik_menus WHERE id = ?").get(menu_id)) return null;
      insert("misik_votes", { menu_id, value });
      return { menu_id, ...countVotes(menu_id) };
    },
    createDraw: async (fields) => insert("misik_draws", fields),
    listDraws: async (limit) => db.prepare("SELECT * FROM misik_draws ORDER BY id DESC LIMIT ?").all(limit),
  };
}

// ── supabase: 7일차 Supabase 프로젝트 (REST API를 fetch로 부름) ──
async function openSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error(".env에 SUPABASE_URL과 SUPABASE_SECRET_KEY가 필요합니다. SQLite로 하려면 .env에 DB_MODE=sqlite 한 줄을 넣으세요.");

  // table: 테이블(또는 뷰) 이름 · query: ?로 시작하는 조건 (값은 encodeURIComponent로 넣음)
  async function rest(method, table, query = "", body) {
    const res = await fetch(`${url}/rest/v1/${table}${query}`, {
      method,
      headers: { apikey: key, "Content-Type": "application/json", Prefer: "return=representation" },
      body: body && JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw Object.assign(new Error(`Supabase ${res.status}: ${text}`), { code: (() => { try { return JSON.parse(text).code; } catch {} })() });
    }
    return res.json();
  }
  const isEmpty = async (table) => (await rest("GET", table, "?select=*&limit=1")).length === 0;
  const countVotes = async (menu_id) => {
    const [c] = await rest("GET", "misik_vote_counts", `?menu_id=eq.${encodeURIComponent(menu_id)}`);
    return { likes: c?.likes ?? 0, dislikes: c?.dislikes ?? 0 };
  };

  // 처음 켤 때(테이블이 비었을 때)만 시드 넣기
  if (await isEmpty("reports")) {
    await rest("POST", "reports", "", seed.map(({ id, ...row }) => row));
    console.log(`[API→DB] 신고 시드 ${seed.length}건 넣음`);
  }
  if (await isEmpty("misik_grades")) {
    await rest("POST", "misik_grades", "", misikSeed.grades);
    await rest("POST", "misik_menus", "", misikSeed.menus);
    console.log(`[API→DB] 미식 시드 메뉴 ${misikSeed.menus.length}개 넣음`);
  }

  return {
    list: (status) => rest("GET", "reports", status ? `?status=eq.${encodeURIComponent(status)}` : ""),
    get: async (id) => (await rest("GET", "reports", `?id=eq.${encodeURIComponent(id)}`))[0] ?? null,
    create: async (fields) => (await rest("POST", "reports", "", fields))[0],
    update: async (id, fields) => (await rest("PATCH", "reports", `?id=eq.${encodeURIComponent(id)}`, fields))[0] ?? null,

    listGrades: () => rest("GET", "misik_grades", "?order=weight.desc"),
    listMenus: async () => {
      const [menus, counts] = await Promise.all([rest("GET", "misik_menus", "?order=id"), rest("GET", "misik_vote_counts")]);
      return menus.map((m) => {
        const c = counts.find((x) => x.menu_id === m.id);
        return { ...m, likes: c?.likes ?? 0, dislikes: c?.dislikes ?? 0 };
      });
    },
    createMenu: async ({ name, grade }) => {
      if ((await rest("GET", "misik_menus", `?name=eq.${encodeURIComponent(name)}`)).length) return null;
      return { ...(await rest("POST", "misik_menus", "", { name, grade }))[0], likes: 0, dislikes: 0 };
    },
    removeMenu: async (id) => (await rest("DELETE", "misik_menus", `?id=eq.${encodeURIComponent(id)}`))[0] ?? null,
    addVote: async (menu_id, value) => {
      // 없는 메뉴는 따로 조회하지 않고, 넣기가 외래 키 위반(23503)으로 실패하는 것으로 알아냄 (왕복 3번 → 2번)
      try {
        await rest("POST", "misik_votes", "", { menu_id, value });
      } catch (err) {
        if (err.code === "23503") return null;
        throw err;
      }
      return { menu_id, ...(await countVotes(menu_id)) };
    },
    createDraw: async (fields) => (await rest("POST", "misik_draws", "", fields))[0],
    listDraws: (limit) => rest("GET", "misik_draws", `?order=id.desc&limit=${encodeURIComponent(limit)}`),
  };
}

const opens = { memory: openMemory, sqlite: openSqlite, supabase: openSupabase };
if (!opens[MODE]) throw new Error(`DB_MODE는 supabase · sqlite · memory 중 하나여야 합니다. 받은 값: ${MODE}`);
const store = await opens[MODE]();
console.log(`[API→DB] DB 연결: ${MODE}`);

// ── 신고 ──
// 목록: 급한 순(긴급 → 주의 → 정보 → 미분류), 같은 심각도면 번호가 작은 것부터
export async function listReports(status) {
  console.log(`[API→DB] 신고 목록 읽기 (${status || "전체"})`);
  const rows = await store.list(status);
  return rows.sort((a, b) => RANK[a.severity] - RANK[b.severity] || a.id - b.id);
}

// 신고 한 건 (없는 번호면 null)
export const getReport = (id) => store.get(id);

export async function createReport(fields) {
  console.log(`[API→DB] 신고 저장: ${fields.title}`);
  return store.create(fields);
}

// 없는 번호면 null
export async function updateReport(id, fields) {
  console.log(`[API→DB] ${id}번 신고 바꾸기: ${JSON.stringify(fields)}`);
  return store.update(id, fields);
}

// ── 미식 ── (없는 메뉴면 null · 이미 있는 이름이면 createMenu가 null)
export const listGrades = () => store.listGrades();
export const listMenus = () => store.listMenus();
export async function createMenu(fields) {
  console.log(`[API→DB] 메뉴 추가: ${fields.name}`);
  return store.createMenu(fields);
}
export async function removeMenu(id) {
  console.log(`[API→DB] ${id}번 메뉴 삭제`);
  return store.removeMenu(id);
}
export const addVote = (menuId, value) => store.addVote(menuId, value);
export async function createDraw(fields) {
  console.log(`[API→DB] 뽑기 기록: ${fields.menu_name}`);
  return store.createDraw(fields);
}
export const listDraws = (limit) => store.listDraws(limit);
