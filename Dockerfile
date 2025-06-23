# See https://docs.docker.com/engine/reference/builder/
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 10000

CMD "npm run start"
