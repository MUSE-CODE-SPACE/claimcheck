const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', gray: '\x1b[90m',
};
const plain = process.env.NO_COLOR || !process.stdout.isTTY;
const c = (code, s) => (plain ? s : `${code}${s}${C.reset}`);

export const Verdict = { HELD: 'held', FAILED: 'failed', UNCHECKED: 'unchecked' };

const MARK = {
  [Verdict.HELD]: () => c(C.green, '통과'),
  [Verdict.FAILED]: () => c(C.red, '실패'),
  [Verdict.UNCHECKED]: () => c(C.yellow, '확인 못 함'),
};

/**
 * 결과를 사람이 읽는 순서로 낸다.
 *
 * 실패를 맨 위에 둔다. 통과한 것을 스크롤해서 지나가야 실패가 보이면, 바쁜
 * 사람은 결국 안 본다.
 *
 * "확인 못 함"을 통과와 섞지 않는 것이 이 도구의 요점이다. 확인하지 않은
 * 주장을 통과로 세면 숫자가 거짓말을 한다.
 */
export function render(results) {
  const by = (v) => results.filter((r) => r.verdict === v);
  const failed = by(Verdict.FAILED);
  const unchecked = by(Verdict.UNCHECKED);
  const held = by(Verdict.HELD);

  const lines = [];
  const section = (title, items) => {
    if (!items.length) return;
    lines.push('');
    lines.push(c(C.bold, title));
    for (const r of items) {
      lines.push(`  ${MARK[r.verdict]()}  ${r.claim}`);
      if (r.detail) lines.push(`        ${c(C.gray, r.detail)}`);
      if (r.evidence) {
        for (const line of String(r.evidence).trim().split('\n').slice(-6)) {
          lines.push(`        ${c(C.dim, line.slice(0, 160))}`);
        }
      }
    }
  };

  section('사실과 달랐던 것', failed);
  section('확인할 방법이 없는 것', unchecked);
  section('확인된 것', held);

  lines.push('');
  lines.push(
    `${held.length} 통과 · ${failed.length} 실패 · ${unchecked.length} 확인 못 함`,
  );
  if (unchecked.length) {
    lines.push(
      c(C.gray, '확인 못 한 것은 틀렸다는 뜻이 아니라, 기계가 판단할 근거가 없다는 뜻입니다.'),
    );
  }
  return lines.join('\n');
}

export function toJson(results) {
  return JSON.stringify(
    {
      summary: {
        held: results.filter((r) => r.verdict === Verdict.HELD).length,
        failed: results.filter((r) => r.verdict === Verdict.FAILED).length,
        unchecked: results.filter((r) => r.verdict === Verdict.UNCHECKED).length,
      },
      results,
    },
    null,
    2,
  );
}
