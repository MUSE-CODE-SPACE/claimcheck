# 영상 자료

- `script.md` — 대본 (장면·내레이션·쓰지 않을 표현)
- `narration.txt` — 내레이션만 번호를 붙여 분리. 음성 합성이나 자막 타이밍에 그대로 넣는다
- `demo.sh` — 촬영용. 화면 녹화를 켜고 실행하면 영상에 들어갈 장면이 순서대로 나온다

## 촬영

```bash
# 데모 설정을 먼저 만든다 — 장면 3에서 실패가 보여야 한다
cat > claimcheck.json <<'JSON'
{
  "checks": { "build": "node -e \"process.exit(1)\"" },
  "endpoints": [{ "url": "https://api.example.invalid/health", "expect": 200 }]
}
JSON

./video/demo.sh
```

터미널 글자 크기를 키우고(16pt 이상) 창을 1280×720에 맞추면 자막 자리가 남는다.

## 원칙

타이핑을 흉내 내지 않는다. 진짜로 도는 명령이라야 결과도 진짜다. 화면에 보이는
실패는 실제 실패여야 하고, 통과는 실제 통과여야 한다.
