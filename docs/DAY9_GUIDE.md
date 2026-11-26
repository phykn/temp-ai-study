# 9일차 · 오전 실습 — 개발 루프 · 내 주소로 배포 (수업 준비 가이드)

- 실습 사이트: https://samsungsdi-aibuilder-w2.vercel.app/ (DAY 9)
- 강의 PDF: [sdi_day9_lecture.pdf](sdi_day9_lecture.pdf) (40쪽)
- 준비물: Node 24 · GitHub · Vercel · 8일차 Supabase 프로젝트 · Anthropic 키(선택)

## 폴더 구조 (8일차와 같은 방식)
```
12_day_09/
├─ server.js        입구만 (npm start · Vercel 둘 다 여기로)
├─ api/index.js     Vercel 함수 입구
├─ vercel.json · .vercelignore · package.json · CLAUDE.md · .env
├─ public/          화면 (고정 테스트가 이 위치를 봐서 루트에 둠)
├─ src/             서버 코드: server.js · db.js · ai.js · prompts/ · migrations/
├─ data/ · tests/
├─ docs/            SPEC.md · HANDOFF.md · 이 가이드 · 강의 PDF
└─ practice/        loop_start (실습 1 · Code 탭에서 이 폴더를 따로 연다)
```
- `.env`: 8일차 `.env` 복사 · git `origin` = 8일차와 같은 `phykn/temp-ai-study` (push는 요청할 때)
- 9일차에 안 쓰는 eval/ · README · 8일차 문서(DEPLOY · SECURITY_CHECK · injection_samples · feedback_cards)는 뺐음 (원본은 사이트 zip)

## 오늘 사이트 기준 (폴더 문서와 다를 때)
- 사이트 원본 m3_done 문서에 `DB_MODE=sqlite` · `AI_MODE=replay` · `npm run peek`가 나와도 **따라 하지 않음**. 코드는 Supabase만, AI는 항상 실제 호출.
- Vercel 환경변수: `SUPABASE_URL` · `SUPABASE_SECRET_KEY`(필수) · `ANTHROPIC_API_KEY` · `AI_MODEL`(선택, 기본 claude-sonnet-5-5)
## 실습 1 · 개발 루프 (45분 · `practice/loop_start`)
Claude = 신입, 나 = 판정하는 선배. "됐어요"가 아니라 기준과 자동 채점으로 판정.
| 예제 | 할 일 | 완료 기준 |
|---|---|---|
| 1-1 초록불인데 사고 | `npm test` → `npm run demo` | 8/8 통과인데 '문제' 2줄(앞쪽 걸침 · 전체 덮음) |
| 1-2 기준 읽기 | `feedback_cards.md` FB-1~3 = AC-9~13 | 7일 O · 8일 X 경계 설명 (시작·종료일 모두 셈) |
| 1-3 Stop 훅 + 잠금 | `.claude/settings.json`: 멈추기 전 `node --test` · 실패 시 못 멈춤 · npm test 허용 · `.claude`/`tests/base.test.js` deny | Claude 설명에서 '자동 채점'·'못 고침' 확인 |
| 1-4 /goal | AC-9~13 → SPEC 5절 · 새 테스트 · 빨간불 먼저 · 구현 · 테스트 수정 금지 | 구현 전 빨간불 **4개**(AC-12는 원래 통과) · demo '모두 기대대로' · RUN_LOG 1라운드 |
| 1-5 reviewer | `.claude/agents/reviewer.md` 읽기 전용 점검 · 파일:줄 근거만 | 지적 하나를 원래 세션에 전달 |
| 1-6 깨 보기 | 현장 입력으로 깨뜨려 `tests/break.test.js` | 힌트: 기존 대여 끝난 **다음 날** 시작 신청 |
| 1-7 일지 | RUN_LOG.md 질문 4개 + 내 과제 합격 기준 한 줄 | 오후 기획서 '검증 방법' 칸 |

## 실습 2 · 내 주소로 배포 (40분 · 루트)
| 예제 | 할 일 | 완료 기준 |
|---|---|---|
| 2-1 | Git · GitHub · Vercel 한 줄씩 | 키는 Vercel 입력칸에만 |
| 2-2 배포 전 점검 | `npm test` → 7개 (deploy.test.js 4개 포함) | export default · vercel.json 설명 · 환경변수 표 |
| 2-3 GitHub | 사이트는 Private 저장소 + 웹 업로드. **우리는 8일차 저장소에 push** | 저장소 첫 화면에 server.js · .env 없음 |
| 2-4 Vercel | 8일차 프로젝트 재사용 · 환경변수 확인 · Supabase SQL 002 → 003 → 004(8일차 DB용) | 이름 오타 없음 |
| 2-5 Deploy | 휴대폰 접속 → 신고 → [AI 분류] → [승인] | 40건 · 내 신고 · 제안 또는 '직접 처리해 주세요' |
| 2-6 관찰 · 마무리 | ① 데이터 남나 ② 로그인 없으면 | 관찰 2줄 · 수업 후 프로젝트 삭제 · 키 폐기 |

## 실습 2 결과 (2026-11-26 강사 리허설)
- 배포 주소: https://temp-ai-study.vercel.app (GitHub `phykn/temp-ai-study` main push → Vercel 자동 배포 · 8일차 커밋 이력 위에 9일차 커밋)
- Supabase(8일차 프로젝트): SQL 002 → 003 → 004 실행 완료 · 칸 4개(ai_status · answer · ai_corrected · ai_before) 추가 · 'none' 허용 · 기존 신고 40건 유지

| 예제 | 확인한 것 | 결과 |
|---|---|---|
| 2-2 배포 전 점검 | `npm test` | 7/7 통과 (deploy.test.js 4개 포함) · api/index.js와 루트 server.js가 같은 handle |
| 2-3 GitHub | 올라간 파일 | `.env` · 강의 PDF 없음 |
| 2-4 환경변수 | 8일차 Vercel 값 그대로 | `SUPABASE_URL` · `SUPABASE_SECRET_KEY` · `ANTHROPIC_API_KEY` 이름 같음 (9일차는 `DB_MODE`를 읽지 않음) |
| 2-5 휴대폰 흐름 | 신고 작성 → [AI 분류] → [승인] | 42번 "2층 천장에서 물이 샙니다" → 제안 긴급 · 건물(승인 전 배지 그대로) → 승인 후 긴급 · 건물 |

**관찰 2줄 (2-6)**
1. 데이터가 남나? → 남는다. 다시 배포해도 8일차 신고 40건이 그대로다. 저장이 Vercel이 아니라 Supabase에 되기 때문.
2. 로그인이 없으면? → 주소만 알면 누구나 신고를 쓰고, 내 키로 AI를 부르고, 남의 신고를 [완료]할 수 있다(42번을 로그인 없이 PATCH → 200 · resolved). 연타 제한(1분 10번 → 429)은 비용 상한이 아니다.

**마무리 (삭제는 하지 않고 방법만 확인)**
- Vercel 프로젝트 삭제: Vercel → 프로젝트 → Settings → 맨 아래 Delete Project
- 수업용 Anthropic 키: 수업 후 console에서 폐기 예정
- 확인용 42번 신고는 남겨 둠 (상태 resolved)

## 강사 체크 (수업 전)
- [x] Supabase SQL Editor에서 `src/migrations/supabase/` 002 → 003 → 004 실행 — 8일차 DB에는 ai_status · ai_corrected · ai_before 칸이 없고, ai_severity · ai_category가 'none'을 허용하지 않음(004가 고침). 모두 여러 번 Run해도 안전
- [x] push 완료 — 8일차 배포 주소가 9일차 코드로 바뀜 (8일차 커밋 이력은 남아 있음)
- [ ] `.env`의 키 중 이번에 필요한 건 `SUPABASE_URL` · `SUPABASE_SECRET_KEY` · `ANTHROPIC_API_KEY`뿐

## 막혔을 때
| 증상 | 해결 |
|---|---|
| Claude가 계속 못 멈춤 | 실패 테스트 읽기 · /clear 후 한 줄 요청 |
| 훅이 안 돎 | 새 세션에서 폴더 다시 열기 |
| 목록 서버 오류 · SUPABASE_* 필요 | 환경변수 이름 확인 → Redeploy |
| 401/403 | Publishable 키 → Secret 키 |
| 테이블/칸 없음 | SQL 001 → 002 → 003 (8일차 DB면 004까지) |
| 환경변수 고쳤는데 그대로 | Redeploy |
| 404 · 빈 화면 | 폴더째 올림 → server.js가 첫 화면에 오게 |
| default export must be a function | server.js 맨 아래 `export default handle;` 복구 |
