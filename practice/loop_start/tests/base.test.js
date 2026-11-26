'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createLoan } = require('../src/loan');

const existing = () => [
  { item: 'NB-01', user: '김대리', start: '2026-12-10', end: '2026-12-12', status: 'active' },
];

test('AC-1 정상 신청은 201과 대여 정보를 돌려준다', () => {
  const loans = [];
  const r = createLoan(loans, { item: 'NB-01', user: '박사원', start: '2026-12-01', end: '2026-12-03' });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.loan.item, 'NB-01');
});

test('AC-2 승인되면 대여 목록에 추가된다', () => {
  const loans = [];
  createLoan(loans, { item: 'NB-01', user: '박사원', start: '2026-12-01', end: '2026-12-03' });
  assert.strictEqual(loans.length, 1);
});

test('AC-3 없는 장비는 404', () => {
  const r = createLoan([], { item: 'XX-99', user: '박사원', start: '2026-12-01', end: '2026-12-03' });
  assert.strictEqual(r.status, 404);
});

test('AC-4 종료일이 시작일보다 빠르면 400', () => {
  const r = createLoan([], { item: 'NB-01', user: '박사원', start: '2026-12-05', end: '2026-12-03' });
  assert.strictEqual(r.status, 400);
});

test('AC-5 날짜 형식이 틀리면 400', () => {
  const r = createLoan([], { item: 'NB-01', user: '박사원', start: '12/01', end: '12/03' });
  assert.strictEqual(r.status, 400);
});

test('AC-6 다른 장비는 같은 기간에도 빌릴 수 있다', () => {
  const loans = existing();
  const r = createLoan(loans, { item: 'NB-02', user: '박사원', start: '2026-12-10', end: '2026-12-12' });
  assert.strictEqual(r.status, 201);
});

test('AC-7 겹치지 않는 다른 기간은 빌릴 수 있다', () => {
  const loans = existing();
  const r = createLoan(loans, { item: 'NB-01', user: '박사원', start: '2026-12-20', end: '2026-12-22' });
  assert.strictEqual(r.status, 201);
});

test('AC-8 시작일이 기존 대여 기간 안에 들면 409', () => {
  const loans = existing();
  const r = createLoan(loans, { item: 'NB-01', user: '박사원', start: '2026-12-11', end: '2026-12-13' });
  assert.strictEqual(r.status, 409);
});
