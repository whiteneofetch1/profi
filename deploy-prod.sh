#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Visual colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}   fyxi.ru — Скрипт Прод-Деплоя и Проверки (100%)    ${NC}"
echo -e "${CYAN}====================================================${NC}"

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
  echo -e "👉 Установите PM2: ${GREEN}npm install -g pm2${NC}"
  exit 1
fi

# 2. Check for .env file
if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠️ Файл .env не найден. Копирую из .env.example...${NC}"
  cp .env.example .env
fi

# Sync .env files
cp .env backend/.env
cp .env frontend/.env

# 3. Process backend dependencies, prisma and build
echo -e "\n${CYAN}📦 1. Установка зависимостей бэкенда...${NC}"
npm install --prefix backend

echo -e "\n${CYAN}⚙️ Генерация Prisma Client и применение миграций...${NC}"
(cd backend && npx prisma generate)
(cd backend && npx prisma db push || echo -e "${YELLOW}⚠️ База данных PostgreSQL недоступна локально, пропуск db push.${NC}")
(cd backend && npx prisma db seed || echo -e "${YELLOW}⚠️ Пропуск сидинга БД (нет активного подключения).${NC}")

echo -e "\n${CYAN}🔨 Сборка бэкенда (TypeScript tsc)...${NC}"
(cd backend && npm run build)

echo -e "\n${CYAN}🧪 Запуск бэкенд E2E тестов...${NC}"
(cd backend && npm test)

# 4. Process frontend dependencies and production build
echo -e "\n${CYAN}📦 2. Установка зависимостей Nuxt 3 фронтенда...${NC}"
NUXT_TELEMETRY_DISABLED=1 npm install --prefix frontend

echo -e "\n${CYAN}🧪 Запуск фронтенд Vitest тестов...${NC}"
(cd frontend && npm test)

echo -e "\n${CYAN}🏗️ Production-сборка Nuxt 3 (SSR + Nitro)...${NC}"
(cd frontend && NUXT_TELEMETRY_DISABLED=1 npm run build)

# 5. Start apps in PM2
echo -e "\n${CYAN}🚀 3. Запуск процессов в PM2...${NC}"
mkdir -p .pm2
export PM2_HOME="$(pwd)/.pm2"
pm2 startOrReload ecosystem.config.js

# 6. Success summary
echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}🎉 Платформа fyxi.ru успешно прошла проверки и запущена в PM2! ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "\n${YELLOW}🔗 Публичные адреса платформы:${NC}"
echo -e "  • ${CYAN}Главный каталог:${NC}     https://fyxi.ru"
echo -e "  • ${CYAN}Личный кабинет:${NC}     https://fyxi.ru/cabinet"
echo -e "  • ${CYAN}Раздел статей/SEO:${NC}   https://fyxi.ru/blog"
echo -e "  • ${CYAN}RSS-лента новостей:${NC}  https://fyxi.ru/feed.xml"
echo -e "  • ${CYAN}Карта сайта Sitemap:${NC} https://fyxi.ru/sitemap.xml"
echo -e "  • ${CYAN}Яндекс Метрика ID:${NC}   110952885"
echo -e "  • ${CYAN}Telegram Bot:${NC}        https://t.me/fyxiWeb_bot"

echo -e "\n${CYAN}====================================================${NC}\n"
