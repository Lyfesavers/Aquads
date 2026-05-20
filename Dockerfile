# API image only — Netlify builds the CRA frontend. Avoids Railpack root npm ci + server install.
FROM node:18-bookworm-slim

# Railway builders sometimes hit transient Debian GPG/signature errors on apt-get update.
RUN set -eux; \
    success=0; \
    for attempt in 1 2 3 4 5; do \
      rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/partial/*; \
      if apt-get -o Acquire::Retries=5 update \
        && apt-get install -y --no-install-recommends \
          ca-certificates fontconfig fonts-dejavu-core libatomic1; then \
        success=1; \
        break; \
      fi; \
      echo "apt attempt ${attempt} failed, retrying in 10s..." >&2; \
      sleep 10; \
    done; \
    test "${success}" -eq 1; \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
COPY server/.npmrc ./server/
RUN cd server && npm ci --legacy-peer-deps

COPY server ./server
COPY public ./public

WORKDIR /app/server
ENV NODE_ENV=production
CMD ["node", "index.js"]
