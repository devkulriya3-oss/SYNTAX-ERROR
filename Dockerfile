FROM node:22-slim
WORKDIR /app
COPY . .
ENV PORT=3001 DB_PATH=/data/gatepass.db
VOLUME /data
EXPOSE 3001
CMD ["node", "server/index.js"]
