import test from 'node:test';
import assert from 'node:assert/strict';
import { quotePackage, safeMediaUrl, SEARCH_PLANS } from './commerce.js';
test('both fees use creator base, not compounded markup', () => {
  assert.deepEqual(quotePackage(1000000), { creator:1000000, creatorFee:100000, companyFee:100000, packageTotal:1100000, subtotal:1200000 });
});
test('refund allocation includes creator-side markup only', () => {
  const q=quotePackage(1000000); assert.equal(q.subtotal-q.packageTotal,100000);
});
test('rounds each package fee before multiplying quantity', () => {
  const q=quotePackage(10005,3); assert.equal(q.creatorFee,3003); assert.equal(q.subtotal,36021);
});
test('rejects manipulated amounts and quantities', () => {
  for (const n of [NaN,Infinity,-1,0,0.1,1000000001]) assert.throws(()=>quotePackage(n));
  for (const q of [0,-1,1.5,21]) assert.throws(()=>quotePackage(10000,q));
});
test('unsafe media URLs are not rendered', () => {
  for (const u of ['javascript:alert(1)','http://example.com','data:text/html,x','https://name:password@example.com']) assert.equal(safeMediaUrl(u),null);
  assert.equal(safeMediaUrl('https://example.com/a'),'https://example.com/a');
});
test('approved plan amounts and allowances', () => {
 assert.deepEqual(Object.values(SEARCH_PLANS).map(p=>[p.amount,p.searches]),[[29900,10],[49900,30],[99900,100]]);
});
