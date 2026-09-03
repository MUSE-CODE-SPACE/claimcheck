#!/usr/bin/env bash
# 촬영용 데모.
#
# 화면 녹화를 켜고 이 스크립트를 실행하면 영상에 들어갈 장면이 순서대로 나온다.
# 타이핑을 흉내 내지 않는다 — 진짜로 도는 명령이라야 결과도 진짜다.
set -u
cd "$(dirname "$0")/.." || exit 1

pause() { sleep "${1:-2}"; }
say()   { printf '\n\033[90m# %s\033[0m\n' "$1"; }

clear
say "장면 1 — 에이전트가 보고한다"
pause 1
printf '\033[32m✓\033[0m 빌드 성공\n배포 완료했습니다. 이제 정상 동작합니다.\n'
pause 3

clear
say "장면 2 — 실제로는 서버가 죽어 있었다"
pause 1
echo '$ curl -s -o /dev/null -w "%{http_code}\n" https://api.example.invalid/health'
curl -s -o /dev/null -w "%{http_code}\n" --max-time 5 https://api.example.invalid/health 2>/dev/null || echo "000  (연결 안 됨)"
pause 3

clear
say "장면 3 — claimcheck 를 돌린다"
pause 1
echo '$ claimcheck --text "빌드가 성공합니다. 배포 완료했습니다. 원인은 CORS입니다."'
pause 1
# 촬영용 설정을 임시로 쓴다. 실패가 실제로 나야 화면이 진짜가 된다.
cp claimcheck.json /tmp/claimcheck.real.json 2>/dev/null
cp video/demo.claimcheck.json claimcheck.json
node bin/claimcheck.mjs --text "빌드가 성공합니다. 배포 완료했습니다. 원인은 CORS입니다."
cp /tmp/claimcheck.real.json claimcheck.json 2>/dev/null
pause 6

clear
say "장면 4 — 저장소"
pause 1
echo 'github.com/MUSE-CODE-SPACE/claimcheck'
pause 3
