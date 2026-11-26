'use strict';

// 비품 대여 신청을 받아 가능 여부를 판정한다. (규칙은 SPEC.md 참고)
// loans: [{ item, user, start, end, status }]  날짜는 'YYYY-MM-DD', status는 'active' | 'returned'
// req:   { item, user, start, end }

const ITEMS = ['NB-01', 'NB-02', 'MON-01'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const MAX_DAYS = 7; // 한 번에 빌릴 수 있는 최대 일수 (FB-3 · AC-12·13)

// 대여 일수: 시작일과 종료일을 모두 센다 (12/1~12/7 = 7일)
function daysOf(req) {
  const ms = Date.parse(req.end + 'T00:00:00Z') - Date.parse(req.start + 'T00:00:00Z');
  return ms / 86400000 + 1;
}

// 새 신청(req)과 기존 대여(ex)의 기간이 하루라도 겹치는지 본다.
// 두 기간이 겹치지 않는 경우는 "새 신청이 기존보다 완전히 앞" 또는 "완전히 뒤" 둘뿐이다.
// 그래서 그 둘이 아니면 겹침 (앞쪽 걸침 AC-9 · 전체 덮음 AC-10 · 시작일이 안에 듦 AC-8 모두 포함)
function overlaps(req, ex) {
  return req.start <= ex.end && req.end >= ex.start;
}

function createLoan(loans, req) {
  if (!ITEMS.includes(req.item)) return { status: 404, error: 'unknown_item' };
  if (!isDate(req.start) || !isDate(req.end) || req.end < req.start) {
    return { status: 400, error: 'bad_dates' };
  }
  if (daysOf(req) > MAX_DAYS) return { status: 400, error: 'too_long' }; // 8일 이상은 거절 (AC-13)

  // 반납된 건(returned)은 이미 돌려받은 장비라 겹침에서 뺀다 (AC-11)
  const clash = loans.some((ex) => ex.item === req.item && ex.status !== 'returned' && overlaps(req, ex));
  if (clash) return { status: 409, error: 'overlap' };

  const loan = { item: req.item, user: req.user, start: req.start, end: req.end, status: 'active' };
  loans.push(loan);
  return { status: 201, loan };
}

module.exports = { createLoan, ITEMS };
