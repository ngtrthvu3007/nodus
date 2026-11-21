# Shared log helpers. Every hook starts with: . "$(dirname "$0")/lib.sh"
hook=$(basename "$0")

# say <icon> <phase> <message>
say() { echo "$1 [$hook] $2 | $3"; }
skip() { say "⏭️ " skip "$1"; }
die() { say "❌" failed "$1"; exit 1; }
done_() { say "✅" done "all checks passed"; }
count() { echo "$1" | wc -l | tr -d ' '; }
