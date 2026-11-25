-- 보낸 안내문 칸 (SQLite) · SPEC 9.3절 · 서버가 켤 때 한 번만 자동 실행됨
-- [보내기]를 눌러야 저장된다 (초안은 저장하지 않음)
ALTER TABLE reports ADD COLUMN notice TEXT NOT NULL DEFAULT '' CHECK (length(notice) <= 1000);
