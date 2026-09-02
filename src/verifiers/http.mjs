/**
 * 주소를 실제로 열어 본다.
 *
 * "배포 완료"라는 말과 서버가 살아 있다는 사실은 다르다. 빌드가 성공해도
 * 컨테이너가 부팅에 실패하면 배포 화면은 초록색인데 응답은 502다. 그런
 * 상황에서 브라우저는 CORS 오류를 보여주기 때문에, 확인하지 않으면 엉뚱한
 * 곳을 고치게 된다.
 */
export async function check(url, { expect = 200, timeoutMs = 15_000, contains } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    const body = contains ? (await res.text()).slice(0, 200_000) : '';
    const statusOk = Array.isArray(expect) ? expect.includes(res.status) : res.status === expect;
    const bodyOk = contains ? body.includes(contains) : true;

    return {
      ok: statusOk && bodyOk,
      status: res.status,
      ms: Date.now() - started,
      detail: !statusOk
        ? `기대 ${expect}, 실제 ${res.status}`
        : !bodyOk
          ? `응답에 "${contains}" 가 없습니다`
          : `${res.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - started,
      // 여기가 중요하다. 연결 자체가 안 되는 것과 404 는 완전히 다른 문제다.
      detail: `연결 실패 — ${e instanceof Error ? e.message : String(e)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
