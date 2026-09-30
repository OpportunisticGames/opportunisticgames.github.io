#!/usr/bin/env bash
# Runs every browser test side by side (the CHAOS test in four parts) and prints only what failed.
# Serve the repo root on 8765 first. Usage: bash tools/test/run.sh [jobs at once, default 5] [only these tests…]
cd "$(dirname "$0")/../.." || exit 1
N=${1:-5}; shift
OUT=$(mktemp -d)
JOBS=(moneyball extreme packs progress breaks matchday secrets features sweep names cards layout races quickmatch hattrick htonline chaos:draft chaos:ev:0/3 chaos:ev:1/3 chaos:ev:2/3)
[ $# -gt 0 ] && JOBS=("$@")
run() {
  local j=$1 name=${1//[:\/]/_} t=${1%%:*} part=${1#*:}
  [ "$part" = "$j" ] && part=''
  local s=$SECONDS
  CHAOS_PART=$part timeout 900 node "tools/test/$t.js" > "$OUT/$name.log" 2>&1
  local code=$?
  if grep -q '^✗' "$OUT/$name.log" || [ $code -ne 0 ]; then echo "✗ $j ($((SECONDS - s))s)"; grep -E '^✗|Error|error' "$OUT/$name.log" | head -8 | sed 's/^/    /'
  else echo "✓ $j ($((SECONDS - s))s, $(grep -c '^✓' "$OUT/$name.log") checks)"; fi
}
export -f run; export OUT
start=$SECONDS
printf '%s\n' "${JOBS[@]}" | xargs -P "$N" -I{} bash -c 'run "$@"' _ {}
echo "done in $((SECONDS - start))s · logs in $OUT"
