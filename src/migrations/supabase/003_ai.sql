-- AI 분류 제안 칸 3개 (Supabase) · SPEC 9.1절 · SQL Editor에 붙여 넣고 Run
-- 제안은 여기에만 저장하고, 사람이 [승인]해야 severity · category로 옮겨진다
alter table reports
  add column ai_severity text not null default '' check (ai_severity in ('', 'urgent', 'warning', 'info')),
  add column ai_category text not null default '' check (ai_category in ('', 'ELECTRIC', 'HVAC', 'IT_DEVICE', 'BUILDING')),
  add column ai_reason   text not null default '';
