-- 심각도를 누가 정했는지 칸 (SQLite) · SPEC 10.5절 · 서버가 켤 때 한 번만 자동 실행됨
-- '' = 아직 안 정함(또는 예전 데이터) · ai = [승인]으로 AI 제안을 받아들임 · human = 사람이 직접 고름
ALTER TABLE reports ADD COLUMN severity_by TEXT NOT NULL DEFAULT '' CHECK (severity_by IN ('', 'ai', 'human'));
