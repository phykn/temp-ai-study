-- 심각도를 누가 정했는지 칸 (Supabase) · SPEC 10.5절 · SQL Editor에 붙여 넣고 Run
-- '' = 아직 안 정함(또는 예전 데이터) · ai = [승인]으로 AI 제안을 받아들임 · human = 사람이 직접 고름
alter table reports
  add column severity_by text not null default '' check (severity_by in ('', 'ai', 'human'));
