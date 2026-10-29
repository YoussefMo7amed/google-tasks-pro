#!/bin/bash
# Convenient phone screenshot helper
# Usage:
#   npm run screenshot
#   npm run screenshot "calendar-view"
#   ./scripts/capture.sh "my-custom-name"

ADB="$HOME/Library/Android/sdk/platform-tools/adb"
DEVICE="192.168.1.8:5555"
DIR="$(cd "$(dirname "$0")/.." && pwd)/screenshots"
mkdir -p "$DIR"

# Name or timestamp
NAME="${1:-$(date +%Y%m%d_%H%M%S)}"
FILE="$DIR/${NAME}.png"

echo "📸 Capturing phone screen from $DEVICE..."
"$ADB" -s "$DEVICE" exec-out screencap -p > "$FILE"

if [ -s "$FILE" ]; then
  echo "✅ Saved screenshot to: $FILE"
  # Open in Preview automatically on macOS
  open "$FILE" 2>/dev/null || true
else
  echo "❌ Failed to capture screenshot. Check if phone is connected via ADB."
fi
