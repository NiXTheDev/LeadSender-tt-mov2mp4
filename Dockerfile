FROM node:22.13-alpine

WORKDIR /app

COPY package*.json ./
COPY app.js ./
RUN npm ci && apk add ffmpeg

EXPOSE 8080

CMD ["node", "app.js"]