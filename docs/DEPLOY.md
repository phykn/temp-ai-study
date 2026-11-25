# DEPLOY.md — Vercel 배포 (8일차 M3 · 3-1)

> **배포됨 (2026-11-25)**: https://temp-ai-study.vercel.app · GitHub `phykn/temp-ai-study` `main`에 push하면 자동 재배포. Vercel 화면 작업(Import · 환경변수 · Redeploy)은 사용자가 함(크루 브라우저는 회사 정책으로 vercel.com이 막힘). 근거 기획은 `docs/SPEC.md` 11절 · AC-D1.
>
> 배포 뒤 크루가 이 PC에서 확인함: `/` · `/misik/` 200 · `/api/reports` 40건(Supabase) · `/api/menus` · 담당 추천(AI + 도구) · 안내문 스트리밍(29조각) · `/server.js`는 404(코드가 안 보임). AI 분류 → [승인]은 Supabase 데이터가 바뀌므로 4번 확인에서 사람이 함.

## 0. 배포 전 점검

`npm test`가 모두 통과하면 준비 끝입니다(특히 `tests/deploy.test.js` 6개).

| 파일 | 하는 일 (쉬운 말) |
|---|---|
| 루트 `server.js` | 입구. 맨 아래 `export default handle`이 "요청 하나를 처리하는 함수"를 내보냄. 내 컴퓨터에서 `node server.js` · `npm start`로 직접 실행할 때만 서버를 켬(`start()`) |
| `api/index.js` | **Vercel이 실제로 부르는 함수**. Vercel은 `api/` 폴더의 파일만 서버 함수로 돌림(루트 `server.js`만 있으면 그냥 파일로 내보내서 전부 404였음). 내용은 루트 `server.js`의 `handle`을 그대로 내보내는 한 줄 |
| `src/server.js`의 `handle` | 화면 파일 · API · 스트리밍 안내문을 모두 처리하는 함수. 로컬과 Vercel이 **같은 함수**를 씀 |
| `vercel.json` | 서울 리전(`icn1`) · 정적 파일은 `src/public`에서만(`outputDirectory` · 코드 파일이 주소로 안 보이게) · 나머지 주소는 모두 `/api` 함수로(`rewrites`) · 함수가 읽는 `data/*.json` · `src/migrations/` · `src/public/`을 함께 넣음(`includeFiles`) |
| `.vercelignore` | 배포에서 뺄 것(`.env` · `data/app.db*` · `reference/` · `practice/` · `eval/` · `docs/` · `tests/`) |
| `package.json`의 `engines` | Node를 `24.x`로 고정 |
| `src/db.js` | Vercel에서는 SQLite 파일을 임시 폴더에 둠(함수 폴더는 쓸 수 없음) |

## 1. GitHub에 올리기

> **끝남 (2026-11-25)**: https://github.com/phykn/temp-ai-study (`main` · 56개 파일 · **공개 저장소**) 에 `git push`로 올림. `.gitignore`가 `.env` · `data/app.db` · `reference/` · `practice/` · `.crew/`를 뺌. 다음에 고친 것은 `git add -A` → `git commit` → `git push`로 올리면 Vercel이 새로 배포함.
> 아래는 웹 업로드로 할 때의 방법(참고).

1. GitHub → New repository → **Private**.
2. **Add file → Upload files**로 아래 **올릴 것만** 끌어 넣습니다. 웹 업로드는 `.gitignore`를 따르지 않으므로 직접 골라야 합니다.

| 올릴 것 | 올리지 않을 것 |
|---|---|
| `package.json` · `server.js` · `api/index.js` · `vercel.json` · `.gitignore` · `.vercelignore` | **`.env`** (키가 들어 있음) |
| `src/` 폴더 전체 | **`data/app.db`** (내 SQLite 파일) |
| `data/`의 json 4개(`seed.json` · `misik_seed.json` · `assets.json` · `faq.json`) | `reference/` · `practice/` · `eval/` · `tests/` · `docs/` (올려도 `.vercelignore`가 빼지만 필요 없음) |

## 2. Vercel에서 Import

- Vercel → Add New → Project → 방금 만든 저장소 Import.
- Framework Preset: **Other**. 빌드 설정은 비워 둠.
- 아직 Deploy를 누르지 말고 3번 환경변수부터 넣습니다.

## 3. 환경변수 (Settings → Environment Variables) — 이름만, 값은 내 `.env`에서 옮김

| 트랙 | 이름 | 비고 |
|---|---|---|
| Supabase (기본) | `SUPABASE_URL` · `SUPABASE_SECRET_KEY` | **서버 전용 키(Secret)**. 공개 키(Publishable / anon)는 RLS에 막혀 401/403 |
| SQLite (병렬) | `DB_MODE` | 값 `sqlite`. 이때는 위 Supabase 두 개가 필요 없음 |
| 공통 | `ANTHROPIC_API_KEY` | 없으면 AI 기능만 503, 신고는 됨 |
| 넣지 않음 | `AI_FAULT` · `AI_TIMEOUT_MS` · `PORT` | 고장 시연용 · 로컬용 |
| 넣지 않음 | `VERCEL` | Vercel이 스스로 넣는 값(이게 있으면 SQLite가 임시 폴더를 씀) |

- 사내망 플래그(`--use-env-proxy --use-system-ca`)는 Vercel에서 필요 없습니다.
- Supabase 트랙은 `003`~`006` 마이그레이션(`src/migrations/supabase/`)이 이미 실행돼 있어야 합니다. 이 프로젝트의 Supabase에는 실행했음(`docs/next.md` 참고).
- 값은 이 문서나 GitHub에 적지 않습니다.

→ Deploy → 생긴 주소(`…vercel.app`)를 휴대폰으로 엽니다.

## 4. 확인 (휴대폰)

신고 1건 → [AI 분류] → 제안 확인 → [승인] → 배지가 바뀝니다. 키가 없으면 [AI 분류]는 "AI가 지금 응답하지 않습니다"이고 신고는 접수됩니다.

## 5. 관찰 두 가지 (토의 1문장씩)

- **관찰 ① 데이터가 남나?** 여러 명이 같은 주소로 신고하면 Supabase 트랙은 남고, SQLite 트랙은 시간이 지나거나 재배포하면 시드 40건으로 돌아갑니다. Vercel은 서버를 여러 대로 늘리고 새로 띄우며, SQLite 파일은 서버마다 임시 폴더에 따로 있기 때문입니다. → "그래서 회사에서는 DB가 있는 서버로".
- **관찰 ② 로그인이 없으면?** 옆 사람 주소로 들어가 남의 신고를 [완료]할 수 있습니다. 주소만 알면 누구나 처리 · AI 호출을 할 수 있다는 뜻입니다. → 3-4 "도입 전 점검"의 사내 SSO 칸.

## 6. 운영 기본기

README(또는 아무 파일) 한 줄을 고쳐 GitHub에 다시 올림 → 새 배포가 생김 → 이전 배포 **Rollback** → 최신 배포 **Promote** → Logs에서 `[화면→API] POST /api/reports/…/classify` 줄 찾기.

## 7. 끝나면

Vercel 프로젝트를 지웁니다(Settings → Delete Project). 로그인이 없어 주소가 남아 있으면 누구나 AI를 부를 수 있고 비용이 듭니다. 환경변수에 넣은 키가 걱정되면 Anthropic · Supabase에서 키도 다시 만듭니다.

## 8. 사용자가 직접 할 일 요약

1. GitHub Private 저장소 만들기 → 위 표의 "올릴 것"만 업로드
2. Vercel Import(Other)
3. 환경변수 값 입력(3번 표)
4. Deploy → 휴대폰으로 확인(4번)
5. 관찰 ① ② 해 보기
6. 운영(Rollback → Promote → Logs)
7. 끝난 뒤 Delete Project

## 막혔을 때

| 증상 | 원인 | 조치 |
|---|---|---|
| 화면까지 전부 500 · Logs에 "default export must be a function" | 루트 `server.js`에 `export default handle`이 없음 | 파일을 다시 올림 (`deploy.test.js`가 잡음) |
| 화면까지 전부 500 · Logs에 "SUPABASE_URL과 SUPABASE_SECRET_KEY가 필요합니다" | 환경변수가 없음(모듈을 불러오는 순간 DB를 열기 때문) | 환경변수 입력 후 Redeploy |
| 목록 500 · Supabase 오류 401/403 | 공개 키(Publishable)를 넣음 | 서버 전용 키(Secret)로 바꾸고 Redeploy |
| 신고 · 승인 오류 · "ai_hold"/"severity_by" 칸 없음 | Supabase에 `005` · `006` 미실행 | `src/migrations/supabase/`의 SQL을 SQL Editor에서 실행 |
| AI 분류 503 | `ANTHROPIC_API_KEY`가 없거나 틀림 | 키 확인 후 Redeploy (키 없이는 AI만 안 됨) |
| 화면 · API 모두 404 · `/server.js`를 열면 코드가 보임 | `api/` 폴더에 함수가 없어 Vercel이 폴더를 그냥 파일로 내보냄 **(실제로 겪음)** | `api/index.js` · `vercel.json`의 `outputDirectory` · `rewrites` (지금은 들어 있음) |
| 화면은 200인데 API만 500 `FUNCTION_INVOCATION_FAILED` | 환경변수가 없음 **(실제로 겪음)** | Settings → Environments → Production → Environment Variables에 넣고 **Redeploy** (넣기만 하면 반영 안 됨) |
| API 500 · Logs에 ENOENT | 함수에 json · SQL 파일이 안 들어감 | `vercel.json`의 `includeFiles` 확인 (지금은 들어 있음) |
| 안내문 · AI가 중간에 끊김 | Vercel 함수 시간 제한 **(확인 못 함, 추정)** | 요금제별 제한을 확인 · AI 대기 시간을 줄임 |
| SQLite 쓰기 오류 | `VERCEL` 없이 읽기 전용 폴더에 쓰려 함 | Vercel이 `VERCEL`을 넣는지 확인(보통 자동) |
| Node 버전 오류 | `engines`를 `>=24`로 씀 | `"24.x"`로 고정 |
