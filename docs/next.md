# next.md — 다음 세션 이어받기 (2026-11-25 기준)

규칙 · 파일 지도 · 명령은 `CLAUDE.md`가 기준이다. 여기에는 지금까지 한 일, 정한 것, 걸렸던 함정만 적는다.

## 지금 상태: 다 돌아감
- 신고함(http://localhost:8080)과 미식 회식 메뉴 가챠(/misik/)가 Supabase에서 돌아간다. 미식에는 Claude AI 추천, 신고함에는 AI 분류 제안 + [승인]이 붙어 있다.
- `npm test` 74개 통과 (고정 api 10개 + 미식 9개 + 화면 2개 + 신고 AI 10개 + 고장 주입 4개 + 챗봇 6개 + usage 시연 5개 + 평가 · 보류 · 후보 9개 + 판단 주체 6개 + 배포 7개 + 보안 6개) · 약 10초.
- **M3 끝 (2026-11-25)**: 3-1 배포 확인됨(https://temp-ai-study.vercel.app · GitHub `phykn/temp-ai-study` main push로 자동 배포). 3-2 인젝션 · 연타 방어 4겹(SPEC 12절 · `tests/security.test.js`) · 3-3 배포 방법 비교 · 3-4 팀 도입 한 줄 초안은 `docs/SECURITY_CHECK.md`. 남은 사람 몫: 수업 뒤 Vercel 프로젝트 삭제 · 3-4 한 줄을 토의로 고쳐 쓰기.
- **M2 끝 (2026-11-25)**: 사용자 몫이던 buggy 35/35 · 잠금 확인 · 루트 `.claude/settings.json`(Stop · PostToolUse 훅 + deny, allow는 뺌) · 화면 확인(판단 표시 · 콘솔 에러 0 · `docs/screenshots/2-3_판단표시.jpg`)까지 크루가 진행하고 완료 표기(HANDOFF 'M2 사용자가 할 일'). **루트 훅이 켜져 있음**: 파일을 고치면 `npm test`가 돌고, 멈출 때 보고에 바뀐 파일 이름 · 통과 수가 없으면 막힘. 끄려면 `.claude/settings.json`을 지움. 다음은 M3 3-2.
- **M1 끝 · M2 크루 몫 끝**(2-1 · 미션 ①② · 2-2 ①의 복사와 빨간불 확인 · 2-2 ②③의 설명과 설정안 · 2-3 FB-1). **사용자 몫이 남음**: `practice/buggy`에서 `/goal` · 잠금 확인 2회 · `.claude/settings.json`에 Stop 훅 넣기 · 화면 스크린샷 · 콘솔 에러 0 확인(목록은 HANDOFF.md 'M2 사용자가 할 일'). 그 뒤 M3 3-1. Supabase에 `005_hold.sql` · `006_severity_by.sql` 실행 완료. 실습 순서 · 완료 기준은 `docs/DAY8_GUIDE.md` M1 표, 실습별 한 줄 기록은 `docs/HANDOFF.md`.
- **M3 3-1 Vercel 배포 준비 끝(코드 · 문서), 실제 배포는 사용자 몫**: 할 일 목록은 HANDOFF.md '3-1', 순서는 `docs/DEPLOY.md`. 다음은 3-2 보안 점검.
- **Vercel 배포 끝**: https://temp-ai-study.vercel.app (Supabase · 진짜 AI). `api/index.js` + `vercel.json`(outputDirectory · rewrites · includeFiles)로 함수가 돎. push하면 자동 재배포. 휴대폰 확인 · 관찰 ①② · 운영 · 끝나면 Delete Project는 사용자 몫. Vercel 로그 · 설정은 크루가 못 봄(브라우저 둘 다 회사 정책으로 vercel.com 차단) → 배포 확인은 curl(이 PC 네트워크는 됨, node fetch는 `--use-env-proxy --use-system-ca` 필요).
- **GitHub 올리기 끝**: 이 폴더가 git 저장소가 됨(`main` → origin https://github.com/phykn/temp-ai-study, **공개**). `.gitignore`에 `reference/` · `practice/` · `.crew/` 추가. 크루 내장 브라우저는 vercel.com이 회사 정책으로 막힘 → Vercel Import · 환경변수 · Deploy는 사용자가 자기 브라우저로. 배포 주소를 받으면 크루가 curl로 확인(이 PC 네트워크로는 vercel.com 접속됨).

## 한 일 (순서대로)
1. 폴더 정리
   - 코드는 `src/`에 둔다. 루트에는 package.json · peek.js · data/ · tests/ · docs/ · .env와 한 줄짜리 입구 `server.js`만 둔다.
   - 문서는 CLAUDE.md · README.md만 루트에 두고 나머지는 docs/에 둔다.
   - `reference/`는 백업 전용이다. 읽고 참고해도 되지만 고치지 않고, 키트 구조나 테스트를 그대로 복사하지 않는다(이 프로젝트 방식으로 새로 만든다).
2. 랩업: SPEC.md 3~6절을 근거로 신고함의 화면 · API · db.js(supabase · sqlite · memory) · 마이그레이션을 새로 만들었다.
3. 7일차 미식을 가져옴 (`docs/SPEC_MISIK.md`)
   - 로그인 없이 자동 로그인 "관리자" 하나로 쓴다.
   - 테이블은 `misik_*`다. 7일차 `menus` · `draws`와 이름이 겹쳐서 접두어를 붙였다.
4. AI 붙임 (8일차, AC-08)
   - `src/ai.js`가 fetch로 `claude-opus-5-5`를 부르고 구조화 출력을 받는다.
   - 시간 제한은 60초, max_tokens는 16000이다.
   - AI는 조건에 맞는 메뉴와 이유만 추천한다. `checkRecommended`가 그 답을 검사한다.
   - AI가 멈추면 503 `AI_UNAVAILABLE`을 돌려주고, 뽑기는 그대로 된다.
5. 디자인
   - 신고함은 `src/public/style.css`의 깔끔한 디자인을 쓴다.
   - 미식은 7일차 양피지 디자인을 그대로 두고, 요소 크기 · 정렬만 맞췄다. 크기는 :root의 `--h`, `--fs-*`, `--gap` 등으로 정한다.
6. 메뉴 100개 (`data/misik_seed.json`)
   - 등급별로 R 60 · SR 30 · SSR 10개다.
   - 이름은 모두 실제 요리 이름이다. "한정식 코스" 같은 코스 · 식당 이름은 쓰지 않는다.
   - 같은 음식이 이름만 다르게 두 번 들어간 것은 다른 요리로 바꿨다.
   - 순서는 **높은 등급 → 같은 등급은 가나다순으로 데이터 자체를 정렬**해 두었다. 화면에서 정렬하는 코드를 넣지 말라는 사용자 지시가 있었다.
   - Supabase와 SQLite(`data/app.db`)의 `misik_menus`도 같은 100개를 같은 순서로 다시 넣었다. 좋아요 · 싫어요는 0건이고, 뽑기 기록은 이름으로 다시 연결했다.
7. 미식 화면 배치 (`src/public/misik/index.html`)
   - 왼쪽은 뽑기 카드 + 최근 뽑기, 오른쪽은 AI 추천 + 메뉴 목록이다.
   - **어떤 동작을 해도 UI가 움직이지 않게 고정**했다.
     - 최근 뽑기는 200px, 추천 메뉴 상자는 120px로 높이를 고정하고, 넘치면 상자 안에서 스크롤한다.
     - 오른쪽 칸은 `contain: size`를 써서 왼쪽 칸 높이를 따라가고, 메뉴 목록이 남는 높이를 채운다.
     - 860px 이하 폭에서는 두 칸을 위아래로 쌓고 메뉴 목록을 400px로 둔다.
     - 메뉴 추가 오류는 제목 줄 오른쪽에 띄운다.
     - 서버 오류 알림은 화면 위에 떠 있게(position: fixed) 해서 아래 칸을 밀지 않는다.
     - '지우기' 버튼은 숨기지 않고 비활성으로 둔다.
   - 확률 %는 소수 첫째 자리로 보여 주고, 반올림하다 남는 0.1을 나눠 줘서 합이 항상 100.0%가 되게 했다. 실제 뽑기는 서버가 원래 가중치로 한다.

8. M1 1-1 수습 평가표 (코드 0줄)
   - M1 = 신고함에 AI 붙이기(가이드 기준). 키트의 SPEC_M1은 reference에 있어 쓰지 않고, `docs/SPEC.md` **9절 AI 수습 평가 기준(9-1~9-5)**을 새로 씀.
   - `docs/HANDOFF.md`에 내 기준 4줄 vs 9절 비교. SPEC에 없는 기준 = "긴급을 낮춰 잡지 않는다(애매하면 높게)" → 9절에 넣을지는 아직 안 정함(프롬프트에도 안 넣음).
9. M1 1-2 자동 분류 + [승인] (SPEC 9.1절 · AC-06 · AC-07)
   - DB: `003_ai.sql`(sqlite · supabase)로 `reports`에 `ai_severity` · `ai_category` · `ai_reason` 칸 추가(기본 빈칸, CHECK). **Supabase에는 Management API로 실행 완료**.
   - `src/ai.js`: Claude 호출을 `askClaude()` 공통 함수로 뺌(미식 추천도 같이 씀). `askReportClass(report)`(SPEC 4절 기준 프롬프트 · enum 스키마 · 30초) + `checkAiResult(raw)`(목록 밖 값 · 빈 이유면 null → 서버가 503).
   - `src/server.js`: `POST /api/reports/:id/classify`(제안 칸에만 저장, 404 · 503) · `POST /api/reports/:id/approve`(제안 → severity · category, 제안 없으면 409). `aiDown(message)`로 메시지를 상황별로.
   - `src/db.js`: 세 store에 `get(id)` + `getReport` export. memory는 시드 행에 ai_* 빈칸을 채움.
   - 화면 `src/public/index.html`: 카드에 AI 줄("AI 제안 (배지) 이유" + 미분류일 때만 [승인] / 제안 없는 미분류는 [AI 분류]). 신고하면 그 신고를 자동 분류 요청(기다리지 않음). 승인하면 목록을 다시 받아 급한 순으로.
   - 테스트 `tests/ai.test.js` 3개(AI 멈춤 503 · 신고 그대로 / 답 검사 / 승인 409 · 404).
   - 실제 확인(memory + 진짜 AI): "2층 천장에서 물이 샙니다" → 제안 긴급("천장 누수로 바닥에 물이 고여 미끄러져 다칠 수 있음"), 배지는 미분류 그대로 → [승인] 후 긴급, 긴급 무리로 정렬됨.
   - Supabase에는 누수 신고를 아직 안 남김(가이드 랩업 5번 "누수 신고 남기기"는 사용자가 화면에서 할 일).
10. M1 1-3 담당 추천 (도구) + 미션 자산 이력 (SPEC 9.2절 · AC-08 · AC-09) · DB 변경 없음
   - `src/tools.js`(새 파일): 도구 설명 `TOOLS`(4요소: 이름 · 언제 쓰는지 · 받는 값 · 돌려주는 것) + `getHandlerLoad`(담당자별 '배정' 수) · `getAssetHistory`(assets.json + 같은 설비 신고 · `recent_7days` · `over_life`) · `runTool`. 모두 조회만.
   - **"최근 7일" 기준 시각 = 그 신고의 접수 시각**(그 신고 포함). 수업 날짜와 무관하게 같은 결과. PR-3F-02(신고 23번) → 8 · 14 · 23번 = 3건.
   - `data/assets.json`(새 파일, 직접 만듦): 시드에 나오는 설비 11개 · 도입일 · 내용연수 · 지난 수리. PR-3F-02는 2021 도입 · 내용연수 6년(안 지남) → 7일 3건 규칙으로 교체 검토.
   - `src/ai.js`: `askClaude`가 tools를 받으면 tool_use 루프(최대 5번, 전체 시간 제한 하나)를 돈다 + 구조화 출력으로 최종 답. `askHandlerRecommend`(실제로 실행된 도구 이름을 서버가 모음) · `checkRecommendResult`(4명 · 빈 이유 · 설비 번호 유무와 asset_advice가 맞는지).
   - `src/server.js`: `POST /api/reports/:id/recommend` → `{ assignee, reason, asset_advice, tools }`, 저장 안 함(상태 그대로) · 404 · 503.
   - 화면: 접수 카드 아래에 [담당 추천] → "추천 이름 · 이유 · 설비: 교체 검토 · 도구: …" 줄. 추천은 화면 메모리에만(새로고침하면 사라짐). 담당 고르기는 사람이.
   - 테스트 4개 추가(ai.test.js): 503 · 상태 그대로 / 답 검사 / handler load 수 / 7일 기준.
   - 실제 확인(memory + 진짜 AI): 23번 → 정사원 · 교체 검토 · 도구 2개(8초) / 25번 엘리베이터 → 한과장 · 수리 / 36번(설비 없음) → 정사원 · 도구 1개. 세 건 모두 상태 접수 그대로.
   - 함정: 백그라운드로 `npm start`를 켜고 TaskStop하면 npm만 죽고 node가 남아 포트를 잡고 있었다 → 확인용 서버는 `node --use-env-proxy --use-system-ca --env-file-if-exists=.env server.js`로 직접 켤 것.
11. M1 1-4 안내문 스트리밍 (SPEC 9.3절 · AC-10)
   - DB: `004_notice.sql`(sqlite · supabase)로 `reports.notice`(1000자 이하 · 기본 빈칸). **Supabase에 실행 완료**. memory 기본값에도 notice 추가.
   - `src/ai.js`: `safetyLine(severity)` = 긴급일 때만 서버 고정 안전 문장(AI가 안 씀). `openNoticeStream(report)` = `stream: true`로 부르고 SSE에서 text_delta만 내주는 async 반복자. 시작 전 실패는 AiError, 중간 끊김 · end_turn이 아니면 반복 중 AiError.
   - `src/server.js`: `POST /api/reports/:id/notice/draft`는 route()와 따로 `streamNoticeDraft(res, id)`가 처리(text/plain으로 안전 문구 → 조각을 바로 write). 시작 전 404 / 503 JSON, 시작 뒤 끊기면 `res.destroy()`. `POST /api/reports/:id/notice`는 저장(빈칸 · 1000자 넘으면 400). 초안은 저장 안 함.
   - 화면: 접수 · 배정 카드에 [안내문] → 글 칸이 열리고 조각이 흘러 들어감(글 칸만 갱신, 받는 동안 readonly). 끊기면 받은 글을 두고 "중간에 끊겼어요…". 고친 글은 input 이벤트로 상태에 담아 둠. [보내기] 성공하면 카드에 "보낸 안내문". 카드 아래 버튼들은 오른쪽에 모음.
   - 테스트 3개 추가(초안 503 · 저장 안 됨 / 보내기 200 · 400 · 404 / 안전 문구).
   - 실제 확인(memory + 진짜 AI): 1번(긴급) → 안전 문구가 먼저 오고, AI 글 28조각이 약 3초에 걸쳐 흘러옴. 초안만으로는 notice 빈칸. 화면에서 글자 수가 62 → 237로 늘어남 → 한 줄 고쳐 [보내기] → 카드에 보임. 받는 중에 서버를 끄면 받은 192자가 남고 "중간에 끊겼어요" 문장이 보임.
   - 이 단계의 서버 코드 수정은 heredoc 안의 node 스크립트로 했는데, 정규식 백슬래시가 템플릿 문자열에서 사라지는 일이 두 번 있었다(→ 서버가 안 켜져 테스트 전부 실패). 정규식이 들어가는 수정은 Edit로 할 것.
12. M1 1-5 고장 주입 4종 (SPEC 9.4절 · AC-11) · 테스트 먼저
   - `tests/fault.test.js`를 먼저 쓰고 0/4 빨간불 확인 → 구현 → 4/4. 고장마다 서버를 `AI_FAULT=…` · `AI_TIMEOUT_MS=300` · 키 빈칸으로 따로 켬. 503만으로는 "키가 없어서 503"과 구별이 안 되므로 **서버 stderr에 찍힌 이유**(401 · timeout · "AI 답이 비어 있습니다" · refusal)와 켤 때 경고 줄까지 확인. 신고 201 · 미분류 · 접수 그대로, 분류 · 담당 추천 · 안내문 초안 · 미식 추천 모두 503.
   - `src/ai.js`: Claude 부르기를 `callClaude(body, signal)` 하나로 모음(askClaude · openNoticeStream이 씀). `AI_FAULT`가 있으면 `fakeFault`가 진짜 고장과 같은 모양의 Response를 만듦(auth=401 · slow=abort까지 안 옴 · empty=빈 content / 빈 SSE · refusal=stop_reason refusal · 모르는 값=AiError). `AI_FAULT`가 있으면 키 검사를 건너뜀(그래야 테스트에서 고장 경로를 탐). `aiTimeout(ms)` = `AI_TIMEOUT_MS`가 있으면 그 값. 빈 답 검사 추가(askClaude · 스트림 둘 다). 켤 때 `[AI] ⚠ 고장 주입 중: …` 경고.
   - `src/server.js` `streamNoticeDraft`: 첫 조각이 올 때까지 헤더를 안 보냄 → 빈 답 · 거절 · 시간 초과도 시작 전 503 JSON.
   - 실제 확인: 고장 없이 진짜 AI로 분류 · 안내문 스트림 · 담당 추천 그대로 됨. `AI_FAULT=slow AI_TIMEOUT_MS=3000`으로 화면에서 신고 → "신고를 접수했어요" → 3초 뒤 "AI가 지금 응답하지 않습니다…", 카드는 미분류 · 접수.
   - 끝나고 `.env` · 셸 · Windows 환경변수에 `AI_FAULT` 없음 확인.
13. M1 1-6 FAQ 챗봇 (SPEC 9.5절 · AC-12) · DB 변경 없음
   - 정한 것: **1턴 = 메시지 한 개**. 화면은 대화 전체를 `messages`로 보내고, 서버가 검사(400: 빈 배열 · 21개 이상 · role 이상 · 빈 내용 · 500자 초과 · 마지막이 user 아님). Claude에는 `chatWindow`가 최근 10개만 보내고, 첫 메시지가 assistant이면 하나 더 뺌(API는 user 시작 필요). 화면은 20개에서 입력을 끄므로 21개 검사는 직접 fetch할 때를 막는 장치.
   - FAQ는 `data/faq.json` 8개(SPEC 2 · 4 · 5 · 9절 내용). AI는 system의 FAQ만 근거로 `{ answer, faq_ids }`를 냄. `checkChatResult`가 빈 답 · FAQ에 없는 번호를 버리고(→ 503), 화면에 보이는 `sources`는 서버가 FAQ에서 채움. 저장 안 함.
   - `src/ai.js`: `askClaude`가 `history`(대화 배열)도 받음(복사해서 씀). `askFaqAnswer` · `chatWindow` · `checkChatResult` · `FAQ` 추가, 호출은 여전히 `callClaude` 하나를 지나서 `AI_FAULT`가 그대로 먹음. `src/server.js`: `checkChat` · `POST /api/chat`. `src/public/index.html`: 오른쪽 아래 [FAQ 챗봇] 버튼 + 창(처음 `hidden` · 크기 고정).
   - 테스트: `tests/chat.test.js` 6개(21턴 400 · 잘못된 모양 400 · 최근 10턴 · 503 · 답 검사 · 창 hidden). `npm test` 41/41.
   - 함정: 창을 `display:flex`로 꾸미면 `hidden`이 먹지 않음 → `.chat[hidden] { display: none }`이 필요. 테스트의 "20개" 대화는 마지막이 user가 되게 만들어야 함(assistant로 끝나면 400).
14. M1 1-7 usage 표 시연 (SPEC 9.6절 · AC-U1) · 서버 · 화면 · DB 변경 없음
   - 정한 것: `eval/usage_demo.js`(강사용, 직접 실행할 때만 돎 — `import.meta.main`). 시드 신고 8건(긴급 2 · 주의 3 · 정보 3)을 effort **high 8번 → low 8번** 순서로 분류(effort 바꾸면 캐시가 깨질 수 있어 한쪽을 다 돌린 뒤 바꿈). ① usage 표 ② high vs low 분류 비교표(심각도 · 유형 둘 다 같아야 같음).
   - `src/ai.js`: 요청 본문을 `buildBody`로 뽑음(`effort` 기본 `low`, `cacheSystem` 기본 꺼짐 → 기존 분류 · 담당 추천 · 안내문 · 챗봇 · 미식 호출 모양 그대로). `askClaude`에 `effort` · `cacheSystem` · `onUsage` 추가. 시연 전용 `askReportClassUsage`(서버는 안 씀). 호출은 여전히 `callClaude` 하나.
   - 캐시: 문서상 `claude-opus-5-5`의 최소 캐시 길이는 512토큰. `CLASSIFY_SYSTEM`만으로는 모자랄 수 있어(추정, 길이를 재 보지는 않음) 시드의 나머지 12건을 **참고 사례**로 system 뒤에 붙임(시연 신고와 겹치지 않게). 그래서 비교표는 "CLASSIFY_SYSTEM + 참고 사례"로 잰 값.
   - 실제 확인(진짜 Claude, 16번 호출): 캐시 쓰기 1646 → 이후 15번 모두 캐시 읽기 1646(합계 24690 > 0). effort를 high → low로 바꿔도 system 캐시는 그대로 읽힘. 분류 같음 **7/8**(다른 1건은 출입문 카드 인식: 심각도 같고 유형만 IT_DEVICE ↔ BUILDING). 표 전체는 `docs/HANDOFF.md`. 1회 · 8건이라 통계로는 약함.
   - 테스트: `tests/usage.test.js` 5개(요청 모양 · usage 합계 · 같음 판정 · 시연/참고 분리 · 키 없으면 한국어 안내 exit 1). `npm test` 46/46.
   - 함정: 스크립트를 import만 해도 시연이 돌면 테스트가 끝나 버림 → `import.meta.main`으로 막음. 사내망에서는 `--use-env-proxy --use-system-ca`가 필요. 호출 사이가 5분을 넘으면 캐시가 사라져 읽기가 0이 될 수 있음.

15. M2 2-1 + 미션 ① 판단 보류 · ② 현장 수정 (SPEC 10절 · AC-E1 · AC-18 · AC-19)
   - reference: 사용자 말대로 **읽고 참고만** 함(`reference/kit_m2`의 golden.json · SPEC_M2_미션.md · README_KIT.md). 고친 파일 없음. 키트 `run_eval.js` 코드는 옮기지 않고 새로 씀. CLAUDE.md의 reference 항목도 이 뜻으로 고침.
   - 2-1: `eval/golden.json`(10건, 시드 21 · 23~28 · 33 · 35 · 36번의 글 + SPEC 4절로 새로 쓴 정답) · `eval/run_eval.js`(memory 서버를 잠깐 켜고 글로 신고를 새로 만든 뒤 `/classify`로 채점). AC↔테스트 점검 표는 HANDOFF.md. 빠졌던 테스트: AC-12 FAQ 파일 검사 1개 추가.
   - 미션 ①: `needs_human`(스키마 required) → `applyHold`(없으면 보류 아님 · boolean 아니면 503 · 보류 + 안전 단어면 긴급으로 올림) · `ai_hold` 칸(`005_hold.sql`). **`checkAiResult`는 그대로**. 보류 상한 3/10. 화면: "판단 보류 · 사람 확인 필요", [승인] 숨김.
   - 미션 ②: PATCH `severity`(urgent · warning · info 밖은 400) · 화면 "심각도 고르세요"(AI 제안이 있거나 보류인 미완료 카드) · `src/golden.js`의 `evalCandidates` · `GET /api/eval/candidates`(보류였던 건 · AI와 다르게 정한 건).
   - 실제 확인(진짜 Claude, 10번 1회): 정확도 8/10 · 보류 1건(상한 이하) · 틀린 2건은 보류로 안 걸러짐 · 보류 뺀 정확도 7/9. 표는 HANDOFF.md. 가이드의 "6/10 안팎"은 녹화 기준이라 달라도 됨. Supabase 005는 Management API로 실행(201).
   - 테스트: `tests/eval.test.js` 9개. `npm test` 55/55. 기존 46개는 고치지 않음.
   - 함정: **`--use-env-proxy`를 주면 fetch뿐 아니라 기본 `http.request`도 localhost를 회사 프록시로 보냄**(502 HTML이 와서 서버가 떴다고 착각하거나 JSON 파싱 오류). run_eval은 `new http.Agent()`를 따로 만들어 씀(런타임에 NO_PROXY를 바꿔도 소용없음). `?? false`는 null도 false로 바꿔 "이상한 값은 버림" 규칙이 깨짐 → `=== undefined`로 비교. 분류 스키마에 `needs_human`이 required로 더해져서 1-7 usage 시연을 다시 돌리면 캐시 크기 · output 토큰이 HANDOFF의 1-7 표와 달라질 수 있음(이번엔 다시 돌리지 않음). 후보 목록은 화면이 없음(API만).

16. M2 2-2 ①②③ + 2-3 FB-1 (SPEC 10.5절 · AC-13)
   - 2-2: `reference/buggy`를 `practice/buggy/`로 복사(원본과 같음), `npm test` 35개 중 3개 빨간불을 확인. 정답은 프로젝트 밖 출력 폴더의 따로 둔 복사본에서 35/35 확인(접어서 HANDOFF.md에). `/goal` · 잠금 확인 · `.claude/settings.json` 넣기는 **사용자 몫**(크루는 권한 · 훅을 바꿀 수 없음). 넣을 JSON은 HANDOFF.md.
   - 2-3: 카드 FB-1(누가 판단했나) → `reports.severity_by`(`''` · `ai` · `human`, `006_severity_by.sql`) · `src/judge.js`의 `approveFields` · PATCH severity는 서버가 `human`, approve는 `ai` · PATCH에 `severity_by`를 보내면 400 · 카드 위치 줄에 "판단: …". 후보 모양(golden)은 그대로.
   - 테스트 뚫기: 사람이 정한 신고를 `/approve`로 직접 불러 AI 제안으로 덮는 길이 뚫려 있었음(코드를 읽어 확인, 서버 재현은 못 함) → 이미 심각도가 정해진 신고의 승인은 409. 보강 테스트 "AC-13 이미 사람이 정한 신고는 [승인]으로 덮어쓰지 않는다".
   - 테스트: `tests/feedback.test.js` 6개. `npm test` 61/61. 기존 55개는 고치지 않음.
   - 함정: **루트에서 인자 없이 `node --test`를 돌리면 `practice/buggy/tests`가 섞여 134개 중 10개 실패**(확인함) → 루트는 `npm test`만. 훅 command를 `node --test`로 쓰면 같은 일이 생겨 설정안은 `npm test`로 함. 크루가 이 폴더에서 일할 때도 사용자가 넣은 훅이 돌 수 있음(추정). 스크린샷 · 콘솔 에러는 확인 못 함.

17. M3 3-1 Vercel 배포 준비 (SPEC 11절 · AC-D1) · **실제 배포는 확인 못 함 · 사용자 몫**
   - `src/server.js`: `handle`(export default)과 `start()`로 나눔. 루트 `server.js`는 `if (import.meta.main) start(); export default handle;`. `vercel.json`(icn1) · `.vercelignore` · `db.js`의 `sqliteFile`(VERCEL이면 임시 폴더) · `docs/DEPLOY.md`(환경변수 이름 표 · 올릴 파일 목록 · 관찰 ①② · 운영 · 삭제 · 막혔을 때). README에 DEPLOY 한 줄.
   - 테스트: `tests/deploy.test.js` 6개. `npm test` 67/67. 기존 61개는 고치지 않음. `node server.js` · `npm start` 첫 화면 200, import만 하면 서버가 안 켜지고 종료됨(확인함).
   - 함정: **db.js · ai.js는 불러오는 순간 환경변수를 읽고 DB를 엶** → 테스트는 `DB_MODE=memory`를 먼저 두고 dynamic import. Vercel에서 환경변수가 없으면 화면까지 500. **GitHub 웹 업로드는 `.gitignore`를 따르지 않음**(`.env` · `data/app.db`를 직접 빼야 함, `.vercelignore`가 Git 배포에서 먹는지는 확인 못 함). 사용자가 할 일 목록은 HANDOFF.md.

18. M3 3-2 보안 (SPEC 12절 · AC-16 · AC-17) · 3-3 · 3-4 문서
   - `src/ai.js`: ① `reportBlock`(신고 글 속 `<report>` 태그를 지우고 서버가 한 번만 감쌈 · 분류 · 추천 · 안내문 공통) + 세 프롬프트 끝에 보안 규칙 ② `hasDirective`(이유에 "승인하세요" 등 지시문이 섞이면 답을 버림 → 503). ③은 원래 있던 구조(AI는 `ai_*`만).
   - `src/server.js`: ④ `limitAi` — 접속 주소(`x-forwarded-for` 첫 값, 없으면 소켓 주소)마다 1분에 AI 10번 · 챗봇 20번, 넘으면 429 `TOO_MANY_REQUESTS`. `handle` 한 곳에서 검사. `eval/run_eval.js`는 `AI_RATE_LIMIT=off`로 끔(평가는 연달아 부르므로).
   - 진짜 AI 확인(memory 서버 · 8095): 공격 1 → 긴급(지시 무시), 공격 2 → 이유에 지시문 없음 · 심각도 · 상태 그대로.
   - 함정: 연타 기록은 서버 메모리 → Vercel 인스턴스마다 따로 셈 · 로컬에서는 머리말을 흉내 낼 수 있음(SECURITY_CHECK 3절 ✖).

## 사용성 정리 (거슬린 점 → 고친 것)
- 공통: 서버가 꺼졌거나 이상한 답을 주면 영어 오류(`Failed to fetch`, `Unexpected token`)가 그대로 보였음 → `api()`가 한국어 안내("서버에 연결하지 못했습니다…", "서버를 다시 켜 주세요 (npm start)")를 던짐.
- 미식
  - [AI 추천] 응답에 `recommended`가 없으면 `Cannot read properties of undefined (reading 'some')`로 죽음(예전 서버가 `{ excluded }`로 답한 경우로 추정) → 배열인지 검사하고, 아니면 안내 문장을 보이고 추천 없이 둠. 뽑기는 그대로 됨.
  - 뽑기·투표·추가·처음 불러오기 응답이 예상과 다르면 죽음 → 필요한 값을 검사해 안내 문장을 보임.
  - [뽑기]를 누른 뒤 응답 전까지 반응이 없었음 → 누르는 즉시 카드를 흔들고, 흔들기와 응답이 둘 다 끝나야 뒤집을 수 있게 함. 실패하면 대기로 돌아가고 오류를 보임. 흔드는 동안 버튼이 꺼져 중복 뽑기가 없음.
  - [추가]·👍·👎·×를 연타하면 중복 요청 → 요청하는 동안 그 버튼을 끔. 추가하면 새 줄이 보이게 스크롤하고 이름 칸에 포커스를 둠.
  - 추천이 0개일 때 상자가 비어 있었음 → "조건에 맞는 메뉴가 없어요. [지우기]를 누르면 처음대로 돌아가요".
  - AI를 기다리는 동안 멈춘 것처럼 보이고 다른 칸을 누를 수 있었음 → 칸을 끄고 "AI가 메뉴를 고르는 중… N초"를 1초마다 갱신(버튼 글자는 그대로라 폭이 안 변함).
  - 위쪽 오류 문장이 계속 남음 → 5초 뒤 저절로 사라지고 누르면 닫힘. 처음 불러오기 실패는 사라지지 않게 추천 상자 줄에도 남김. 조건을 다시 쓰면 지난 오류 문장이 지워짐(추천 전에는 안내 문장).
- 신고함
  - [신고] 연타로 중복 신고 → 요청하는 동안 버튼을 끔(글자는 그대로).
  - 신고해도 됐는지 알 수 없음 → "신고를 접수했어요"를 3초 보임. '배정'·'완료' 탭을 보던 중이면 새 신고가 보이도록 '전체'로 바꿈.
  - 목록을 못 불러오면 빈 화면 → 탭 위 안내 줄에 한국어 문장, 처음에는 "불러오는 중…". 안내 줄은 늘 한 줄 높이를 잡아 문장이 생겨도 아래가 안 밀림.
  - 배정·완료 실패를 `alert()`로 알렸음 → 같은 안내 줄에 보임. 담당 고르기와 [완료]는 요청 중 꺼짐.
  - 입력을 고쳐도 지난 오류 문장이 남음 → 입력하면 지움. 예상 밖 심각도·상태는 "undefined" 대신 "미분류"·원래 값. 선택 칸은 라벨에 "(선택)". 탭에 `aria-pressed`.

## 렉 정리 (측정 → 고침 → 다시 측정)
측정: `measure.mjs`(crew 출력 폴더)가 프로젝트 복사본을 `DB_MODE=sqlite`로 켜고 메뉴 100개 · 신고 40건에서 요청마다 10번 재 중앙값(ms). 내 PC 안의 SQLite라 네트워크 지연은 없음.

| 항목 | 전 | 후 |
|---|---|---|
| `GET /api/menus` (메뉴 100개, SQLite) | 11.2 | 2.1 |
| `POST vote` | 8.2 | 6.0 |
| `POST draws` | 15.8 | 6.2 |
| 배정·완료 한 번 (PATCH + GET 두 왕복 → PATCH 한 번) | 3.1 | 화면이 PATCH만 보냄 (PATCH 1.4) |
| 글꼴 `Cache-Control` | 없음 (열 때마다 670KB) | `max-age=604800` (7일) |

- 고침: P1 글꼴 캐시(`serveFile`, `/fonts/`만) · P2 글꼴 preload(주소는 `@font-face`와 같게) · P3 👍·👎는 그 줄 숫자만 바꿈(목록 전체를 다시 안 그림) · P4 뽑기 즉시 흔들기 · P5 AI 대기 초 표시 · P6 신고함은 바뀐 한 건만 바꿔 넣음 · P7 Supabase 투표 왕복 줄임 · P8 SQLite `listMenus`를 한 번의 JOIN으로. 메뉴 100개의 id · 이름 · 등급 · likes · dislikes는 전후 같음(`GET /api/menus` 결과를 비교).
- P7: Supabase `addVote`가 메뉴 조회를 빼 왕복이 3번 → 2번(넣기 → 세기). 없는 메뉴는 넣기가 외래 키 위반(PostgREST code `23503`)으로 실패하는 것으로 알아내 404를 유지하고, 다른 오류는 그대로 던짐. **Supabase로는 확인 못 함**(`.env`를 열지 않음): 응답 code를 잘못 읽었다면 없는 메뉴 투표가 404 대신 500이 되니, Supabase 모드에서 없는 번호로 투표해 404인지 한 번 볼 것. 왕복 시간도 재지 못함.
- 브라우저(Edge headless)로 확인: 신고함(빈 제목 오류 → 입력하면 지워짐, 두 번 눌러도 1건, 성공 문장, 배정·완료, 탭 aria-pressed)과 미식(`{ excluded }` 응답에서도 안 죽고 안내, `{ recommended: [] }` 문장, 지우기, 뽑기, 👍 숫자, 패널 높이 그대로, 가로 넘침 없음).
- 제안(고치지 않음): 삭제 확인(양피지 디자인에 맞는 확인 부품 필요) · 글꼴 subset으로 505KB 줄이기(도구 설치 필요) · 미식 `--muted` 색 대비 · '○분 전'이 저절로 안 바뀜.

## 사용자가 정한 것 (다시 묻지 말 것)
- 기본 DB는 **Supabase**다. 7일차 프로젝트를 쓰고, `.env`에 키가 있다.
- AI는 Anthropic Claude API를 쓴다.
- 미식은 자동 로그인이다.
- 미식 디자인은 원래 양피지 그대로 두고, 크기 · 정렬 같은 디테일만 손본다.
- 사용자는 "네가 해" 스타일이다. 할 수 있는 일은 명령어만 알려 주지 말고 직접 한다.
- 단, 내가 켠 서버나 터미널은 다 쓰면 끈다.

## 함정 (겪은 것)
- 사용자의 예전 터미널 탭에 `DB_MODE=sqlite` 값이 남아 있어서, 그 탭에서 `npm start`를 하면 SQLite로 켜졌다. 메뉴가 8개만 보였던 원인이 이것이다.
  - 새 터미널을 열면 Supabase로 켜진다. 서버 로그 첫 줄 `[API→DB] DB 연결: …`로 확인한다.
  - SQLite는 테이블이 비었을 때만 seed를 넣는다. seed를 바꾸면 `data/app.db`에도 따로 반영해야 한다.
- Supabase에 나가려면 `--use-env-proxy --use-system-ca`가 필요하다(npm start에 들어 있음).
  - Supabase 데이터를 손볼 때는 scratchpad에 스크립트를 쓰고 `node --use-env-proxy --use-system-ca --env-file=.env 스크립트.mjs`로 돌렸다.
  - 키 값은 절대 출력하지 않는다.
- 확인용 서버는 `PORT=8095 DB_MODE=memory ANTHROPIC_API_KEY= node server.js`로 켜고, 확인이 끝나면 끈다.
  - memory 모드는 서버를 끄면 초기화된다.
  - 키를 비우면 AI는 503으로 응답한다.
- 미식 카드 뒤집기는 animationend로 넘어간다. 브라우저 창이 숨겨져 있으면 이 이벤트가 안 와서 멈춘 것처럼 보이는데, 코드 버그가 아니다.
- AI 거르기 실측(거르기 방식 때 실측): 메뉴 100개에 "갑각류 알레르기, 해장하고 싶음"을 넣으면 약 18초 걸리고 64개를 뺀다.
- AI 거르기를 AI 추천으로 바꿈. 추천 외 메뉴는 취소선(흐림 없음). 뽑기 API의 `exclude`는 `only`로 바뀜.
