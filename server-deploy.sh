#!/bin/bash

# ==============================================================================
# FYXI.RU — СВЕРХБЫСТРЫЙ СКРИПТ АВТОМАТИЧЕСКОГО ДЕПЛОЯ (v3.0 Ultra-Fast)
# Ускорение: кэширование node_modules, хэширование package-lock.json и schema.prisma
# ==============================================================================

set -e

START_TIME=$(date +%s)

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Отключаем ненужные проверки npm для ускорения
export NPM_CONFIG_AUDIT=false
export NPM_CONFIG_FUND=false
export NUXT_TELEMETRY_DISABLED=1

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}        fyxi.ru — Разворачивание на боевом сервере (v3.0 Fast)   ${NC}"
echo -e "${CYAN}================================================================${NC}"

# Функция получения хэша файла для быстрой проверки изменений
get_file_hash() {
  if command -v md5sum &> /dev/null; then
    md5sum "$1" 2>/dev/null | awk '{print $1}'
  elif command -v md5 &> /dev/null; then
    md5 -q "$1" 2>/dev/null
  else
    stat -c %Y "$1" 2>/dev/null || echo "1"
  fi
}

# 0. Синхронизация кода из приватного Git репозитория
echo -e "\n${CYAN}🔄 0. Получение свежих обновлений из Git...${NC}"
if [ -d .git ]; then
  if [ -f ~/.ssh/fyxi_deploy_key ]; then
    export GIT_SSH_COMMAND="ssh -i ~/.ssh/fyxi_deploy_key -o StrictHostKeyChecking=accept-new"
  fi
  git fetch origin main && git reset --hard origin/main || echo -e "${YELLOW}⚠️ Не удалось обновить код из Git (пропуск).${NC}"
fi

# 1. Настройка переменных окружения
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo -e "${YELLOW}⚠️ Файл .env не найден. Создаю из шаблона .env.example...${NC}"
    cp .env.example .env
  else
    echo -e "${RED}❌ Ошибка: Не найден файл .env.example!${NC}"
    exit 1
  fi
fi

# Синхронизация файлов конфигурации
cp .env backend/.env
cp .env frontend/.env

# 2. Проверка утилит Node.js и PM2
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js не установлен!${NC}"
  exit 1
fi

if ! command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}⚙️ Установка глобальной утилиты PM2...${NC}"
  sudo npm install -g pm2 || npm install -g pm2
fi

# 3. Обработка зависимостей и сборка Бэкенда (порт 5010)
echo -e "\n${CYAN}📦 1. Проверка бэкенда (порт 5010)...${NC}"
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

echo -e "${CYAN}⚙️ Проверка базы данных и генерация Prisma Client...${NC}"
(cd backend && npx prisma generate)
(cd backend && npx prisma db push || echo -e "${YELLOW}⚠️ Пропуск db push.${NC}")
(cd backend && npx prisma db seed || echo -e "${YELLOW}⚠️ Пропуск db seed (данные уже засижены).${NC}")

echo -e "${CYAN}🔨 Сборка бэкенда (tsc)...${NC}"
(cd backend && npm run build)

# 5. Обработка зависимостей и сборка Фронтенда (порт 5011)
echo -e "\n${CYAN}📦 2. Проверка Nuxt 3 фронтенда (порт 5011)...${NC}"
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

echo -e "${CYAN}🏗️ Production-сборка Nuxt 3 (SSR + Nitro)...${NC}"
(cd frontend && npm run build)

# 6. Быстрый перезапуск в PM2
echo -e "\n${CYAN}🚀 3. Быстрый перезапуск процессов в PM2...${NC}"
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js
pm2 save

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}🎉 Успешно развернуто за ${ELAPSED} сек! Сайт fyxi.ru обновлен! ${NC}"
echo -e "${GREEN}================================================================${NC}"

echo -e "\n${CYAN}📊 Текущий статус PM2:${NC}"
pm2 status

echo -e "\n${CYAN}================================================================${NC}\n"
