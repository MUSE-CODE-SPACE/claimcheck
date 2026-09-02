#!/usr/bin/env node
/**
 * claimcheck — 코딩 에이전트가 했다고 말한 것을 실제로 돌려 본다.
 *
 * 에이전트는 "테스트가 통과합니다", "배포했습니다"라고 말한다. 대개는 맞지만
 * 가끔 틀리고, 틀렸을 때 알아채는 사람은 직접 돌려 본 사람뿐이다. 이 도구는
 * 그 확인을 대신한다.
 *
 * 확인할 수 없는 주장은 통과로 세지 않는다. 그게 이 도구의 전부다.
 */
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';

import { extractClaims } from '../src/claims.mjs';
import { loadConfig, scaffold, detect, CONFIG_NAME } from '../src/config.mjs';
import { latestSession, readAssistantText } from '../src/transcript.mjs';
import { verifyClaims } from '../src/verify.mjs';
import { render, toJson, Verdict } from '../src/report.mjs';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const cwd = process.cwd();

if (has('--help') || has('-h')) {
  console.log(`claimcheck — 에이전트가 했다고 말한 것을 실제로 돌려 봅니다

사용법
  claimcheck                    최근 대화에서 주장을 찾아 확인합니다
  claimcheck --turns 3          최근 3개 발화만 봅니다 (기본 12)
  claimcheck --text "..."       주어진 글에서 주장을 찾습니다
  claimcheck --init             ${CONFIG_NAME} 을 만듭니다
  claimcheck --json             결과를 JSON 으로 냅니다

실패한 주장이 있으면 종료 코드 1 로 끝납니다.`);
  process.exit(0);
}

if (has('--init')) {
  const path = resolve(cwd, CONFIG_NAME);
  try {
    await fs.access(path);
    console.log(`${CONFIG_NAME} 이 이미 있습니다.`);
    process.exit(0);
  } catch {
    /* 없으면 만든다 */
  }
  await fs.writeFile(path, scaffold(await detect(cwd)) + '\n');
  console.log(`${CONFIG_NAME} 을 만들었습니다. 명령이 실제로 도는지 확인하고 고쳐 주세요.`);
  console.log('배포 주장을 확인하려면 endpoints 에 주소를 넣으세요.');
  process.exit(0);
}

const config = await loadConfig(cwd);

let sources = [];
const text = val('--text');
if (text) {
  sources = [{ text, at: null }];
} else {
  const session = await latestSession(cwd);
  if (!session) {
    console.error('이 폴더의 Claude Code 대화 기록을 찾지 못했습니다.');
    console.error('--text "확인할 글" 로 직접 넣을 수 있습니다.');
    process.exit(2);
  }
  sources = await readAssistantText(session, { lastTurns: Number(val('--turns', '12')) });
}

const claims = sources.flatMap((s) => extractClaims(s.text));

if (!claims.length) {
  console.log('확인할 만한 주장을 찾지 못했습니다.');
  process.exit(0);
}

if (!config.found) {
  console.log(`${CONFIG_NAME} 이 없어 명령을 돌리지 못합니다. claimcheck --init 으로 만드세요.\n`);
}

const results = await verifyClaims(claims, config, { cwd });

console.log(has('--json') ? toJson(results) : render(results));
process.exit(results.some((r) => r.verdict === Verdict.FAILED) ? 1 : 0);
