// tools.js — AI가 쓰는 도구 (SPEC 9.2절). 모두 조회만 하고 아무것도 바꾸지 않는다.
// 도구 설명(TOOLS)은 Claude에게 보내고, 실제 실행(runTool)은 서버가 한다.
import { readFileSync } from "node:fs";

const assets = JSON.parse(readFileSync(new URL("../data/assets.json", import.meta.url), "utf-8"));
const HANDLERS = { 이주임: "전기", 최대리: "공조", 정사원: "IT기기", 한과장: "건물" }; // SPEC 2절
const DAY = 24 * 60 * 60 * 1000;

// Claude에게 보내는 도구 설명. 4요소: 이름 · 언제 쓰는지 · 받는 값 · 돌려주는 것
export const TOOLS = [
  {
    name: "get_handler_load",
    description:
      "시설팀 담당자 4명의 지금 일 양을 조회한다. 담당자를 추천하기 전에 반드시 한 번 부른다. " +
      "받는 값은 없다. 돌려주는 것: 담당자마다 이름(name) · 분야(field) · 지금 맡고 있는 '배정' 상태 신고 수(assigned).",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_asset_history",
    description:
      "설비 번호 하나의 이력을 조회한다. 신고에 설비 번호가 있을 때 부른다. " +
      "받는 값: asset_id(설비 번호, 예: PR-3F-02). " +
      "돌려주는 것: 설비 이름 · 도입일 · 사용 연수 · 내용연수 · 지난 수리 목록 · 같은 설비 번호의 신고 목록 · " +
      "최근 7일 신고 수(recent_7days, 이 신고의 접수 시각 기준 · 이 신고 포함). 모르는 설비 번호면 found: false.",
    input_schema: {
      type: "object",
      properties: { asset_id: { type: "string", description: "설비 번호" } },
      required: ["asset_id"],
      additionalProperties: false,
    },
  },
];

// 담당자별 '배정' 신고 수
export function getHandlerLoad(reports) {
  return Object.entries(HANDLERS).map(([name, field]) => ({
    name,
    field,
    assigned: reports.filter((r) => r.status === "assigned" && r.assignee === name).length,
  }));
}

// 설비 이력. "최근 7일"의 기준 시각 = 지금 보고 있는 신고의 접수 시각 (SPEC 9.2)
export function getAssetHistory(assetId, report, reports) {
  const asset = assets.find((a) => a.asset_id === assetId);
  const base = new Date(report.created_at).getTime();
  const sameAsset = reports
    .filter((r) => r.asset_id === assetId && new Date(r.created_at).getTime() <= base)
    .map((r) => ({ id: r.id, title: r.title, status: r.status, created_at: r.created_at }));
  const recent = sameAsset.filter((r) => base - new Date(r.created_at).getTime() <= 7 * DAY);
  if (!asset) return { found: false, asset_id: assetId, reports: sameAsset, recent_7days: recent.length };
  const yearsUsed = Math.floor((base - new Date(asset.installed).getTime()) / (365.25 * DAY));
  return {
    found: true,
    ...asset,
    years_used: yearsUsed,
    over_life: yearsUsed >= asset.life_years, // 내용연수가 지났는지
    reports: sameAsset,
    recent_7days: recent.length,
    base_time: report.created_at,
  };
}

// Claude가 부른 도구를 실제로 실행. reports는 지금 DB의 신고 전체, report는 추천 중인 신고
export function runTool(name, input, report, reports) {
  if (name === "get_handler_load") return getHandlerLoad(reports);
  if (name === "get_asset_history") return getAssetHistory(String(input?.asset_id ?? ""), report, reports);
  return { error: `모르는 도구입니다: ${name}` };
}
