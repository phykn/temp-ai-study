-- AI 판단 보류 칸 (SQLite) · SPEC 10.2절 · 서버가 켤 때 한 번만 자동 실행됨
-- 1이면 AI가 "사람 확인 필요"라고 한 제안
ALTER TABLE reports ADD COLUMN ai_hold INTEGER NOT NULL DEFAULT 0 CHECK (ai_hold IN (0, 1));
