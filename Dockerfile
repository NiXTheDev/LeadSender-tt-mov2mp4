FROM node:22.13-alpine

WORKDIR /app

COPY package*.json ./
COPY app.js ./
RUN npm ci

EXPOSE 8080

CMD ["node", "app.js"]