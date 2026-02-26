#!/bin/bash
# Wrapper script to ensure correct Node.js version is used
export PATH="/Users/kitamuratatsuhiko/.nvm/versions/node/v22.22.0/bin:$PATH"
exec /Users/kitamuratatsuhiko/.nvm/versions/node/v22.22.0/bin/node /Users/kitamuratatsuhiko/yarikiru/src/mcp-server/index.mjs "$@"
