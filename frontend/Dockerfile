# --- BUILD STAGE ---
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- RUNTIME STAGE ---
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.output ./output

ENV PORT=3000
EXPOSE 3000
CMD ["node", "output/server/index.mjs"]
