'use strict';
// 깨 보기 (실습 1-6): 현장에서 나올 법한 입력으로 일부러 깨뜨려 본 기록
// AC-9~13은 "막아야 할 것"만 말한다. 여기는 "여전히 되어야 하는 것"과 경계를 지킨다.
const test = require('node:test');
const assert = require('node:assert');
const { createLoan } = require('../src/loan');

// 김대리가 NB-01을 12/10~12/12에 빌려 간 상태
const kimLoan = () => [
  { item: 'NB-01', user: '김대리', start: '2026-12-10', end: '2026-12-12', status: 'active' },
];

test('깨기 1 기존 대여가 끝난 바로 다음 날 시작하는 신청은 승인된다', () => {
  // 현장에서 가장 흔한 신청: 김대리가 12일에 반납 → 13일부터 빌림
  const r = createLoan(kimLoan(), { item: 'NB-01', user: '박사원', start: '2026-12-13', end: '2026-12-15' });
  assert.strictEqual(r.status, 201);
});

test('깨기 2 기존 대여 시작 바로 전날 끝나는 신청은 승인된다', () => {
  const r = createLoan(kimLoan(), { item: 'NB-01', user: '박사원', start: '2026-12-07', end: '2026-12-09' });
  assert.strictEqual(r.status, 201);
});

test('깨기 3 기존 대여 마지막 날 시작하는 신청은 409로 거절된다', () => {
  // 하루라도 겹치면 안 됨 (12일은 김대리가 아직 쓰는 날)
  const r = createLoan(kimLoan(), { item: 'NB-01', user: '박사원', start: '2026-12-12', end: '2026-12-13' });
  assert.strictEqual(r.status, 409);
  assert.strictEqual(r.error, 'overlap');
});

test('깨기 4 하루짜리 신청(시작일 = 종료일)은 승인된다', () => {
  const r = createLoan([], { item: 'MON-01', user: '박사원', start: '2026-12-01', end: '2026-12-01' });
  assert.strictEqual(r.status, 201);
});

test('깨기 5 해가 바뀌는 7일 신청(12/28~1/3)은 승인된다', () => {
  const r = createLoan([], { item: 'MON-01', user: '박사원', start: '2026-12-28', end: '2027-01-03' });
  assert.strictEqual(r.status, 201);
});

test('깨기 6 해가 바뀌는 8일 신청(12/28~1/4)은 too_long으로 거절된다', () => {
  const r = createLoan([], { item: 'MON-01', user: '박사원', start: '2026-12-28', end: '2027-01-04' });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.error, 'too_long');
});

test('깨기 7 2월 말을 넘는 7일 신청(2/25~3/3)은 승인된다', () => {
  // 2027년 2월은 28일까지: 25·26·27·28·1·2·3 = 7일
  const r = createLoan([], { item: 'MON-01', user: '박사원', start: '2027-02-25', end: '2027-03-03' });
  assert.strictEqual(r.status, 201);
});

test('깨기 8 한 번 거절된 뒤에도 같은 장비의 다른 날짜는 빌릴 수 있다', () => {
  // 거절된 신청이 목록에 몰래 남아 다음 신청을 막지 않는지
  const loans = kimLoan();
  createLoan(loans, { item: 'NB-01', user: '이사원', start: '2026-12-09', end: '2026-12-14' }); // 409
  const r = createLoan(loans, { item: 'NB-01', user: '이사원', start: '2026-12-15', end: '2026-12-16' });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(loans.length, 2);
});
