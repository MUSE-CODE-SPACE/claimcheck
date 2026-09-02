import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 파일이 정말 그렇게 생겼는지 본다.
 *
 * "추가했습니다"는 두 가지로 틀릴 수 있다. 파일이 아예 없거나, 있는데 내용이
 * 다르거나. 존재만 확인하면 두 번째를 놓친다.
 */
export async function check(path, { cwd = process.cwd(), contains, absent = false } = {}) {
  const full = resolve(cwd, path);
  try {
    const stat = await fs.stat(full);
    if (absent) return { ok: false, detail: `있어야 하지 않는데 존재합니다 (${stat.size} bytes)` };
    if (!contains) return { ok: true, detail: `${stat.size} bytes` };

    const body = await fs.readFile(full, 'utf8');
    const found = body.includes(contains);
    return {
      ok: found,
      detail: found ? `"${contains}" 확인` : `"${contains}" 가 없습니다`,
    };
  } catch {
    return absent
      ? { ok: true, detail: '없음 (기대한 대로)' }
      : { ok: false, detail: '파일이 없습니다' };
  }
}
