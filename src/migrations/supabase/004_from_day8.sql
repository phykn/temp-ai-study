-- src/migrations/supabase/004_from_day8.sql — 8일차 Supabase 프로젝트를 그대로 쓸 때만 · SQL Editor에 붙여 넣고 Run (001 → 002 → 003 다음)
-- 왜: 8일차에 만든 ai_severity · ai_category 칸은 'none'(해당 없음)을 허용하지 않는다.
--     9일차 코드(002_ai.sql 기준)는 AI가 'none'을 제안할 수 있어서, 그대로 두면 저장할 때 오류가 난다.
--     002_ai.sql은 "칸이 없을 때만 추가"라 이미 있는 칸의 허용 값은 바꾸지 못한다 → 여기서 허용 값을 다시 정한다.
-- 여러 번 Run해도 안전하다 (있으면 지우고 다시 만듦). 새 Supabase 프로젝트라면 실행하지 않아도 된다.

alter table public.reports drop constraint if exists reports_ai_severity_check;
alter table public.reports add constraint reports_ai_severity_check
  check (ai_severity in ('', 'urgent', 'warning', 'info', 'none'));

alter table public.reports drop constraint if exists reports_ai_category_check;
alter table public.reports add constraint reports_ai_category_check
  check (ai_category in ('', 'ELECTRIC', 'HVAC', 'IT_DEVICE', 'BUILDING', 'none'));
