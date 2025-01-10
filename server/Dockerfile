FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps --force

COPY . .

EXPOSE 5000
CMD ["node", "index.js"] 