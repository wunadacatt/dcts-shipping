#!/bin/sh

if ! grep -q "^keys:" "${LIVEKIT_YAML_PATH}" 2>/dev/null; then
    echo "Generating LiveKit keys..."

    OUTPUT=$(/livekit-server generate-keys)

    API_KEY=$(echo "$OUTPUT" | awk '/API Key:/ {print $3}')
    API_SECRET=$(echo "$OUTPUT" | awk '/API Secret:/ {print $3}')

    if [ -z "$API_KEY" ] || [ -z "$API_SECRET" ]; then
        echo "Key generation failed!"
        exit 1
    fi

    touch "${LIVEKIT_YAML_PATH}"

    yq -i '
      .keys = {} |
      .keys["'"$API_KEY"'"] = "'"$API_SECRET"'"
    ' "${LIVEKIT_YAML_PATH}"

    echo "Keys written."
else
    echo "Keys already exist."
fi

exec /livekit-server --config "${LIVEKIT_YAML_PATH}"
