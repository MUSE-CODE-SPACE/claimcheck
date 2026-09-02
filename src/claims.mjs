/**
 * 에이전트가 한 주장을 세 가지로 나눈다.
 *
 * 에이전트가 하는 말은 성격이 다른데 화면에서는 똑같이 보인다.
 *
 *   1. 지금 확인할 수 있는 것   — "테스트가 통과합니다", "빌드됩니다"
 *   2. 바깥 세계를 봐야 아는 것 — "배포했습니다" (빌드 성공 ≠ 서버가 살아 있음)
 *   3. 근거 없이 단정한 것      — "원인은 CORS입니다"
 *
 * 1·2는 기계가 확인할 수 있다. 3은 확인할 수 없지만, 확인할 수 없다는 사실
 * 자체를 알려줘야 한다. 셋을 구분하지 않으면 읽는 사람은 전부 같은 무게로
 * 받아들이고, 틀린 진단 위에 다음 작업을 쌓는다.
 */

/** 확인 방법이 붙는 주장의 종류. */
export const Kind = {
  /** 명령을 돌려 보면 알 수 있다 */
  RUNNABLE: 'runnable',
  /** 바깥(배포된 주소 등)을 봐야 안다 */
  EXTERNAL: 'external',
  /** 파일이 실제로 그렇게 생겼는지 보면 안다 */
  ARTIFACT: 'artifact',
  /** 확인할 방법이 없다 — 사람이 판단해야 한다 */
  UNBACKED: 'unbacked',
};

/**
 * 한국어·영어에서 "됐다"고 말하는 흔한 표현들.
 *
 * 완벽한 자연어 이해를 노리지 않는다. 놓치는 것보다 잘못 잡는 것이 더
 * 나쁘므로, 확실한 신호만 잡고 나머지는 사람에게 남긴다.
 */
const RUNNABLE_HINTS = [
  /테스트(가|를)?\s*(모두\s*)?(통과|성공)/,
  /tests?\s+(pass|passing|green)/i,
  /빌드(가|를)?\s*(성공|통과|됩니다|했습니다)/,
  /builds?\s+(succeed|successful|clean)/i,
  /타입\s*(체크|검사)(가|를)?\s*(통과|성공)/,
  /type[- ]?check\s+(passes|clean)/i,
  /린트(가|를)?\s*(통과|깨끗)/,
  /lint\s+(passes|clean)/i,
];

const EXTERNAL_HINTS = [
  /배포(가|를)?\s*(완료|성공|됐|되었|했습니다)/,
  /deploy(ed|ment)?\s+(succeed|successful|complete|done)/i,
  /(정상|잘)\s*(응답|동작|작동)(합니다|해요|한다)/,
  /(is\s+)?(live|up and running|responding)/i,
  /(엔드포인트|API|서버)(가|를)?\s*(살아|정상)/,
];

const ARTIFACT_HINTS = [
  /(파일|함수|클래스)(을|를)?\s*(추가|생성|만들었)/,
  /(added|created)\s+(a\s+)?(file|function|class|endpoint)/i,
  /(제거|삭제)했습니다/,
  /(removed|deleted)/i,
];

/**
 * 근거 없이 단정하는 말투.
 *
 * 이것들은 틀렸다는 뜻이 아니라 **확인되지 않았다**는 뜻이다. 이 대화에서
 * 실제로 "원인은 CORS입니다"라고 단정했다가 틀린 적이 있다 — 서버가 죽어
 * 있었을 뿐이었다.
 */
const UNBACKED_HINTS = [
  /원인은\s+\S+입니다/,
  /(문제|이유)는\s+\S+(입니다|이다|예요)/,
  /the (problem|cause|issue) is\b/i,
  /확실히|분명히|틀림없이/,
  /(definitely|certainly|obviously)\b/i,
];

const match = (text, patterns) => patterns.some((p) => p.test(text));

/**
 * 문장 하나를 분류한다.
 *
 * 확인 가능한 쪽을 먼저 본다 — "배포했고 테스트도 통과합니다" 같은 문장은
 * 확인할 수 있는 것이 하나라도 있으면 확인하는 편이 낫다.
 */
export function classify(sentence) {
  const s = sentence.trim();
  if (!s) return null;
  if (match(s, RUNNABLE_HINTS)) return { kind: Kind.RUNNABLE, text: s };
  if (match(s, EXTERNAL_HINTS)) return { kind: Kind.EXTERNAL, text: s };
  if (match(s, ARTIFACT_HINTS)) return { kind: Kind.ARTIFACT, text: s };
  if (match(s, UNBACKED_HINTS)) return { kind: Kind.UNBACKED, text: s };
  return null;
}

/** 긴 글을 문장 단위로 쪼갠다. 코드 블록은 주장이 아니므로 걷어낸다. */
export function extractClaims(text) {
  const withoutCode = String(text ?? '').replace(/```[\s\S]*?```/g, ' ');
  const sentences = withoutCode
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.replace(/^[-*·•\s]+/, '').trim())
    .filter((s) => s.length >= 6 && s.length <= 400);

  const claims = [];
  const seen = new Set();
  for (const s of sentences) {
    const c = classify(s);
    if (!c) continue;
    const key = c.text.slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    claims.push(c);
  }
  return claims;
}
