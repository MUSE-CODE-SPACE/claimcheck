import { Kind } from './claims.mjs';
import { run } from './verifiers/run.mjs';
import { check as httpCheck } from './verifiers/http.mjs';
import { Verdict } from './report.mjs';

/**
 * 주장을 확인 수단에 연결한다.
 *
 * 여기서 지키는 규칙 하나: **확인 수단이 없으면 통과라고 말하지 않는다.**
 * 테스트 명령을 모르는데 "테스트가 통과합니다"를 통과로 세면, 이 도구는
 * 거짓말을 거르는 대신 거짓말에 도장을 찍어 주는 물건이 된다.
 */

const NEEDS = [
  { re: /테스트|tests?\b/i, key: 'tests', label: '테스트' },
  { re: /빌드|builds?\b/i, key: 'build', label: '빌드' },
  { re: /타입|type[- ]?check/i, key: 'types', label: '타입 검사' },
  { re: /린트|lint/i, key: 'lint', label: '린트' },
];

function neededChecks(text) {
  return NEEDS.filter((n) => n.re.test(text));
}

export async function verifyClaims(claims, config, { cwd = process.cwd() } = {}) {
  const results = [];
  // 같은 명령을 여러 주장이 요구해도 한 번만 돌린다.
  const ran = new Map();

  const runOnce = async (command) => {
    if (!ran.has(command)) ran.set(command, run(command, { cwd }));
    return ran.get(command);
  };

  for (const claim of claims) {
    if (claim.kind === Kind.UNBACKED) {
      results.push({
        claim: claim.text,
        kind: claim.kind,
        verdict: Verdict.UNCHECKED,
        detail: '근거 없이 단정한 문장입니다. 무엇을 보고 그렇게 판단했는지 확인해 보세요.',
      });
      continue;
    }

    if (claim.kind === Kind.RUNNABLE) {
      const needs = neededChecks(claim.text);
      const runnable = needs.filter((n) => config.checks?.[n.key]);

      if (!runnable.length) {
        results.push({
          claim: claim.text,
          kind: claim.kind,
          verdict: Verdict.UNCHECKED,
          detail: needs.length
            ? `${needs.map((n) => n.label).join('·')} 명령이 claimcheck.json 에 없습니다.`
            : '무엇을 돌려야 하는지 알 수 없습니다.',
        });
        continue;
      }

      let failedOne = null;
      for (const n of runnable) {
        const res = await runOnce(config.checks[n.key]);
        if (!res.ok) {
          failedOne = { n, res };
          break;
        }
      }

      results.push(
        failedOne
          ? {
              claim: claim.text,
              kind: claim.kind,
              verdict: Verdict.FAILED,
              detail: `${failedOne.n.label}: ${config.checks[failedOne.n.key]} → ${
                failedOne.res.timedOut ? '시간 초과' : `종료 코드 ${failedOne.res.code}`
              }`,
              evidence: failedOne.res.output,
            }
          : {
              claim: claim.text,
              kind: claim.kind,
              verdict: Verdict.HELD,
              detail: runnable.map((n) => `${n.label} 통과`).join(' · '),
            },
      );
      continue;
    }

    if (claim.kind === Kind.EXTERNAL) {
      const endpoints = config.endpoints ?? [];
      if (!endpoints.length) {
        results.push({
          claim: claim.text,
          kind: claim.kind,
          verdict: Verdict.UNCHECKED,
          detail:
            '확인할 주소가 claimcheck.json 에 없습니다. 배포됐다는 말은 빌드가 아니라 살아 있는 주소로 확인해야 합니다.',
        });
        continue;
      }

      const checks = await Promise.all(
        endpoints.map(async (e) => {
          const spec = typeof e === 'string' ? { url: e } : e;
          const r = await httpCheck(spec.url, spec);
          return { spec, r };
        }),
      );
      const bad = checks.find((x) => !x.r.ok);

      results.push(
        bad
          ? {
              claim: claim.text,
              kind: claim.kind,
              verdict: Verdict.FAILED,
              detail: `${bad.spec.url} → ${bad.r.detail}`,
            }
          : {
              claim: claim.text,
              kind: claim.kind,
              verdict: Verdict.HELD,
              detail: checks.map((x) => `${x.spec.url} ${x.r.status}`).join(' · '),
            },
      );
      continue;
    }

    // 파일 변경 주장은 무엇이 바뀌었는지 사람이 봐야 판단이 된다.
    results.push({
      claim: claim.text,
      kind: claim.kind,
      verdict: Verdict.UNCHECKED,
      detail: '무엇을 만들었다는 주장입니다. git diff 로 실제 변경을 확인하세요.',
    });
  }

  return results;
}
