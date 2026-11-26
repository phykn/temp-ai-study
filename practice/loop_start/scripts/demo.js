'use strict';
// 현장 제보 상황을 눈으로 확인하는 스크립트: npm run demo
const { createLoan } = require('../src/loan');

const loans = [
  { item: 'NB-01', user: '김대리', start: '2026-12-10', end: '2026-12-12', status: 'active' },
];

const cases = [
  { name: '사고 상황: 앞쪽이 걸치는 신청', req: { item: 'NB-01', user: '박사원', start: '2026-12-08', end: '2026-12-10' }, expect: 409 },
  { name: '기간 전체를 덮는 신청', req: { item: 'NB-01', user: '이사원', start: '2026-12-09', end: '2026-12-14' }, expect: 409 },
  { name: '시작일이 안에 드는 신청 (기존에 막던 것)', req: { item: 'NB-01', user: '최사원', start: '2026-12-11', end: '2026-12-13' }, expect: 409 },
];

console.log('기존 대여: NB-01  2026-12-10 ~ 2026-12-12 (김대리)\n');
let bad = 0;
for (const c of cases) {
  const snapshot = loans.map((l) => ({ ...l }));
  const r = createLoan(snapshot, c.req);
  const ok = r.status === c.expect;
  if (!ok) bad += 1;
  console.log(`${ok ? '정상' : '문제'}  ${c.name}`);
  console.log(`      신청 ${c.req.start} ~ ${c.req.end}  →  결과 ${r.status}  (기대 ${c.expect})`);
}
console.log(bad ? `\n기대와 다른 결과 ${bad}건 — 현장에서 겹쳐 빌려 가는 일이 생김` : '\n모두 기대대로 동작');
