# API image only — Netlify builds the CRA frontend. Avoids Railpack root npm ci + server install.
FROM node:18-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig fonts-dejavu-core libatomic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
COPY server/.npmrc ./server/
RUN cd server && npm ci --legacy-peer-deps

COPY server ./server
COPY public ./public

WORKDIR /app/server
ENV NODE_ENV=production
CMD ["node", "index.js"]
