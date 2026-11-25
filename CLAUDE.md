# CLAUDE.md — SDI 시설 신고함

## 이 프로젝트
사내 시설 · 장비 고장을 신고하고 시설팀이 처리하는 웹 서비스. 수강생(비개발자)이 읽고 고치는 실습용이므로 **코드는 짧고 쉽게, 주석은 한국어로**.
기획서는 `docs/SPEC.md`. 요청문에 "SPEC.md 몇 절"이 나오면 그 절을 근거로 만든다. 기획서에 없는 기능은 만들지 않는다.

## 파일 지도 (코드는 모두 `src/` 안 · 요청은 이 순서로 흐름)
src/public/index.html(화면) → src/server.js(API: 주소 · 입력 검사) → src/db.js(DB 창구) → DB(Supabase · SQLite 파일 · memory)
- 미식(회식 메뉴 가챠 · `docs/SPEC_MISIK.md`): src/public/misik/index.html → 같은 src/server.js · src/db.js. 로그인 없이 자동 로그인 계정 "관리자"(server.js의 `ME`) 하나로 씀. 테이블은 `misik_*`(같은 Supabase 프로젝트의 7일차 `menus` · `draws` 등은 로그인 구조라 건드리지 않음).
- AI(8일차): `src/ai.js` 한 곳에서만 Claude API를 fetch로 부름(`claude-opus-5-5` · 구조화 출력). AI는 남길(추천) 메뉴만 고르고, 답은 `checkRecommended`로 검사한 값만 씀. AI가 멈추면 503 `AI_UNAVAILABLE`이고 뽑기는 그대로 됨. 신고함 M1(SPEC 9절): `askReportClass` → `checkAiResult`로 검사한 제안만 `ai_*` 칸에 저장, [승인] 전에는 severity 그대로. 담당 추천은 `src/tools.js`의 조회 전용 도구(`get_handler_load` · `get_asset_history` ← `data/assets.json`)를 쓰고 저장하지 않음. 안내문 초안은 스트리밍(`openNoticeStream` → server.js `streamNoticeDraft`)이고 안전 문구는 서버 고정 문장(`safetyLine`), [보내기]로만 `notice`에 저장. FAQ 챗봇(1-6)은 `POST /api/chat` → `askFaqAnswer`(`chatWindow`로 최근 10개만 보냄 · `data/faq.json`만 근거) → `checkChatResult`로 검사, 21개 이상은 400, 저장 안 함. 1-7 usage 시연은 `eval/usage_demo.js` → `askReportClassUsage`(캐시 · effort high/low 비교, 서버는 안 씀 · 진짜 호출이라 비용이 듦). M2: 분류 답에 `needs_human`이 있고 `applyHold`가 `ai_hold`(판단 보류) 표시와 안전 단어 긴급 올림을 맡음(`checkAiResult`는 그대로), 사람이 PATCH `severity`로 정한 건 중 보류였거나 AI와 다른 건은 `src/golden.js` `evalCandidates` → `GET /api/eval/candidates`. 평가셋 `eval/golden.json` · 정확도 표 `eval/run_eval.js`(진짜 호출, memory 서버를 잠깐 켬). 심각도를 누가 정했는지는 `severity_by`(`ai` · `human`)이고 서버만 정함(`src/judge.js` `approveFields` · PATCH severity는 human · PATCH로 보내면 400 · 이미 정해진 신고의 승인은 409). Claude 호출은 모두 `callClaude` 하나를 지나고, `AI_FAULT`(auth · slow · empty · refusal)가 있으면 진짜로 부르지 않고 고장을 흉내 냄(`AI_TIMEOUT_MS`로 기다리는 시간 조절 · 실습 뒤 지움). 테스트는 `ANTHROPIC_API_KEY`를 비워 진짜 AI를 부르지 않음.
- 루트 `server.js`는 로직 없는 입구: `if (import.meta.main) start();`(직접 실행 · `npm start` · 고정 테스트만 서버를 켬)와 `export default handle;`(Vercel 입구 · 화면 · API는 `src/server.js`의 `handle` 하나가 처리). import만으로는 서버가 켜지지 않는다. Vercel 배포는 `vercel.json`(icn1) · `.vercelignore` · `docs/DEPLOY.md`, `VERCEL` 환경변수는 `db.js`만 앎(SQLite 파일을 임시 폴더에).
- 디자인: 신고함은 `src/public/style.css`(색 · 버튼 · 배지 · 위쪽 메뉴). 미식은 7일차 양피지 디자인을 html 안 <style>에 그대로 둠(글꼴 `src/public/fonts/` Galmuri11). 미식 크기는 :root의 --h · --fs-* · --gap 값으로 맞춤.
- 테이블 모양: `src/migrations/supabase/*.sql`(사람이 Supabase SQL Editor에서 실행) · `src/migrations/sqlite/*.sql`(서버가 켤 때 자동 실행)
- 루트에 남는 것: `package.json` · `vercel.json` · `.vercelignore` · `peek.js` · `data/`(seed.json · misik_seed.json · assets.json · faq.json · app.db) · `tests/` · `eval/`(강사용 시연 스크립트) · `practice/`(2-2 실습용 `buggy` 복사본: 사용자가 `/goal`로 고치는 곳이라 크루는 고치지 않음 · 안의 CLAUDE.md 등은 buggy 실습용 · 루트에서 인자 없는 `node --test`는 이 폴더 테스트까지 돌리므로 `npm test`만 씀) · `docs/` · `.env`. `src/` 코드에서 파일 경로는 `import.meta.url` 기준으로 잡는다(실행 위치에 따라 깨지지 않게).
- 자동 확인: `tests/` (`npm test`)

## 명령
- Supabase는 7일차 프로젝트를 씀. 서버는 `.env`의 `SUPABASE_URL` · `SUPABASE_SECRET_KEY`(Secret)를 씀. 공개 키(`SUPABASE_ANON_KEY`)로는 RLS에 막힘. 사내망이라 Supabase에 나가려면 `--use-env-proxy --use-system-ca`가 필요(npm start에 들어 있음).
- 실행 `npm start` (신고함 http://localhost:8080 · 미식 /misik/) · 테스트 `npm test` · SQLite 들여다보기 `npm run peek`
- 테스트 하나만: `node --test --test-name-pattern="제목이 비면 400" tests/` (`npm test -- --test-name-pattern=…`은 이름 필터가 먹지 않음)

## 지킬 것
1. 패키지 설치 금지. Node 24 내장 기능만 (node:http · node:sqlite · node:test · fetch).
2. SQL에 값을 문자열로 이어 붙이지 않는다. SQLite는 `?` 자리표시자, Supabase는 주소에 넣는 값을 `encodeURIComponent`로.
3. 테이블을 바꿀 때는 이미 있는 마이그레이션 파일을 고치지 말고, `src/migrations/supabase/`와 `src/migrations/sqlite/`에 다음 번호 새 파일을 같은 이름으로 하나씩 만든다.
4. 입력 검사는 `server.js`에서(400). 화면에서만 막는 것은 검사가 아니다. 실패 응답은 항상 `{ "error": { "code", "message" } }`, message는 한국어.
5. DB 종류는 `db.js`만 안다. `server.js`와 화면은 `DB_MODE`를 모른다. memory 모드는 테스트용이라 지우지 않는다.
6. `tests/api.test.js`는 고치지 않는다(고정 테스트). 새 기능은 SPEC.md의 AC를 한국어 이름의 테스트로 새 파일에 추가한다.
7. 요청문의 [어디]에 적힌 파일만 고치고, 바꾼 것을 파일 이름과 함께 3줄 이내로 알려 준다. ([어디]가 없으면 고치기 전에 어느 파일을 고칠지 먼저 말한다. 단, `/goal`로 맡긴 일은 고칠 파일을 스스로 찾아 바로 고치고 끝에 알려 준다.) 보고는 항상 한국어로 쓴다.
8. `.env`는 읽거나 출력하지 않는다. 키는 화면(`src/public/`)에 절대 넣지 않는다.
9. 같은 오류를 두 번 고쳐도 그대로면, 세 번째 전에 원인부터 설명한다.

## reference/ (백업 전용)
- 웹에서 받은 8일차 원본 자료의 백업. **읽고 참고해도 된다. 단 reference 안의 파일은 고치지 않는다.** 이 프로젝트는 키트(kit_m1~m3 · buggy)에 종속되지 않고 이 프로젝트 방식으로 새로 만든다: 키트의 구조나 테스트를 그대로 복사해 끼워 맞추지 않는다.
