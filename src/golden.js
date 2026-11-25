// golden.js — 현장 수정 → 평가셋 후보 만들기 (SPEC 10.3절 · AC-19). DB도 AI도 모르는 순수 함수
const NAME = { urgent: "긴급", warning: "주의", info: "정보" };

// 신고 목록에서 후보만 골라 eval/golden.json의 items와 같은 모양으로 돌려줌
// 후보 = 사람이 심각도를 정한 신고 중 ⓐ 보류였던 것 ⓑ AI 제안과 다르게 정한 것
// 뺀다: AI 제안이 없던 것 · 보류가 아닌데 제안과 같은 값(= [승인]하거나 같게 고름)
export function evalCandidates(reports) {
  const items = [];
  for (const r of reports) {
    if (r.severity === "none" || !r.ai_severity) continue;
    const held = r.ai_hold === 1;
    if (!held && r.ai_severity === r.severity) continue;
    const why = held ? `판단 보류 → 사람 ${NAME[r.severity]}` : `현장 수정: AI 제안 ${NAME[r.ai_severity]} → 사람 ${NAME[r.severity]}`;
    items.push({ id: r.id, title: r.title, location: r.location, building: r.building, asset_id: r.asset_id, body: r.body, expected: r.severity, why });
  }
  return items;
}
