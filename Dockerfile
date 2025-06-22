# See https://docs.docker.com/engine/reference/builder/
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g peer concurrently

EXPOSE 10000 443

CMD concurrently "npm run start" "peerjs --port 9000 --path /peerjs"
