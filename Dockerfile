# API image only — Netlify builds the CRA frontend.
# No apt-get: Railway Metal builders (us-west1) often fail Debian InRelease GPG verify.
# OG text uses embedded SVG fonts; fontconfig bootstrap uses dejavu-fonts-ttf from npm.
FROM node:18-bookworm-slim

WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
COPY server/.npmrc ./server/
RUN cd server && npm ci --legacy-peer-deps

COPY server ./server
COPY public ./public

WORKDIR /app/server
ENV NODE_ENV=production
CMD ["node", "index.js"]
