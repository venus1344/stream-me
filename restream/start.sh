#!/bin/sh
set -eu

INPUT_APP="${RELAY_INPUT_APP:-stream}"
INPUT_KEY="${RELAY_INPUT_STREAM_KEY:-input}"
OME_APP="${OME_RELAY_APP:-app}"
OME_KEY="${OME_RELAY_STREAM_KEY:-key}"
INPUT_HOST="${RELAY_INPUT_HOST:-127.0.0.1:1936}"
OME_HOST="${OME_RTMP_HOST:-127.0.0.1:1935}"

INPUT_URL="rtmp://${INPUT_HOST}/${INPUT_APP}/${INPUT_KEY}"
OME_OUTPUT_URL="rtmp://${OME_HOST}/${OME_APP}/${OME_KEY}"

OUTPUTS="[f=flv:onfail=ignore]${OME_OUTPUT_URL}"

if [ -n "${YOUTUBE_STREAM_KEY:-}" ]; then
  OUTPUTS="${OUTPUTS}|[f=flv:onfail=ignore]${YOUTUBE_RTMPS_URL%/}/${YOUTUBE_STREAM_KEY}"
fi

echo "Starting ffmpeg relay"
echo "Input: ${INPUT_URL}"
echo "Outputs: ${OUTPUTS}"

exec ffmpeg \
  -hide_banner \
  -loglevel info \
  -fflags +genpts \
  -i "${INPUT_URL}" \
  -map 0:v:0 \
  -map 0:a:0? \
  -c copy \
  -f tee "${OUTPUTS}"
