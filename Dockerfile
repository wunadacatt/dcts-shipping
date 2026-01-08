# ---------------------------
# Dockerfile for DCTS Shipping (Bun)
# ---------------------------

FROM oven/bun:1-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN bun install --production

COPY . .

EXPOSE 2052

CMD ["bun", "."]



