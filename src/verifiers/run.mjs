import { spawn } from 'node:child_process';

/**
 * 명령을 돌려 결과를 그대로 가져온다.
 *
 * 확인의 핵심은 "정말 돌려 봤는가"다. 종료 코드만 보지 않고 출력 끝부분을
 * 함께 남긴다 — 실패했을 때 왜 실패했는지 다시 돌리지 않고 알 수 있어야 한다.
 */
export function run(command, { cwd = process.cwd(), timeoutMs = 300_000 } = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, { cwd, shell: true, env: process.env });

    let out = '';
    const cap = (chunk) => {
      out += chunk;
      // 긴 로그를 통째로 들고 있을 이유가 없다. 실패 원인은 대개 끝에 있다.
      if (out.length > 200_000) out = out.slice(-100_000);
    };
    child.stdout?.on('data', cap);
    child.stderr?.on('data', cap);

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({
        ok: false,
        code: null,
        timedOut: true,
        ms: Date.now() - started,
        output: out.slice(-4000),
      });
    }, timeoutMs);

    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ ok: false, code: null, error: e.message, ms: Date.now() - started, output: out.slice(-4000) });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code, ms: Date.now() - started, output: out.slice(-4000) });
    });
  });
}
