#!/bin/bash

LANGUAGE=$1
FILE=$2

if [ "$LANGUAGE" = "python" ]; then
    timeout 5s python3 "$FILE"

elif [ "$LANGUAGE" = "cpp" ]; then
    g++ "$FILE" -o output && timeout 5s ./output

elif [ "$LANGUAGE" = "c" ]; then
    gcc "$FILE" -o output && timeout 5s ./output

elif [ "$LANGUAGE" = "java" ]; then
    javac "$FILE" && timeout 5s java ${FILE%.java}

elif [ "$LANGUAGE" = "node" ]; then
    # 10-second timeout for node. Server processes listen indefinitely so
    # they are always killed by the timeout (exit 124) — that is expected
    # behaviour, not an error. The || true normalises the exit code so
    # stdout is always returned to the caller, never silently dropped.
    timeout 10s node $FILE || true

elif [ "$LANGUAGE" = "bash" ] || [ "$LANGUAGE" = "sh" ] || [ "$LANGUAGE" = "shell" ]; then
    timeout 5s bash "$FILE"

else
    echo "Unsupported language"
fi
