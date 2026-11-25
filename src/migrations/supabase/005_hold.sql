-- AI 판단 보류 칸 (Supabase) · SPEC 10.2절 · SQL Editor에 붙여 넣고 Run
-- 1이면 AI가 "사람 확인 필요"라고 한 제안
alter table reports
  add column ai_hold integer not null default 0 check (ai_hold in (0, 1));
