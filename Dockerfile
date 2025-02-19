FROM node:22.13-alpine

WORKDIR /app

COPY package*.json ./
COPY app.js ./
RUN npm ci

CMD ["node", "app.js"]