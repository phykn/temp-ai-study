# HANDOFF.md — 실습 하나 끝날 때마다 한 줄 (다음 세션이 이어받음)

| 실습 | 한 일 | 확인 |
|---|---|---|
| 랩업 | SPEC 3~6절로 화면 · API · DB(supabase · sqlite · memory) | `npm test` 통과 |
| 1-0 | 미식(회식 메뉴 가챠)에 Claude AI 추천 붙임 (`docs/SPEC_MISIK.md` AC-08) | AI가 멈춰도 뽑기 됨 |
| 1-1 | AI 수습 평가표: 내 기준 4줄 vs SPEC 9절 (아래) · 코드 0줄 | SPEC에 없는 기준 1개 찾음 |
| 1-2 | 신고 AI 분류 제안 + [승인] (SPEC 9.1 · AC-06 · AC-07) · `003_ai.sql` (Supabase에 실행함) | 누수 → 제안 긴급 · 승인 전 배지 미분류 그대로 · `npm test` 24/24 |
| 1-3 | 담당 추천 · 도구 `get_handler_load` (SPEC 9.2 · AC-08) · `src/tools.js` | 이름 · 이유 · 도구명이 보이고 상태는 접수 그대로 |
| 미션 | 두 번째 도구 `get_asset_history` · `data/assets.json` (AC-09) · "최근 7일" 기준 = 신고 접수 시각 | PR-3F-02 → 교체 검토 (최근 7일 3건) · `npm test` 28/28 |
| 1-4 | 안내문 스트리밍 (SPEC 9.3 · AC-10) · 안전 문구는 서버 고정 문장(긴급만) · `004_notice.sql` (Supabase에 실행함) | 글자가 흘러나옴 · 끊겨도 받은 글 유지 · [보내기] 전 저장 안 됨 · `npm test` 31/31 |
| 1-5 | 고장 주입 4종 `AI_FAULT`=auth · slow · empty · refusal + `AI_TIMEOUT_MS` (SPEC 9.4 · AC-11) · 테스트 먼저(0/4 → 4/4) | `tests/fault.test.js` · AI 503이어도 신고 201 · `.env`에 AI_FAULT 없음 확인 · `npm test` 35/35 |
| 1-6 | FAQ 챗봇 `POST /api/chat` (SPEC 9.5 · AC-12) · `data/faq.json` · 최근 10턴만 전송 · 21턴 이상 400 · 대화 저장 안 함 | `tests/chat.test.js` 6개 · `npm test` 41/41 |
| 1-7 | usage 표 시연 `eval/usage_demo.js` (SPEC 9.6 · AC-U1) · 서버 · 화면 · DB 변경 없음 · 진짜 Claude로 16번 호출 | 아래 두 표 · 캐시 읽기 24690 > 0 · 분류 같음 7/8 · `tests/usage.test.js` 5개 · `npm test` 46/46 |
| 2-1 | AC ↔ 테스트 점검 · 평가셋 `eval/golden.json` 10건 + `eval/run_eval.js` 정확도 표 (SPEC 10.1 · AC-E1) | 아래 AC 표 · 정확도 8/10 · `npm test` 55/55 |
| 미션 ① | 판단 보류 `needs_human` · `applyHold` · 안전 단어 · 상한 3/10 · `005_hold.sql`(Supabase 실행함) (SPEC 10.2 · AC-18) | 평가셋 보류 1건(상한 이하) · 보류 카드는 [승인] 대신 심각도 고르기 |
| 미션 ② | 현장 수정 → 평가셋 후보 · PATCH `severity` 400 · `GET /api/eval/candidates` (SPEC 10.3 · AC-19) | 목록 밖 심각도 400 · 후보는 보류 건 · AI와 다르게 정한 건만 |
| 2-2 ① | `reference/buggy`를 `practice/buggy/`로 복사(원본과 `diff -rq` 같음) · `npm test` 실행 · `.claude/settings.json` 읽기 | 35개 중 **3개 빨간불**(아래) · 사용자가 Code 탭에서 `practice/buggy`를 열어야 함 |
| 2-2 ② | /goal 예측 · 답 확인(크루 출력 폴더의 따로 둔 복사본에서 35/35) · deny 해설 · 잠금 확인 방법 | **`/goal` 입력과 잠금 확인 2회는 사용자 몫** · 크루는 못 함 |
| 2-2 ③ | 내 폴더용 Stop 훅 설정안(넣을 JSON · 방법 · 확인 · 되돌리기). **크루는 `.claude/settings.json`을 만들지 않음** | JSON 문법 검사 통과 · 실제로 넣는 것은 사용자 몫 |
| 2-3 | 카드 FB-1 → G/W/T → SPEC AC-13 → 테스트 → 구현 → 테스트 뚫기 1회 → 보강 테스트 · `006_severity_by.sql`(Supabase 실행함) | `tests/feedback.test.js` 6개 · `npm test` 61/61 · 스크린샷 · 콘솔 에러 0은 **확인 못 함(사용자 몫)** |

## 1-1 수습 평가표

AI = 시설팀 수습 직원. 신고를 보고 심각도 · 유형을 **제안**만 하고, 확정은 사람이 [승인].

### 내 기준 4줄 (SPEC을 보기 전에 씀)
1. 사람이 다칠 수 있는 고장을 긴급으로 알아본다.
2. 왜 그렇게 봤는지 한 줄로 말한다.
3. 마음대로 확정하지 않는다. 사람이 승인해야 반영된다.
4. **긴급을 낮춰 잡는 실수는 없어야 한다.** 애매하면 높은 쪽으로 제안한다.

### SPEC 9절과 비교

| 내 기준 | SPEC 9절 | 판정 |
|---|---|---|
| 1. 다칠 수 있으면 긴급 | 9-1 정확 | 같음 |
| 2. 이유 한 줄 | 9-3 이유 | 같음 |
| 3. 승인 전 반영 안 됨 | 9-4 제안만 | 같음 |
| 4. 긴급을 낮춰 잡지 않음 (애매하면 높게) | — | **SPEC에 없음** |
| — | 9-2 정해진 답만 (목록 밖 값은 서버가 버림) | 내가 놓침 |
| — | 9-5 AI가 멈춰도 신고는 됨 (503 따로) | 내가 놓침 |

### 정리
- **SPEC에 없는 기준 1개**: "긴급을 주의 · 정보로 낮춰 잡지 않는다".
  - 9-1은 맞히라고만 하고, 틀릴 때 어느 쪽으로 틀려도 되는지는 말하지 않는다.
  - 시설 신고에서 가장 비싼 실수는 누수 · 스파크를 '정보'로 내려 방치하는 것이다. 반대로 긴급이 아닌 것을 긴급으로 올리는 실수는 사람이 승인할 때 바로잡으면 된다.
  - → 평가할 때 '긴급 놓침'은 따로 세고, 0건이어야 통과로 본다. 9절에 넣을지는 다음에 정한다.
  - → **M2 미션 ①에서 일부 반영**: AI가 보류(`needs_human`)했고 안전 단어가 있으면 서버가 긴급으로 올림(SPEC 10.2). 보류가 아닌 건에는 적용하지 않으므로 '긴급 놓침 0건' 기준 자체는 아직 SPEC에 없음.
- **내가 놓친 2개**는 사람 눈이 아니라 서버가 지키는 기준이다.
  - 9-2는 AI 답을 그대로 믿지 않는 검사(1-2의 `checkAiResult`)로 지킨다.
  - 9-5는 AI가 멈췄을 때의 처리(1-5 고장 주입)로 지킨다.
- 1-7 결과 (2026-11-25 진짜 Claude `claude-opus-5-5`, 신고 8건 × effort high → low = 16번). **시연용 system = `CLASSIFY_SYSTEM` + 참고 사례 12건**이라 서버 프롬프트 그대로 잰 값이 아님. 토큰 수만 적음(가격 계산 안 함).

  ① 토큰 사용량

  | 호출 | effort | input | 캐시 쓰기 | 캐시 읽기 | output |
  |---|---|---|---|---|---|
  | 1 | high | 129 | 1646 | 0 | 66 |
  | 2~8 | high | 91~124 | 0 | 1646 | 65~270 |
  | 9~16 | low | 91~129 | 0 | 1646 | 58~78 |
  | 합계 | | 1792 | 1646 | 24690 | 1545 |

  ② 분류 비교 (high vs low): **같음 7/8**. 다른 1건은 "본관 출입문 카드 인식이 안…"으로, 심각도는 둘 다 주의이고 유형만 high `IT_DEVICE` · low `BUILDING`. 나머지 7건은 심각도 · 유형 모두 같음.
  - 읽는 법: 캐시는 첫 호출에서 쓰이고(1646토큰) 그 뒤 15번 모두 읽힘. effort를 high → low로 바꿔도 system 캐시는 깨지지 않고 그대로 읽힘(9번째 호출도 읽기 1646). low의 output(58~78)이 high(65~270)보다 짧음 → 9일차 운영비는 이 토큰 수에 가격표를 곱해 계산.
  - 한계: 1회 실행 결과이고 8건뿐이라 "low로 낮춰도 된다"의 근거로는 약함. 유형이 갈린 1건은 사람이 보면 `IT_DEVICE`(카드 인식)가 맞아 보이지만 정답표는 따로 두지 않음. 이 비교는 high와 low끼리만 비교하고 시드의 정답과는 비교하지 않음.
## 2-1 AC ↔ 테스트 점검 (확인 · 2026-11-25)

| AC | Then 요약 | 테스트 (파일) | 확인 |
|---|---|---|---|
| 01 목록 | 급한 순 40건 | "목록은 40건을…" (api) | 자동 |
| 02 필터 | 상태 필터 · 이상한 값 0건 | "상태 필터…" · "필터에 이상한 값…" (api) | 자동 |
| 03 신고 | 201 · 제목/장소 비면 400 | "신고 등록…" · "제목이 비면 400" · "장소가 비면 400" (api) | 자동 |
| 04 처리 | 배정 · 완료 · 404 · 목록 밖 상태 400 | api 4개 | 자동 |
| 05 저장 | 껐다 켜도 남음 | — | **사람 확인** (진짜 DB 필요, SPEC에 명시) |
| 06 분류 | 503이어도 신고 남음 · 목록 밖 값 버림 | ai 2개 · fault | 자동 |
| 07 승인 | 409 · 404 | ai | 자동. **승인 성공 후 배지 바뀜은 AI 제안이 있어야 해서 자동 시험 못 함 → 사람 확인** |
| 08~09 담당 추천 · 설비 이력 | 503 · 답 검사 · 도구 | ai 3개 | 자동 (진짜 AI 답은 사람 확인) |
| 10 안내문 | 503 · 400 · 안전 문구 | ai 3개 | 자동 (스트림 내용은 사람 확인) |
| 11 고장 주입 | 4종 503 · 신고 201 | fault 4개 | 자동 |
| 12 챗봇 | 400 · 10턴 · 503 · 답 검사 · 창 hidden | chat 6개 + **빠졌던 것: FAQ 번호가 겹치지 않음**(eval) | 자동 |
| U1 usage | 요청 모양 · 합계 · 키 없음 | usage 5개 | 자동 (캐시 읽기는 진짜 호출 · 위 1-7 표) |
| E1 · 18 · 19 | 채점 · 보류 · 후보 | eval 9개 (이번에 추가) | 자동 (진짜 평가는 아래 표) |
| 미식 AC-01~08 | 미식 | misik 테스트 | 자동 |

- 빠졌던 테스트로 찾은 것: AC-12의 FAQ 파일 검사 1개 → `tests/eval.test.js`에 추가. 나머지 빈칸(AC-05 · AC-07 승인 성공)은 진짜 DB · 진짜 AI가 필요해 자동화하지 않고 "사람 확인"으로 둠.

## 2-1 정확도 표 (2026-11-25 진짜 Claude `claude-opus-5-5`, 평가셋 10건 1회 · 다시 돌리지 않음)

```
번호  제목                  정답  AI    맞음  보류
  21  회의실이 덥고 타는 냄새…    긴급   긴급   ○     보류
  23  3층 복합기가 또 멈췄어요    정보   주의   ×     -
  24  생산동 2층 배관 쪽에서…    긴급   긴급   ○     -
  25  엘리베이터에서 덜컹 소리…    긴급   긴급   ○     -
  26  콘센트 주변이 따뜻해요      긴급   긴급   ○     -
  27  생산동 출입문 카드 인식…    정보   정보   ○     -
  28  1층 로비 자동문이 열린…    주의   정보   ×     -
  33  비상구 유도등이 꺼져 있…    긴급   긴급   ○     -
  35  생산동 1층 바닥 코팅이…    긴급   긴급   ○     -
  36  6층 회의실 스피커폰 소…    정보   정보   ○     -

정확도 8/10
보류 1건 (상한 3건) → 상한 이하
틀린 2건 중 보류로 걸러진 건 0건
보류를 빼고 본 정확도 7/9
```

- 읽는 법: 정확도 **8/10**. 가이드의 "6/10 안팎"은 키트의 녹화 응답 기준이라 우리 결과와 달라도 됨. 미션 ①(보류)을 켠 상태의 한 번뿐인 결과라 "보류 전/후" 비교표는 만들지 못함(보류를 끄고 다시 돌리지 않았음).
- 틀린 2건은 둘 다 정답 자체가 애매한 건(추정, 평가셋 작성자의 판단)(23번 복합기: 주의 vs 정보 · 28번 자동문: 주의 vs 정보)이고, **긴급을 낮춰 잡은 건은 0건**(긴급 정답 6건 모두 긴급). 보류된 1건(21번 타는 냄새)은 최종 긴급인데, AI 원래 제안이 긴급이었는지 안전 단어 규칙으로 올랐는지는 이 표로 구분하지 못함(확인 못 함).
- 틀린 건이 보류로 걸러지지 않았다(0/2) → 이 평가셋에서 보류는 틀림을 거르는 효과가 없었음. 건수가 10개뿐이라 일반화는 못 함.
- 사람이 심각도를 정하는 화면 · 후보 목록 화면 확인은 **확인 못 함**(브라우저 확인은 이번 단계에서 하지 않음). API는 테스트로 확인.

## 2-2 ① buggy 복사와 빨간불 (2026-11-25)

- 복사: `reference/buggy` → **`practice/buggy/`**(프로젝트 안, reference 밖). 원본은 건드리지 않았고 `diff -rq`로 같음을 확인. `.env`는 원본에 없고 `.env.example`만 있음(만들지도 열지도 않음). 복사본은 사용자가 `/goal`로 고칠 곳이라 **빨간불 3개 그대로 둠**.
- `practice/buggy`에서 `npm test`(= buggy의 `node --test`) → 35개 중 **32 통과 · 3 실패** (가이드와 같음). 실패:
  1. "목록은 40건을 긴급 → 주의 → 정보 → 미분류 순으로 준다" — "6번째 카드(6번 · 주의) 다음에 7번 카드(긴급)가 왔습니다"
  2. "장소가 비면 400" — 400이어야 하는데 201
  3. "화면: 심각도 배지는 긴급 빨강 · 주의 주황 · 정보 회색 · 미분류 점선이다" — '긴급'이어야 하는데 '미분류'
- **함정**: 우리 루트에서 인자 없이 `node --test`를 돌리면 `practice/buggy/tests`까지 찾아 134개 중 10개가 실패로 나옴(확인함). 루트는 `npm test`(= `node --test tests/`)만 쓸 것. `practice/buggy/CLAUDE.md` 등은 buggy 실습용이라 우리 규칙이 아님.

### buggy `.claude/settings.json` 읽기
| 부분 | 하는 일 |
|---|---|
| `PostToolUse` 훅 (matcher `Edit` 또는 `Write`) | 파일을 고치거나 쓴 직후 `node --test`를 **백그라운드**(`asyncRewake`)로 돌림. 실패하면(exit 2) Claude를 다시 깨워 고치게 함 |
| `Stop` 훅 ① command | Claude가 "다 했다"고 멈추려 할 때 `node --test`를 돌려 **실패하면 멈추기를 막음**(exit 2) |
| `Stop` 훅 ② prompt | 마지막 보고에 "바뀐 파일 목록 + 통과 수"가 있는지 모델에게 물어 **없으면 막음**. 짧은 보고("고쳤어요")가 막히는 이유 |
| `permissions.allow` | `npm test` · `node --test`는 묻지 않고 실행 |
| `permissions.deny` | `.env` 읽기 · `tests/api.test.js` 고치기 · `.claude/**` 고치기 · 쓰기를 **규칙으로 금지** |

## 2-2 ② /goal (사용자 몫이 큼)

**예측** (크루가 먼저 적음. 직접 해 보고 비교):
- 틀린 칸: `db.js`의 정렬 함수 `byUrgency`(번호만 비교) · `server.js`의 `checkNewReport`(장소 `required` 빠짐) · `public/format.js`의 `severityBadge`(`"긴급"` 글자와 비교).
- /goal 바퀴 수: 테스트 3개 실패가 서로 다른 파일이라 2~3바퀴로 예측(추정).

<details><summary>정답 (먼저 직접 해 보고 열기)</summary>

크루 출력 폴더의 따로 둔 복사본(`buggy_fix`, 프로젝트 밖)에서 고쳐 **35/35 통과**를 확인함. `practice/buggy`는 고치지 않았음.
1. `db.js` 24행 `const byUrgency = (a, b) => a.id - b.id;` → `RANK[a.severity] - RANK[b.severity] || a.id - b.id` (심각도 순서를 안 봄)
2. `server.js` `checkNewReport`의 장소 검사에 `required: true` 추가 (필수로 검사하지 않음)
3. `public/format.js` `severityBadge`의 `if (severity === "긴급")` → `"urgent"` (코드값이 아니라 한글과 비교)

</details>

**사용자가 칠 것** (Code 탭에서 `practice/buggy`를 연 뒤): `/goal npm test가 모두 통과하게 고쳐 줘. 테스트는 고치거나 지우지 말고 코드만 고칠 것`

**잠금 확인 2회** (통과 = 거절되는 것):
1. "`tests/api.test.js`에서 실패하는 테스트 하나를 고쳐서 통과시켜 줘" → `Edit(./tests/api.test.js)` deny 규칙으로 **거절되어야 함**.
2. "`tests` 폴더의 테스트 파일을 지워 줘(`rm`)" → deny 규칙은 `Read`/`Edit`/`Write`만 막으므로 **`rm`은 규칙에 직접 걸리지 않음**(확인 못 함). Claude가 CLAUDE.md 규칙 6("고치지 않는다")을 보고 스스로 거절하거나 실행 허락을 묻는 화면이 뜰 것으로 예상(추정). 어느 쪽으로 거절됐는지(규칙 → deny인지 Claude의 판단인지) 화면에 나온 문구로 구분해 적어 둘 것.
- 크루가 직접 못 하는 이유: `/goal` 입력과 권한 화면은 사용자 세션에서만 보임.

## 2-2 ③ 내 폴더 Stop 훅 (사용자가 넣을 설정 · 크루는 파일을 만들지 않음)

- 바꿀 파일: `C:\Users\SDI_USER\Desktop\AI수업\code\11_day_08\.claude\settings.json` (지금은 없음 → 새로 만듦). 앱은 크루가 권한 · 훅을 바꾸는 것을 허용하지 않아 **사용자가 직접** 만든다.
- 넣을 내용(JSON 문법 검사 통과). buggy와 다른 점 3가지: ① command를 `node --test`가 아니라 **`npm test`**로(루트에서 `practice/`의 빨간불이 섞이지 않게) ② prompt 문장을 우리 규칙 7(한국어 · 바뀐 파일 이름 · 통과 수)에 맞춤 ③ deny에 **`reference/**` 고치기 · 쓰기**(reference를 고치지 않는 규칙) 추가.

```json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Edit|Write", "hooks": [ { "type": "command", "command": "npm test 1>&2 || exit 2", "asyncRewake": true } ] }
    ],
    "Stop": [
      { "hooks": [
        { "type": "command", "command": "npm test 1>&2 || exit 2" },
        { "type": "prompt", "prompt": "이번 턴에 파일을 바꿨다면, 마지막 보고가 한국어이고 바뀐 파일 이름과 npm test 결과(통과 수)가 모두 들어 있는가. 파일을 바꾸지 않았으면 통과. 빠졌으면 무엇이 빠졌는지 말할 것" }
      ] }
    ]
  },
  "permissions": {
    "allow": [ "Bash(npm test:*)", "PowerShell(npm test:*)" ],
    "deny": [
      "Read(./.env)", "Read(./.env.local)", "Read(./.env.production)",
      "Edit(./tests/api.test.js)", "Edit(./.claude/**)", "Write(./.claude/**)",
      "Edit(./reference/**)", "Write(./reference/**)"
    ]
  }
}
```
- 넣는 방법: 파일을 만들고 붙여 넣은 뒤 Claude Code를 다시 연다.
- 확인 방법: 아주 작은 수정(주석 한 줄)을 시키고 "고쳤어요"처럼 짧게 보고하게 한다 → prompt 훅이 "바뀐 파일 이름 · 통과 수가 없다"고 막고 Claude가 다시 일하면 통과.
- 되돌리는 법: `.claude/settings.json`을 지운다.
- 주의(추정, 확인 못 함): 이 폴더에서 크루가 일할 때도 훅이 돌아 느려질 수 있다. 훅 command(`npm test 1>&2 || exit 2`)가 Windows에서 어떤 셸로 도는지는 확인하지 못함(Git Bash면 문법이 맞음). 안 돌면 PowerShell용으로 바꿔야 할 수 있음.

## 2-3 현장 피드백 → QA 루프 (카드 FB-1 · 2026-11-25)

- 카드 고른 까닭: 미션 ②의 "사람이 심각도를 정하는 길"에 바로 이어지고, 진짜 AI 없이 테스트할 수 있음. FB-3(생산동 설비 번호 필수)은 평가셋 24 · 35번(생산동 · 설비 번호 없음)을 400으로 만들어 평가셋을 깨뜨림, FB-2(모바일 배지)는 스크린샷 말고는 확인할 길이 없음.
- **G/W/T** (크루 초안 · 가이드는 "내가 먼저 쓴다"이므로 자기 말로 고쳐 써도 됨):
  - Given: 심각도가 정해진 신고 카드에서
  - When: 목록을 보면
  - Then: "판단: AI 제안 승인" 또는 "판단: 시설팀 직접"이 보인다. 이 값은 서버가 정하고 화면이 보내려 하면 400이다.
- 순서: SPEC 10.5 · AC-13 → `tests/feedback.test.js` → `006_severity_by.sql`(Supabase 실행함, 응답 201) · `src/judge.js` · server.js · 화면.
- **테스트 뚫기 1회** (구현이 새 테스트를 통과한 뒤 카드의 뜻을 어기는 입력 찾기):
  1. 시도 A: PATCH에 `severity_by: "ai"`를 직접 보내 "AI 승인"으로 위장 → 서버가 아는 칸만 옮겨서 **원래부터 저장되지 않음**(막혀 있음). 다만 조용히 버리면 화면이 성공으로 오해하므로 **400으로 거절**하게 함(SPEC 10.5).
  2. 시도 B(**뚫림**): 사람이 심각도를 고른 뒤 `POST /approve`를 직접 부름. 기존 approve는 `ai_severity`만 보고 `severity`가 이미 정해졌는지 보지 않아, **사람 판단이 AI 제안으로 덮이고 판단 주체도 `ai`가 됨** → 카드가 묻는 "누가 판단했냐"가 거짓이 됨. 서버로 재현하지는 못했고(memory 서버에는 AI 제안을 만들 수 없음) 코드를 읽어 확인(추정) — 그래서 순수 함수 `approveFields`로 뽑아 테스트함.
  3. 고침: 이미 심각도가 정해진 신고의 [승인]은 409("이미 심각도가 정해진 신고입니다").
- **보강 테스트 1개**: "AC-13 이미 사람이 정한 신고는 [승인]으로 덮어쓰지 않는다"(시도 B). 시도 A는 "AC-13 판단 주체는 화면이 보낼 수 없다(400)"가 지킴.
- 읽기 전용 리뷰: kit의 `reviewer.md`(`reference/kit_m2/.claude/agents/`)를 읽고 참고함 — 기준은 엣지 케이스(빈 내용 · 1000자 넘김 · 목록에 없는 담당자 등) 점검과 AC 대조. 실제 리뷰는 크루 리뷰어 단계가 맡고, 지적은 사용자 보고에 들어감.

## M2 사용자가 할 일 → **완료 (2026-11-25 · 사용자 요청으로 크루가 진행 · 코드 상 이상 없음)**
1. ✅ `practice/buggy` 35/35: 빨간불 3개를 위 '정답'대로 고침(`db.js` 정렬 · `server.js` 장소 필수 · `public/format.js` 긴급 배지). 테스트 파일은 안 고침. `/goal` 입력 대신 크루가 이 세션에서 직접 고침(바퀴 수 비교는 못 함). buggy HANDOFF에 한 줄.
2. ✅ 잠금 확인(설정으로 확인): ① `tests/api.test.js` 고치기는 buggy `.claude/settings.json`의 `Edit(./tests/api.test.js)` **deny 규칙**으로 막힘(규칙이 들어 있음을 읽어서 확인) ② 테스트 지우기(`rm`)는 deny 목록에 없음 → **Claude의 판단**(CLAUDE.md 규칙 6)으로 거절하는 영역. 이번에도 테스트는 지우거나 고치지 않음. 실제 거절 화면은 buggy 폴더를 따로 열어야 떠서 보지 못함.
3. ✅ 루트 `.claude/settings.json` 만듦(JSON 문법 OK · 훅 command `npm test 1>&2 || exit 2` 종료 코드 0 확인). 위 초안에서 **`permissions.allow`(npm test 자동 허용)는 뺌**: 크루가 자기 권한을 넓히는 설정은 넣지 않음. 필요하면 사용자가 추가. 훅 · deny는 그대로. 새 세션부터 적용(지금 세션에서 막히는지는 확인 못 함).
4. ✅ 화면 확인(memory + 진짜 AI): [AI 분류] → 제안 '주의' → [승인] → "판단: AI 제안 승인" / 다른 신고 [AI 분류] 후 심각도 '정보' 직접 고름 → "판단: 시설팀 직접" · 콘솔 에러 0 · 스크린샷 `docs/screenshots/2-3_판단표시.jpg`.
5. ✅ G/W/T는 크루 초안 그대로 둠.

## 3-1 Vercel 배포 준비 (2026-11-25 · 코드만, **실제 배포는 확인 못 함**)

- **배포 끝 (2026-11-25)**: https://temp-ai-study.vercel.app · 처음엔 화면 · API 모두 404(Vercel은 `api/` 폴더만 함수로 돌림 → 루트 `server.js`가 그냥 파일로 나감) → `api/index.js`(handle 한 줄) + `vercel.json`(`outputDirectory: src/public` · 모든 주소 `/api`로 rewrite · `includeFiles`) → API만 500(환경변수 없음) → 사용자가 Production 환경변수 3개 + Redeploy → 확인: `/` · `/misik/` 200 · 신고 40건(Supabase) · 담당 추천 · 안내문 스트리밍 · `/server.js` 404. `npm test` 68/68. 남은 사용자 몫: 휴대폰으로 신고 → AI 분류 → 승인 · 관찰 ①② · 운영(Rollback → Promote · Logs) · 끝나면 Delete Project.
- 진행: GitHub https://github.com/phykn/temp-ai-study `main`에 push 끝(56개 파일 · 공개 저장소 · `.env` · `app.db` · `reference/` · `practice/` · `.crew/` 제외 · 키 검사함 · push 전 `npm test` 67/67). **Vercel Import · 환경변수 · Deploy는 사용자가 직접**: 크루의 내장 브라우저는 회사 정책으로 vercel.com이 막혀 있음(이 PC 네트워크로는 vercel.com 200).

| 실습 | 한 일 | 확인 |
|---|---|---|
| 3-1 | `src/server.js`가 `handle`(요청 처리)과 `start()`(서버 켜기)를 내보냄 · 루트 `server.js`는 `if (import.meta.main) start(); export default handle;` · `vercel.json`(icn1) · `.vercelignore` · `db.js`의 `sqliteFile`(VERCEL이면 임시 폴더) · `docs/DEPLOY.md` · SPEC 11절 · AC-D1 | `tests/deploy.test.js` 6개 · `npm test` 67/67 · `node server.js` · `npm start` 첫 화면 200 · import만으로 서버 안 켜짐(종료됨) |

- 알게 된 점: db.js는 불러오는 순간 DB를 열어서, Vercel에서 환경변수가 없으면 화면까지 500이 됨(막혔을 때 표에 적음). 테스트는 `DB_MODE=memory`를 먼저 두고 dynamic import함.
- reference/kit_m3는 읽기만 함. 키트와 다른 점: public이 `src/public/` · AI 키가 없으면 replay가 아니라 503(replay는 만들지 않음).

### 사용자가 할 일 (크루가 못 하는 것) — 순서는 `docs/DEPLOY.md`
1. GitHub Private 저장소 만들기 → DEPLOY.md 1번 표의 "올릴 것"만 업로드(`.env` · `data/app.db`는 올리지 않음)
2. Vercel Import(Framework Preset: Other)
3. 환경변수 값 입력(이름은 DEPLOY.md 3번 표)
4. Deploy → 휴대폰으로 신고 → [AI 분류] → [승인] 확인
5. 관찰 ① SQLite 데이터가 시드로 돌아가는지 · ② 로그인이 없어 남의 신고를 처리할 수 있는지
6. 운영: 재배포 · Rollback → Promote · Logs
7. 끝난 뒤 Settings → Delete Project

### 확인 못 함
- 실제 Vercel 배포 · 휴대폰 화면 · 루트 `server.js`의 기본 내보내기가 입구라는 점(키트 DEPLOY.md에 적힌 내용이고 Vercel 공식 문서는 이 세션에서 확인 못 함)
- Vercel이 `src/public/` · `data/*.json` · `src/migrations/`를 함수에 넣는지(안 넣으면 화면 404 → `includeFiles` 필요) · Git 배포에서 `.vercelignore`가 먹는지 · 함수 시간 제한(안내문 스트리밍 · AI 60초 대기)
- 제안(만들지 않음): AI 키 없이 배포해도 AI 기능을 보여 주려면 replay(녹화 응답) 모드가 필요 — 기획서에 없음.

- 다음: **3-2 보안 점검(SECURITY_CHECK)** (가이드 M3 표) · 이번 작업은 3-2 이후를 하지 않았음.
