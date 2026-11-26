#!/usr/bin/env bash
set -euo pipefail

hour=$(date +%H)
min=$(date +%M)
total=$((10#$hour * 60 + 10#$min))

if [ "$total" -ge 720 ]; then
    echo "当前时间在 12:00 及以后。"

    ymd=$(date +%Y%m%d)

    cp "food/.last.yaml" "food/d.${ymd}.yaml"
    cp "health/.last.yaml" "health/d.${ymd}.yaml"
    micro "health/d.${ymd}.yaml"
else
    echo "当前时间在 12:00 之前。"
fi
