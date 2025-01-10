FROM node:18

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy app source
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000
CMD ["node", "index.js"] 