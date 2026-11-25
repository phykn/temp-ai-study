-- 신고 테이블 (SQLite) · 서버가 켤 때 한 번만 자동 실행됨
-- "중 하나" 규칙은 CHECK로 DB에서도 막는다 (SPEC 6절)
CREATE TABLE reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  body          TEXT NOT NULL DEFAULT '',
  location      TEXT NOT NULL CHECK (length(location) BETWEEN 1 AND 50),
  building      TEXT NOT NULL DEFAULT 'office' CHECK (building IN ('office', 'plant')),
  asset_id      TEXT NOT NULL DEFAULT '',
  reporter_name TEXT NOT NULL CHECK (length(reporter_name) BETWEEN 1 AND 20),
  severity      TEXT NOT NULL DEFAULT 'none' CHECK (severity IN ('urgent', 'warning', 'info', 'none')),
  category      TEXT NOT NULL DEFAULT 'none' CHECK (category IN ('ELECTRIC', 'HVAC', 'IT_DEVICE', 'BUILDING', 'none')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'resolved')),
  assignee      TEXT NOT NULL DEFAULT '' CHECK (assignee IN ('', '이주임', '최대리', '정사원', '한과장')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
