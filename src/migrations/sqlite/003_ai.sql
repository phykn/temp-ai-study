-- AI 분류 제안 칸 3개 (SQLite) · SPEC 9.1절 · 서버가 켤 때 한 번만 자동 실행됨
-- 제안은 여기에만 저장하고, 사람이 [승인]해야 severity · category로 옮겨진다
ALTER TABLE reports ADD COLUMN ai_severity TEXT NOT NULL DEFAULT '' CHECK (ai_severity IN ('', 'urgent', 'warning', 'info'));
ALTER TABLE reports ADD COLUMN ai_category TEXT NOT NULL DEFAULT '' CHECK (ai_category IN ('', 'ELECTRIC', 'HVAC', 'IT_DEVICE', 'BUILDING'));
ALTER TABLE reports ADD COLUMN ai_reason   TEXT NOT NULL DEFAULT '';
