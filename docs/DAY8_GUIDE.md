# 8일차 · 바이브코딩·Agent 개발 방법론 ③ — 수업 준비 가이드

새 서비스 **SDI 시설 신고함**(사내 시설·장비 고장 신고 → 시설팀이 사람이 다칠 수 있는 고장부터 처리)을
기획서 `SPEC.md`만 보고 화면 → API → DB로 붙이고(랩업), Claude API로 AI 기능을 넣고(M1),
테스트·평가셋·Stop 훅으로 자동 채점하고(M2), Vercel 배포와 보안 점검(M3)까지 가는 날.

- 실습 사이트: https://samsungsdi-aibuilder-w2.vercel.app/ (DAY 8)
- 강의 PDF: [reference/sdi_day8_lecture.pdf](../reference/sdi_day8_lecture.pdf) (95쪽)
- 요청문 빈칸 · 모범 예시 24개: [reference/PROMPTS.md](../reference/PROMPTS.md) (사이트 빈칸 빌더에서 추출)
- 루트 = 실습 작업 폴더(`reference/start/`에서 가져옴 · 여기서 작업) · [reference/](../reference/) = 받은 원본(고치지 않음)
- 프로젝트 안내(파일 지도 · 요청문 3줄)는 [README.md](../README.md) — 수강생용 원본이라 그대로 둠
- 준비물: **Node 24**(내장 `node:sqlite` · `node:test` 사용 · 패키지 설치 없음) · Supabase(7일차 프로젝트, 선택) · Anthropic 키(없으면 `AI_MODE=replay`) · GitHub · Vercel 계정(M3)

## 받은 자료 (`reference/`)
| 폴더 | 쓰는 때 | 내용 |
|---|---|---|
| `start/` | 랩업 | SPEC.md · README · CLAUDE.md · `data/seed.json`(신고 40건) · `tests/api.test.js`(고정 10개) · `peek.js` |
| `roulette/` | 1-0 | 회식 메뉴 룰렛 (따로 열어서 진행 · 포트 8090 · 테스트 4개) |
| `kit_m1/` | 랩업 끝 → M1 | `SPEC_M1.md`(AC-06~12) · prompts · replay(녹화 응답) · `assets.json` · `HANDOFF.md` · `002_ai.sql` · `page.test.js` · PostToolUse 훅 |
| `kit_m2/` | M2 | `eval/golden.json`·`run_eval.js` · `feedback_cards.md` · `reviewer.md` · `SPEC_M2_미션.md`(AC-18·19) |
| `kit_m3/` | M3 | `DEPLOY.md` · `vercel.json` · `deploy.test.js` · `injection_samples.md` · `SECURITY_CHECK.md` · `SPEC_M3.md`(AC-16·17) |
| `buggy/` | 2-2 ①② | M1 완성본에 버그 3개 (35개 중 3개 빨간불) · Stop 훅 / prompt 훅 / deny 예시 |

## 진행 순서

### 0. 시작 전 (처음 1회)
- Code 탭에서 이 폴더(`11_day_08`)를 연다 · `node -v` → v24.x
- `npm test` → **10개 모두 ✖** (아직 `public/index.html` · `server.js` · `db.js`가 없음 = 아침 목표)
- `.env.example` → `.env` 복사: Supabase(`SUPABASE_URL` · `SUPABASE_SECRET_KEY` · **Secret 키**) 또는 `DB_MODE=sqlite` 한 줄
- 로그인 없음(SPEC 8절) · 실습 하나 = 세션 하나: `npm test` → `HANDOFF.md` 한 줄 → `/clear`

### 랩업 · 기획서 → 화면 · API · DB (6·7일차 복습)
요청문은 3줄 `[어디] [무엇] [확인]` · [무엇]에 SPEC 절 번호.
| 순서 | 실습 | 할 일 | 완료 기준 |
|---|---|---|---|
| 1 | 시작 | SPEC 1~8절 읽기 · README 파일 지도 · `npm test` 빨간 이름 3개 읽기 | AC ↔ 테스트 이름 짝 (AC-03 ↔ "제목이 비면 400") |
| 2 | ① 화면 (SPEC 3·4절) | `public/index.html` 하나만 · 데이터는 화면 안 | 신고 칸 · 상태 탭+건수 · 카드 40장 · 배지 색(긴급 빨강·주의 주황·정보 회색·미분류 점선) |
| 3 | ② API (SPEC 5절) | `server.js` · `db.js`(메모리 배열) · 화면은 fetch | `npm test` 10/10 · 신고 → '미분류 · 접수' · 터미널 `[화면→API]` 줄 |
| 4 | ③ DB (SPEC 6절) | `migrations/` + `db.js` (supabase · sqlite · memory) | 껐다 켜도 남음(AC-05) · Table Editor / `npm run peek` · 테스트 10 그대로 |
| 5 | 마무리 | 신고 "2층 천장에서 물이 샙니다"(사무동 2F 복도) 남기기 · 다른 신고 하나 배정→완료 · **kit_m1 풀기** · SPEC_M1 붙이기 · `.env`에 AI 줄 | `npm test` **11/11** · 누수 신고는 접수 그대로 |

### M1 · 신입 채용 — Claude API로 AI 기능 (AI는 제안, 확정은 사람 [승인])
| 순서 | 실습 | 할 일 | 완료 기준 |
|---|---|---|---|
| 6 | 1-0 룰렛 (몸풀기) | `reference/roulette`를 **복사해서** 열기 · AC-R1~R5 | 갑각류+해장 → 화룡 중화요리가 '뺀 곳'에 · 룰렛은 Math.random |
| 7 | 1-1 수습 평가표 | 내 기준 4줄 vs SPEC 9절 비교 · 코드 0줄 | HANDOFF.md 평가표 · SPEC에 없는 기준 1개 |
| 8 | 1-2 자동 분류 + [승인] | 구조화 출력 · `checkAiResult` · (Supabase는 `002_ai.sql` Run) | 누수 → 제안 긴급 · 승인 전 배지 그대로 |
| 9 | 1-3 담당 추천 (도구) | 4요소 첫 작성 · `get_handler_load` 조회만 | 이름·이유·도구명 · 상태는 접수 그대로 |
| — | 미션 (어려움) | 두 번째 도구 `get_asset_history` · `data/assets.json` | PR-3F-02 → "교체 검토" · "최근 7일" 기준 시각 내가 정함 |
| 10 | 1-4 안내문 스트리밍 | 안전 문구는 서버 고정 문장 | 글자가 흘러나옴 · 끊겨도 받은 글 유지 · [보내기] 전 저장 안 됨 |
| 11 | 1-5 고장 주입 4종 | auth · slow · empty · refusal · 테스트 먼저 | `fault.test.js` · AI 503이어도 신고 201 · 끝나면 `AI_FAULT` 지움 |
| 12 | 1-6 챗봇 (필수) | 최근 10턴만 전송 · FAQ 근거 | 21턴 이상 400 · `chat.test.js` |
| 13 | 1-7 usage 표 | **강사 화면** `node --env-file=.env eval/usage_demo.js` | 캐시 읽기 > 0 · effort low도 분류 같음 → 9일차 운영비 |
| — | Batch 설명 | 긴급 신고는 Batch 금지 | 한 줄 말하기 (스크립트 없음) |

### M2 · 수습 평가 — 에이전틱 QA 루프
| 순서 | 실습 | 할 일 | 완료 기준 |
|---|---|---|---|
| 14 | 2-1 AC → 테스트 · 평가셋 | kit_m2 풀기 · ① 확인만(AC 표) ② 빠진 AC 추가 · `node eval/run_eval.js` | 테스트 통과 · 정확도 표(녹화 기준 10건 중 6건 안팎) |
| — | 미션 ① 판단 보류 · ② 현장 수정 → 평가셋 후보 | `SPEC_M2_미션.md` 붙이기 | 보류 상한 이하 · 목록 밖 심각도 400 |
| 15 | 2-2 ① Stop 훅 읽기 | `reference/buggy`를 **복사해서** 열기 · `npm test` | 35개 중 3개 빨간불 · settings.json 읽기 |
| 16 | 2-2 ② /goal | 예측(칸 · 바퀴 수) → `/goal npm test가 모두 통과하게…` · 잠금 확인 2회 | 35/35 · 테스트 삭제 거절(규칙 → deny) |
| 17 | 2-2 ③ 내 폴더에 Stop 훅 | buggy 설정을 내 `.claude/settings.json`에 | 짧은 보고가 막히고 다시 일함 |
| 18 | 2-3 현장 피드백 → QA 루프 | 카드 1장 → G/W/T 직접 · 리뷰어(읽기 전용) · 테스트 뚫기 1회 | 스크린샷 · 콘솔 에러 0 · 보강 테스트 1개 |

### M3 · 정식 배치 — 배포 · 보안 · 운영
| 순서 | 실습 | 할 일 | 완료 기준 |
|---|---|---|---|
| 19 | 3-1 Vercel 배포 | kit_m3 풀기 · SPEC_M3 붙이기 · 배포 전 점검 요청문 · `DEPLOY.md` 1~3 | 휴대폰 접속 → 신고 → AI 분류 → 승인 · 관찰 ①(SQLite는 시드로 돌아감) ②(남의 신고 완료 가능) |
| — | 운영 | 재배포 · Rollback → Promote · Logs | `/classify` 로그 줄 찾기 |
| 20 | 3-2 인젝션 · 연타 | 공격 1 체험 → 방어 4겹(테스트 먼저) → `/goal` | 공격 1 → 긴급 · 11번째 429 · SECURITY_CHECK AI 표 |
| 21 | 3-3 배포 방법 비교 (읽기) | Vercel+Supabase / SQLite / Railway / Docker / 사내 서버 | "회사로 갈 때 바뀌는 칸 두 개" = DB 창구 · 로그인 창구 |
| 22 | 3-4 팀 도입 (토의) | 우리 팀에 무엇부터 · SECURITY_CHECK 4절 | 한 줄 → 9일차 기획서 · 1-7 표 → 운영비 |
| 끝 | 실습 기록 | 사이트에서 "실습 기록 내려받기(.md)" | 9일차 기획서에 사용 |

## 강사가 따로 준비할 것 (zip에 없음)
- **따라잡기 폴더 `wrapup_after_1`**(랩업 ① 화면 완성) · **`wrapup_done`**(랩업 완성 · M1 입장 조건) — 사이트는 "강사에게 받기"로 안내. 받은 자료에는 없음
- M2·M3 정답 폴더도 없음 (`buggy/`가 사실상 M1 완성본 + 버그 3개)
- 1-7 시연용 실제 Anthropic 키 · 수업 후 Vercel 프로젝트 삭제 (로그인 없는 서비스)

## 주의 · 자주 막히는 곳
- 테스트가 "5초 안에 서버가 응답하지 않았습니다" → `server.js`가 `PORT` 환경변수를 안 씀
- Supabase 목록 0건 · 401 · 403 → 공개 키(Publishable)를 넣음 → Secret 키로, 아니면 `DB_MODE=sqlite`
- `column "ai_…" does not exist` → Supabase에 `002_ai.sql` 미실행
- 1-4 글자가 한 번에 나옴 → "받은 조각을 바로 write로 보내 줘" · 1-6 챗봇 창이 처음부터 열림 → `[hidden]` 처리
- 1-5 slow 테스트 20초 → 테스트에서만 `AI_TIMEOUT_MS` 짧게
- 미션 "최근 7일": 실습 데이터는 11/17~24 → 수업 날짜 기준으로 세면 0건
- 3-1 화면까지 500 → `server.js` 맨 아래 `export default handle;` 없음 (`deploy.test.js`가 잡음)
- 같은 오류를 두 번 고쳐도 그대로면 Esc 두 번으로 되돌리고 요청문을 고쳐 다시
