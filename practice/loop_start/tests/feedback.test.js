'use strict';
// 현장 제보 카드(feedback_cards.md)의 기준 AC-9~13 · SPEC.md 5절
const test = require('node:test');
const assert = require('node:assert');
const { createLoan } = require('../src/loan');

// 김대리가 NB-01을 12/10~12/12에 빌려 간 상태
const kimLoan = () => [
  { item: 'NB-01', user: '김대리', start: '2026-12-10', end: '2026-12-12', status: 'active' },
];

test('AC-9 앞쪽이 걸치는 신청은 409로 거절되고 목록은 그대로다', () => {
  const loans = kimLoan();
  const r = createLoan(loans, { item: 'NB-01', user: '박사원', start: '2026-12-08', end: '2026-12-10' });
  assert.strictEqual(r.status, 409);
  assert.strictEqual(r.error, 'overlap'); // 오류 이름까지 확인 (리뷰 지적 1)
  assert.strictEqual(loans.length, 1);
});

test('AC-10 기간 전체를 덮는 신청은 409로 거절되고 목록은 그대로다', () => {
  const loans = kimLoan();
  const r = createLoan(loans, { item: 'NB-01', user: '이사원', start: '2026-12-09', end: '2026-12-14' });
  assert.strictEqual(r.status, 409);
  assert.strictEqual(r.error, 'overlap'); // 오류 이름까지 확인 (리뷰 지적 1)
  assert.strictEqual(loans.length, 1);
});

test('AC-11 반납한 건과 겹치는 신청은 201로 승인되고 목록에 추가된다', () => {
  // NB-02를 12/1~12/5로 빌렸다가 이미 반납함
  const loans = [{ item: 'NB-02', user: '최대리', start: '2026-12-01', end: '2026-12-05', status: 'returned' }];
  const r = createLoan(loans, { item: 'NB-02', user: '박사원', start: '2026-12-03', end: '2026-12-04' });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(loans.length, 2);
});

test('AC-12 7일 신청은 201로 승인된다', () => {
  const r = createLoan([], { item: 'MON-01', user: '박사원', start: '2026-12-01', end: '2026-12-07' });
  assert.strictEqual(r.status, 201);
});

test('AC-13 8일 신청은 400으로 거절되고 목록은 그대로다', () => {
  const loans = [];
  const r = createLoan(loans, { item: 'MON-01', user: '박사원', start: '2026-12-01', end: '2026-12-08' });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.error, 'too_long'); // bad_dates로 거절돼도 통과하던 빈틈 (리뷰 지적 1)
  assert.strictEqual(loans.length, 0);
});
