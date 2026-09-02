import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Claude Code 세션 기록에서 에이전트가 한 말만 꺼낸다.
 *
 * 기록은 프로젝트 경로를 납작하게 만든 폴더에 JSONL 로 쌓인다. 한 줄이 한
 * 레코드이고 종류가 여럿인데, 우리가 볼 것은 `assistant` 의 텍스트뿐이다.
 * 생각(thinking)과 도구 호출은 사용자에게 보인 주장이 아니므로 제외한다 —
 * 확인해야 할 것은 "화면에 대고 한 말"이다.
 */
export function projectDir(cwd = process.cwd()) {
  // /Users/me/Projects/app → -Users-me-Projects-app
  return join(homedir(), '.claude', 'projects', cwd.replace(/\//g, '-'));
}

export async function latestSession(cwd = process.cwd()) {
  const dir = projectDir(cwd);
  let names;
  try {
    names = (await fs.readdir(dir)).filter((n) => n.endsWith('.jsonl'));
  } catch {
    return null;
  }
  if (!names.length) return null;

  const stats = await Promise.all(
    names.map(async (n) => ({ path: join(dir, n), mtime: (await fs.stat(join(dir, n))).mtimeMs })),
  );
  stats.sort((a, b) => b.mtime - a.mtime);
  return stats[0].path;
}

/** 마지막 N개의 assistant 발화를 오래된 순으로 돌려준다. */
export async function readAssistantText(path, { lastTurns = 12 } = {}) {
  const raw = await fs.readFile(path, 'utf8');
  const turns = [];

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (rec.type !== 'assistant') continue;

    const content = rec.message?.content;
    if (!Array.isArray(content)) continue;

    const text = content
      .filter((c) => c?.type === 'text' && typeof c.text === 'string')
      .map((c) => c.text)
      .join('\n')
      .trim();

    if (text) turns.push({ text, at: rec.timestamp });
  }

  return turns.slice(-lastTurns);
}
