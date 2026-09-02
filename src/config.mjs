import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 무엇을 어떻게 확인할지는 저장소마다 다르다.
 *
 * 테스트 명령이 `npm test`인 곳도 있고 `pytest`인 곳도 있다. 추측하면 틀리고,
 * 틀린 확인은 확인하지 않은 것보다 나쁘다 — 통과했다고 잘못 말하기 때문이다.
 * 그래서 설정이 없으면 추측하지 않고 "확인할 방법을 모른다"고 말한다.
 */
export const CONFIG_NAME = 'claimcheck.json';

const DEFAULT = {
  checks: {},
  /** 배포 주장을 확인할 주소들 */
  endpoints: [],
};

export async function loadConfig(cwd = process.cwd()) {
  try {
    const raw = await fs.readFile(resolve(cwd, CONFIG_NAME), 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT, ...parsed, found: true };
  } catch {
    return { ...DEFAULT, found: false };
  }
}

/**
 * 설정이 없을 때 만들어 주는 초안.
 *
 * 빈 파일을 주면 무엇을 적어야 할지 모른다. 흔한 명령을 주석처럼 채워 두되,
 * 실제로 도는지는 사용자가 확인하게 한다.
 */
export function scaffold(detected) {
  return JSON.stringify(
    {
      checks: {
        tests: detected.tests ?? 'npm test',
        build: detected.build ?? 'npm run build',
        types: detected.types ?? null,
        lint: detected.lint ?? null,
      },
      endpoints: [],
    },
    null,
    2,
  );
}

/** package.json 스크립트에서 흔한 이름을 찾는다. 없으면 비워 둔다. */
export async function detect(cwd = process.cwd()) {
  try {
    const pkg = JSON.parse(await fs.readFile(resolve(cwd, 'package.json'), 'utf8'));
    const s = pkg.scripts ?? {};
    const pick = (...names) => {
      const hit = names.find((n) => s[n]);
      return hit ? `npm run ${hit}` : null;
    };
    return {
      tests: s.test ? 'npm test' : pick('test:unit', 'vitest', 'jest'),
      build: pick('build'),
      types: pick('typecheck', 'type-check', 'tsc'),
      lint: pick('lint'),
    };
  } catch {
    return {};
  }
}
