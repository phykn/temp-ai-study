# SDI 시설 신고함 · 8일차 실습 폴더

설치할 것은 없습니다. Node 24만 있으면 됩니다.
**오늘의 기획서는 `docs/SPEC.md`입니다.** 먼저 읽고, Claude에게 보낼 요청문을 직접 씁니다.
같은 서버에 회식 메뉴 가챠(미식, `docs/SPEC_MISIK.md`)도 있습니다 → http://localhost:8080/misik/ (자동 로그인)
미식에는 Claude API가 붙어 있습니다: 조건(예: "갑각류 알레르기, 해장하고 싶음")을 쓰면 AI가 맞는 메뉴를 추천하고, 추천 메뉴에서만 뽑습니다. 키는 `.env`의 `ANTHROPIC_API_KEY`.

## 실행 (명령 3개)

| 하고 싶은 것 | 명령 | 결과 |
|---|---|---|
| 서버 켜기 | `npm start` | 신고함 http://localhost:8080 · 미식 http://localhost:8080/misik/ · 끌 때는 Ctrl+C |
| 자동 확인 | `npm test` | 21개 모두 ✔ 이면 통과 (신고함 10 · 미식 9 · 화면 2) · 테스트는 진짜 AI를 부르지 않음 |
| Vercel 배포 | `docs/DEPLOY.md` | 올릴 파일 · 환경변수 이름 · 확인 · 끝나고 프로젝트 삭제 (사용자가 직접 함) |
| SQLite 들여다보기 | `npm run peek` | 테이블 · 칸 · 건수 · 최근 신고 5건 (SQLite 트랙만) |

## DB 고르기 (`.env.example` → `.env`로 복사)

| 트랙 | `.env`에 넣을 것 | 테이블 만들기 | 들여다보기 |
|---|---|---|---|
| **Supabase (기본)** | `SUPABASE_URL` · `SUPABASE_SECRET_KEY` (서버 전용 키 · 공개 키 아님) | `src/migrations/supabase/`의 001 · 002를 차례로 SQL Editor에서 Run | Table Editor |
| **SQLite (사내 방식)** | `DB_MODE=sqlite` 한 줄 | 서버가 켤 때 `src/migrations/sqlite/`를 자동 실행 | `npm run peek` |

npm start는 사내 프록시(HTTPS_PROXY)와 윈도우 인증서를 자동으로 씁니다(`--use-env-proxy --use-system-ca`). 미식 테이블은 7일차 미식 테이블과 겹치지 않게 `misik_`으로 시작합니다.

화면에 "서버를 다시 켜 주세요"가 나오면 서버가 예전 코드로 켜져 있는 것입니다: 터미널에서 Ctrl+C로 끄고 `npm start`로 다시 켭니다.

Supabase에서 막히면 `.env`를 `DB_MODE=sqlite` 한 줄로 바꿔 이어 갑니다. 테스트는 두 트랙 모두 같습니다(테스트는 진짜 DB를 건드리지 않는 memory 모드로 돕니다).

## 파일 지도 — "무엇을 바꾸려면 어느 파일?"

코드는 모두 `src/` 안에 있습니다. 루트의 `server.js`는 `src/server.js`를 켜는 한 줄짜리 입구입니다.

```
 ① 화면                 ② API                  ③ DB 창구           ④ DB
 src/public/index.html ─▶ src/server.js ─▶ src/db.js ─▶ Supabase / SQLite 파일 / memory
   (fetch로 부탁)       (주소 · 입력 검사)    (DB는 여기만 앎)
                                               ▲
                                        src/migrations/ (테이블 모양)
```

| 바꾸고 싶은 것 | 열 파일 | 확인 방법 |
|---|---|---|
| 화면 모양 · 버튼 · 문구 | `src/public/index.html` | 브라우저 새로고침 |
| API 주소 · 입력 검사 | `src/server.js` | `npm test` |
| 데이터를 읽고 쓰는 방법 · 정렬 | `src/db.js` | 서버 터미널의 `[API→DB]` 줄 |
| 테이블 칸 | `src/migrations/`에 **새 파일** | Table Editor · `npm run peek` |
| 정해진 규칙 · 완료 기준 | `docs/SPEC.md` | — |
| 자동 확인 | `tests/` | `npm test` |

## 요청문 쓰는 법 (3줄)

```
[어디] 고칠 파일 (위 파일 지도에서 고름)
[무엇] SPEC.md의 몇 절을 어떻게. 한 층만
[확인] SPEC.md 7절의 AC 중 무엇으로 끝을 판단하나 (브라우저 · npm test · Table Editor/peek)
```

로그인은 없습니다. 화면 하나에서 누구나 신고하고 누구나 처리합니다(SPEC.md 8절).
