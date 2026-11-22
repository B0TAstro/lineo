#!/usr/bin/env bash
# Dev only: copies test videos into the app's Documents on the plugged iPhone, for the replay's
# "Vidéos test" (ball tracking on real matches, without filming them). Nothing goes in the build.
#
#   npm run dev:videos                       # ../temoin-poc-ball-tracking/data/videos
#   npm run dev:videos -- ~/some/folder      # any folder of .mp4 / .mov
#   DEVICE="iPhone Tom" npm run dev:videos   # pick the phone when several are plugged
#
# iOS only (xcrun devicectl). Needs ffprobe (brew install ffmpeg) for each video's length and fps.
set -euo pipefail
export LC_NUMERIC=C

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="${1:-$ROOT/../temoin-poc-ball-tracking/data/videos}"
BUNDLE_ID="com.tomboullay.temoin"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
STAGE="$TMP/dev-videos"
mkdir -p "$STAGE"

if [ -z "${DEVICE:-}" ]; then
  xcrun devicectl list devices --json-output "$TMP/devices.json" >/dev/null
  DEVICE="$(node -e '
    const { devices } = require(process.argv[1]).result;
    const phone = devices.find((d) =>
      d.hardwareProperties?.reality === "physical" &&
      d.connectionProperties?.tunnelState !== "unavailable");
    if (phone) console.log(phone.identifier);
  ' "$TMP/devices.json")"
fi
if [ -z "$DEVICE" ]; then
  echo "✗ no iPhone available: plug it in and unlock it" >&2
  exit 1
fi

# index.json: what the app lists, with each video's length (the replay's timeline) and frame rate
# (frame by frame)
entries=()
shopt -s nullglob nocaseglob
for video in "$SOURCE"/*.mp4 "$SOURCE"/*.mov; do
  name="$(basename "$video")"
  cp "$video" "$STAGE/$name"
  duration="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$video" | head -1)"
  rate="$(ffprobe -v error -select_streams v:0 -show_entries stream=avg_frame_rate -of csv=p=0 "$video" | head -1)"
  fps="$(awk -F/ '{ printf "%.3f", ($2 ? $1 / $2 : $1) }' <<<"$rate")"
  entries+=("{\"name\":\"$name\",\"durationS\":$duration,\"fps\":$fps}")
  echo "→ $name · ${duration%.*} s · $fps fps"
done
if [ ${#entries[@]} -eq 0 ]; then
  echo "✗ no .mp4 or .mov in $SOURCE" >&2
  exit 1
fi
(IFS=,; echo "[${entries[*]}]") >"$STAGE/index.json"

echo "→ copying to the phone ($DEVICE)"
xcrun devicectl device copy to \
  --device "$DEVICE" \
  --source "$STAGE" \
  --destination Documents/dev-videos \
  --domain-type appDataContainer \
  --domain-identifier "$BUNDLE_ID" \
  --remove-existing-content true
echo "✓ done: replay → Vidéos test"
