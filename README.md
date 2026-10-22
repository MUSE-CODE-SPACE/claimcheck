# claimcheck

코딩 에이전트가 "테스트가 통과합니다", "배포했습니다"라고 하면, 그 명령을 실제로
돌려 보고 사실인지 확인합니다.

```
$ claimcheck

사실과 달랐던 것
  실패  빌드가 성공합니다.
        빌드: pnpm build → 종료 코드 1
        error TS2339: Property 'linkCheck' does not exist

  실패  배포 완료했습니다.
        https://api.example.com/health → 연결 실패 — fetch failed

확인할 방법이 없는 것
  확인 못 함  원인은 CORS입니다.
        근거 없이 단정한 문장입니다. 무엇을 보고 그렇게 판단했는지 확인해 보세요.

확인된 것
  통과  타입 검사를 통과합니다.
        타입 검사 통과

1 통과 · 2 실패 · 1 확인 못 함
```

## 왜 만들었나

에이전트가 하는 말은 대개 맞습니다. 문제는 가끔 틀린다는 것과, 틀렸을 때
알아채는 사람이 직접 돌려 본 사람뿐이라는 것입니다.

실제로 겪은 경우입니다. 배포가 "성공"으로 표시됐는데 컨테이너는 부팅에 실패해
서버가 502를 내고 있었습니다. 브라우저에는 CORS 오류로 보였고, 그래서 한동안
CORS 설정을 들여다봤습니다. `/health` 를 한 번 열어 봤으면 3분이면 끝날 일이었습니다.

빌드가 성공했다는 것과 서비스가 살아 있다는 것은 다릅니다. 이 도구는 그 차이를
확인합니다.

## 세 가지로 나눕니다

에이전트의 말은 성격이 다른데 화면에서는 똑같이 보입니다.

| | 예 | 확인 방법 |
|---|---|---|
| 지금 확인 가능 | "테스트가 통과합니다" | 그 명령을 돌려 봅니다 |
| 바깥을 봐야 아는 것 | "배포했습니다" | 주소를 실제로 열어 봅니다 |
| 근거 없이 단정한 것 | "원인은 CORS입니다" | 확인할 수 없습니다 — 표시만 합니다 |

**확인 못 한 것을 통과로 세지 않습니다.** 이게 이 도구의 전부입니다. 확인하지 않은
주장을 통과로 세면 숫자가 거짓말을 하고, 그러면 없느니만 못합니다.

## 설치

```bash
npm install -g github:MUSE-CODE-SPACE/claimcheck
```

npm 레지스트리의 `claimcheck` 는 이 프로젝트와 무관한 다른 패키지이므로 GitHub 에서 직접 설치합니다.
Node 18 이상이면 됩니다. 의존성은 없습니다.

## 사용

```bash
claimcheck --init      # claimcheck.json 을 만듭니다
claimcheck             # 최근 대화에서 주장을 찾아 확인합니다
claimcheck --turns 3   # 최근 3개 발화만 봅니다
claimcheck --json      # 결과를 JSON 으로
```

실패한 주장이 있으면 종료 코드 1로 끝나므로 CI에 걸 수 있습니다.

### claimcheck.json

```json
{
  "checks": {
    "tests": "pnpm test",
    "build": "pnpm build",
    "types": "pnpm exec tsc --noEmit",
    "lint": null
  },
  "endpoints": [
    { "url": "https://api.example.com/health", "expect": 200, "contains": "ok" }
  ]
}
```

명령을 추측해서 넣지 않습니다. 모르는 것은 `null` 로 두면 "확인 못 함"으로
표시됩니다. 틀린 명령을 넣으면 통과했다고 잘못 말하게 되는데, 그건 확인하지 않은
것보다 나쁩니다.

## Claude Code 스킬로 쓰기

`skill/SKILL.md` 를 `.claude/skills/claimcheck/SKILL.md` 로 복사하면, 에이전트가
완료를 보고하기 전에 스스로 확인하게 됩니다.

```bash
mkdir -p .claude/skills/claimcheck
curl -fsSL https://raw.githubusercontent.com/MUSE-CODE-SPACE/claimcheck/main/skill/SKILL.md \
  -o .claude/skills/claimcheck/SKILL.md
```

프로젝트에 `npm install -D github:MUSE-CODE-SPACE/claimcheck` 로 설치했다면
`node_modules/claimcheck/skill/SKILL.md` 를 복사해도 됩니다.

## 한계

- **자연어를 완벽히 이해하지 않습니다.** 확실한 표현만 잡고 나머지는 넘깁니다.
  놓치는 것보다 잘못 잡는 것이 나쁘기 때문입니다.
- **"파일을 추가했습니다" 류는 확인하지 않습니다.** 무엇이 옳은지 판단하려면
  의도를 알아야 하는데, 그건 사람이 `git diff` 를 봐야 합니다.
- **지금은 Claude Code 대화 기록만 읽습니다.** 다른 도구는 `--text` 로 넣으면 됩니다.
- 한국어와 영어만 인식합니다.

## 라이선스

MIT — [LICENSE](LICENSE)
