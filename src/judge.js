// judge.js — 심각도를 누가 정했는지(severity_by) 정하는 규칙 (SPEC 10.5절 · AC-13). DB도 AI도 모르는 순수 함수
// 이 값은 서버만 정한다. 화면이 보낸 값은 받지 않는다 (server.js checkChange가 400)

// [승인]할 때 DB에 넣을 칸. 승인할 수 없으면 이유 코드: "no_suggestion"(제안 없음) · "decided"(이미 심각도가 정해짐)
// → { fields } 또는 { error }
export function approveFields(report) {
  if (!report.ai_severity) return { error: "no_suggestion" };
  if (report.severity !== "none") return { error: "decided" }; // 사람이 이미 정한 심각도를 AI 제안으로 덮지 않음
  return { fields: { severity: report.ai_severity, category: report.ai_category, severity_by: "ai" } };
}
