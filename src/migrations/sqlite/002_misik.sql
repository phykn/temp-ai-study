-- 회식 메뉴 가챠(미식) 테이블 (SQLite) · docs/SPEC_MISIK.md
-- 등급별 뽑힐 가중치 (R 6 · SR 3 · SSR 1)
CREATE TABLE misik_grades (
  grade  TEXT PRIMARY KEY CHECK (grade IN ('R', 'SR', 'SSR')),
  weight INTEGER NOT NULL CHECK (weight BETWEEN 1 AND 100),
  stars  INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5)
);

CREATE TABLE misik_menus (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE CHECK (length(name) BETWEEN 1 AND 30),
  grade      TEXT NOT NULL REFERENCES misik_grades (grade),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 좋아요(1) · 싫어요(-1)를 누를 때마다 한 줄씩 쌓임
CREATE TABLE misik_votes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id    INTEGER NOT NULL REFERENCES misik_menus (id) ON DELETE CASCADE,
  value      INTEGER NOT NULL CHECK (value IN (1, -1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 뽑기 기록: 메뉴가 지워져도 기록은 남도록 이름 · 등급을 함께 저장
CREATE TABLE misik_draws (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id   INTEGER REFERENCES misik_menus (id) ON DELETE SET NULL,
  menu_name TEXT NOT NULL,
  grade     TEXT NOT NULL CHECK (grade IN ('R', 'SR', 'SSR')),
  user_name TEXT NOT NULL,
  drawn_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
