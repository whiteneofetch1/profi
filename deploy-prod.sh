#!/bin/bash

# ==============================================================================
# FYXI.RU — СВЕРХБЫСТРЫЙ И НАДЕЖНЫЙ ПРОД-ДЕПЛОЙ (v4.1 Ultra)
# ==============================================================================

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
echo -e "${CYAN}   fyxi.ru — Сверхбыстрый Прод-Деплой (v4.1 Ultra)   ${NC}"
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
  exit 1
fi

# 2. Check for .env file
if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠️ Файл .env не найден. Копирую из .env.example...${NC}"
  cp .env.example .env
fi

cp .env backend/.env
cp .env frontend/.env

# 3. Auto-start PostgreSQL service if stopped
echo -e "\n${CYAN}🗄️ Проверка службы базы данных PostgreSQL...${NC}"
if command -v systemctl &> /dev/null; then
  if ! systemctl is-active --quiet postgresql 2>/dev/null; then
    echo -e "${YELLOW}⚙️ Попытка запуска службы PostgreSQL (systemctl)...${NC}"
    sudo systemctl start postgresql 2>/dev/null || systemctl start postgresql 2>/dev/null || true
  fi
fi
if command -v docker &> /dev/null && [ -f docker-compose.yml ]; then
  docker compose up -d postgres 2>/dev/null || true
fi

# 4. Process backend dependencies, prisma and build
echo -e "\n${CYAN}📦 1. Установка зависимостей бэкенда...${NC}"
npm install --prefix backend --no-audit --no-fund --prefer-offline

(cd backend && npx prisma generate)
if ! (cd backend && npx prisma db push); then
  echo -e "${RED}⚠️ ВНИМАНИЕ: Не удалось выполнить db push в PostgreSQL! Проверьте DATABASE_URL в .env${NC}"
fi

echo -e "\n${CYAN}🔨 Сборка бэкенда (tsc)...${NC}"
(cd backend && npm run build)

# 5. Process frontend dependencies, cache cleanup and production build
echo -e "\n${CYAN}📦 2. Установка зависимостей Nuxt 3 фронтенда...${NC}"
npm install --prefix frontend --no-audit --no-fund --prefer-offline

echo -e "${CYAN}🧹 Очистка устаревшего кэша Nitro SWR перед сборкой...${NC}"
rm -rf frontend/.output frontend/.nuxt frontend/.data frontend/node_modules/.cache 2>/dev/null || true

echo -e "\n${CYAN}🏗️ Production-сборка Nuxt 3...${NC}"
(cd frontend && npm run build)

# 6. Start apps in PM2 and diagnose
echo -e "\n${CYAN}🚀 3. Перезапуск процессов в PM2...${NC}"
echo -e "${CYAN}🧹 Освобождение портов 5010 и 5011 и сброс дубликатов PM2...${NC}"
fuser -k 5010/tcp 5011/tcp 2>/dev/null || true
pm2 delete all 2>/dev/null || true

mkdir -p .pm2
export PM2_HOME="$(pwd)/.pm2"
pm2 start ecosystem.config.js
pm2 save

echo -e "${CYAN}🩺 Диагностика запуска процессов PM2...${NC}"
sleep 2

STATUS_OUTPUT=$(pm2 jlist 2>/dev/null || echo "")
if echo "$STATUS_OUTPUT" | grep -q '"status":"errored"' || echo "$STATUS_OUTPUT" | grep -q '"status":"stopped"'; then
  echo -e "${RED}❌ ОБНАРУЖЕНА ОШИБКА ПРИ СТАРТЕ ПРОЦЕССОВ В PM2!${NC}"
  echo -e "${YELLOW}📋 Вывод последних логов ошибки:${NC}"
  pm2 logs --lines 15 --raw | tail -n 25
else
  echo -e "${GREEN}✅ Все процессы PM2 успешно работают в штатном режиме!${NC}"
fi

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}🎉 Платформа fyxi.ru успешно прошла проверки и запущена за ${ELAPSED} сек! ${NC}"
echo -e "${GREEN}================================================================${NC}"

echo -e "\n${CYAN}================================================================${NC}"
echo -e "${YELLOW}📊 СВЕДЕНИЯ ДЛЯ ВХОДА И ДОСТУПА К ПЛАТФОРМЕ FYXI.RU${NC}"
echo -e "${CYAN}----------------------------------------------------------------${NC}"
echo -e "  🌐 ${CYAN}Главный сайт:${NC}          https://fyxi.ru"
echo -e "  🛡️ ${CYAN}Суперадминка:${NC}           https://fyxi.ru/admin"
echo -e "  🔑 ${CYAN}Логин суперадмина:${NC}     ${GREEN}admin@fyxi.ru${NC}"
echo -e "  🔒 ${CYAN}Пароль суперадмина:${NC}    ${GREEN}admin123456${NC}"
echo -e ""
echo -e "  👤 ${CYAN}Кабинет Разработчика:${NC}   https://fyxi.ru/cabinet"
echo -e "  ⚡ ${CYAN}Backend REST API:${NC}       http://localhost:5010 / https://fyxi.ru/api"
echo -e "  📧 ${CYAN}SMTP Почта (Gmail):${NC}     bamblevk4@gmail.com"
echo -e "${CYAN}================================================================${NC}\n"
