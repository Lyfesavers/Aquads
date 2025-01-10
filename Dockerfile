FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps --force

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"] 