#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

START_TIME=$(date +%s)

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

export NPM_CONFIG_AUDIT=false
export NPM_CONFIG_FUND=false
export NUXT_TELEMETRY_DISABLED=1

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}   fyxi.ru — Сверхбыстрый Прод-Деплой (v3.0 Fast)    ${NC}"
echo -e "${CYAN}====================================================${NC}"

get_file_hash() {
  if command -v md5sum &> /dev/null; then
    md5sum "$1" 2>/dev/null | awk '{print $1}'
  elif command -v md5 &> /dev/null; then
    md5 -q "$1" 2>/dev/null
  else
    stat -c %Y "$1" 2>/dev/null || echo "1"
  fi
}

# 0. Git code sync
echo -e "\n${CYAN}🔄 Получение свежих обновлений из Git...${NC}"
if [ -d .git ]; then
  if [ -f ~/.ssh/fyxi_deploy_key ]; then
    export GIT_SSH_COMMAND="ssh -i ~/.ssh/fyxi_deploy_key -o StrictHostKeyChecking=accept-new"
  fi
  git fetch origin main && git reset --hard origin/main || echo -e "${YELLOW}⚠️ Не удалось обновить код из Git (пропуск).${NC}"
fi

# 1. Check for PM2 command
if ! command -v pm2 &> /dev/null; then
  echo -e "${RED}❌ Утилита PM2 не найдена.${NC}"
  exit 1
fi

# 2. Check for .env file
if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠️ Файл .env не найден. Копирую из .env.example...${NC}"
  cp .env.example .env
fi

cp .env backend/.env
cp .env frontend/.env

# 3. Process backend dependencies, prisma and build
echo -e "\n${CYAN}📦 1. Проверка бэкенда...${NC}"
BACKEND_LOCK_HASH=$(get_file_hash "backend/package-lock.json")
BACKEND_HASH_FILE="backend/node_modules/.installed_hash"

if [ -d "backend/node_modules" ] && [ -f "$BACKEND_HASH_FILE" ] && [ "$(cat "$BACKEND_HASH_FILE")" == "$BACKEND_LOCK_HASH" ]; then
  echo -e "${GREEN}⚡ node_modules бэкенда актуальны (пропуск npm install).${NC}"
else
  echo -e "${YELLOW}📥 Установка зависимостей бэкенда...${NC}"
  npm install --prefix backend --no-audit --no-fund --prefer-offline
  mkdir -p backend/node_modules
  echo "$BACKEND_LOCK_HASH" > "$BACKEND_HASH_FILE"
fi

PRISMA_HASH=$(get_file_hash "backend/prisma/schema.prisma")
PRISMA_HASH_FILE="backend/node_modules/.prisma_schema_hash"

if [ -d "backend/node_modules/@prisma/client" ] && [ -f "$PRISMA_HASH_FILE" ] && [ "$(cat "$PRISMA_HASH_FILE")" == "$PRISMA_HASH" ]; then
  echo -e "${GREEN}⚡ Prisma Client актуален.${NC}"
else
  (cd backend && npx prisma generate)
  (cd backend && npx prisma db push || echo -e "${YELLOW}⚠️ Пропуск db push.${NC}")
  echo "$PRISMA_HASH" > "$PRISMA_HASH_FILE"
fi

echo -e "\n${CYAN}🔨 Сборка бэкенда (tsc)...${NC}"
(cd backend && npm run build)

# 4. Process frontend dependencies and production build
echo -e "\n${CYAN}📦 2. Проверка Nuxt 3 фронтенда...${NC}"
FRONTEND_LOCK_HASH=$(get_file_hash "frontend/package-lock.json")
FRONTEND_HASH_FILE="frontend/node_modules/.installed_hash"

if [ -d "frontend/node_modules" ] && [ -f "$FRONTEND_HASH_FILE" ] && [ "$(cat "$FRONTEND_HASH_FILE")" == "$FRONTEND_LOCK_HASH" ]; then
  echo -e "${GREEN}⚡ node_modules фронтенда актуальны (пропуск npm install).${NC}"
else
  echo -e "${YELLOW}📥 Установка зависимостей фронтенда...${NC}"
  npm install --prefix frontend --no-audit --no-fund --prefer-offline
  mkdir -p frontend/node_modules
  echo "$FRONTEND_LOCK_HASH" > "$FRONTEND_HASH_FILE"
fi

echo -e "\n${CYAN}🏗️ Production-сборка Nuxt 3...${NC}"
(cd frontend && npm run build)

# 5. Start apps in PM2
echo -e "\n${CYAN}🚀 3. Перезапуск процессов в PM2...${NC}"
mkdir -p .pm2
export PM2_HOME="$(pwd)/.pm2"
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}🎉 Платформа fyxi.ru успешно прошла проверки и запущена за ${ELAPSED} сек! ${NC}"
echo -e "${GREEN}================================================================${NC}\n"
