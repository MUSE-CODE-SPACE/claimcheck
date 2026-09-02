import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractClaims, classify, Kind } from '../src/claims.mjs';

test('돌려 볼 수 있는 주장을 알아본다', () => {
  assert.equal(classify('테스트가 모두 통과합니다.').kind, Kind.RUNNABLE);
  assert.equal(classify('The tests pass now.').kind, Kind.RUNNABLE);
});

test('바깥을 봐야 아는 주장을 구분한다', () => {
  assert.equal(classify('배포 완료했습니다.').kind, Kind.EXTERNAL);
  assert.equal(classify('Deployment successful.').kind, Kind.EXTERNAL);
});

test('근거 없이 단정한 문장을 표시한다', () => {
  assert.equal(classify('원인은 CORS입니다.').kind, Kind.UNBACKED);
  assert.equal(classify('The problem is the cache.').kind, Kind.UNBACKED);
});

test('평범한 문장은 주장으로 세지 않는다', () => {
  assert.equal(classify('이제 다음 단계를 보겠습니다.'), null);
  assert.equal(classify('Let me look at the file.'), null);
});

test('코드 블록 안의 문장은 주장이 아니다', () => {
  const text = '```\n테스트가 통과합니다\n```\n다음으로 넘어갑니다.';
  assert.equal(extractClaims(text).length, 0);
});

test('같은 주장이 반복돼도 한 번만 센다', () => {
  const text = '테스트가 통과합니다. 테스트가 통과합니다.';
  assert.equal(extractClaims(text).length, 1);
});
