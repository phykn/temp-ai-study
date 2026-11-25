-- 보낸 안내문 칸 (Supabase) · SPEC 9.3절 · SQL Editor에 붙여 넣고 Run
-- [보내기]를 눌러야 저장된다 (초안은 저장하지 않음)
alter table reports
  add column notice text not null default '' check (char_length(notice) <= 1000);
