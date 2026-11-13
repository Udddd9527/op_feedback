FROM node:20-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY index.html app.js styles.css ./
COPY assets ./assets
COPY server ./server

ENV NODE_ENV=production PORT=4173
EXPOSE 4173
USER node
CMD ["node", "server/server.js"]
