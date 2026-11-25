// peek.js — SQLite 파일(data/app.db) 들여다보기 · 읽기 전용 (Supabase는 Table Editor에서 봄)
// npm run peek                                  → 테이블 · 칸 · 건수 · 최근 신고 5건
// npm run peek -- "SELECT id, title FROM reports WHERE status = 'open'"   → SELECT 직접 (읽기만)
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(new URL("./data/app.db", import.meta.url));
if (!existsSync(file)) {
  console.log("data/app.db가 아직 없습니다. .env에 DB_MODE=sqlite를 넣고 서버를 한 번 켜면 생깁니다.");
  console.log("(Supabase 트랙은 Supabase 대시보드의 Table Editor에서 봅니다)");
  process.exit(0);
}
const db = new DatabaseSync(file, { readOnly: true });
const sql = process.argv[2];

if (sql) {
  if (!/^\s*select\b/i.test(sql)) {
    console.log("peek는 읽기 전용입니다. SELECT로 시작하는 문장만 됩니다.");
    process.exit(1);
  }
  console.table(db.prepare(sql).all());
} else {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  for (const { name } of tables) {
    const cols = db.prepare(`PRAGMA table_info(${name})`).all().map((c) => c.name);
    const { n } = db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get();
    console.log(`■ ${name} (${n}건)\n  칸: ${cols.join(" · ")}`);
  }
  if (tables.some((t) => t.name === "reports")) {
    console.log("\n최근 신고 5건");
    console.table(db.prepare("SELECT id, title, severity, status, assignee FROM reports ORDER BY id DESC LIMIT 5").all());
  }
}
