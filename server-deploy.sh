#!/bin/bash

# ==============================================================================
# FYXI.RU — СВЕРХБЫСТРЫЙ И НАДЕЖНЫЙ СКРИПТ АВТОМАТИЧЕСКОГО ДЕПЛОЯ (v4.0 Robust)
# Включает: авто-проверку БД PostgreSQL, сброс SWR-кэша, диагностику PM2
# ==============================================================================

set -e

START_TIME=$(date +%s)

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

export NPM_CONFIG_AUDIT=false
export NPM_CONFIG_FUND=false
export NUXT_TELEMETRY_DISABLED=1

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}        fyxi.ru — Разворачивание на боевом сервере (v4.0 Ultra)  ${NC}"
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

# 3. Авто-поднятие PostgreSQL (если служба остановлена)
echo -e "\n${CYAN}🗄️ Проверка службы базы данных PostgreSQL...${NC}"
if command -v systemctl &> /dev/null; then
  if ! systemctl is-active --quiet postgresql 2>/dev/null; then
    echo -e "${YELLOW}⚙️ Попытка запуска службы PostgreSQL (systemctl)...${NC}"
    sudo systemctl start postgresql 2>/dev/null || systemctl start postgresql 2>/dev/null || true
  fi
fi
if command -v docker &> /dev/null && [ -f docker-compose.yml ]; then
  echo -e "${CYAN}🐳 Проверка Docker-контейнера базы данных...${NC}"
  docker compose up -d postgres 2>/dev/null || true
fi

# 4. Обработка зависимостей и сборка Бэкенда (порт 5010)
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

echo -e "${CYAN}⚙️ Генерация Prisma Client и синхронизация структуры БД...${NC}"
(cd backend && npx prisma generate)
if ! (cd backend && npx prisma db push); then
  echo -e "${RED}⚠️ ВНИМАНИЕ: Не удалось выполнить db push в PostgreSQL! Проверьте DATABASE_URL в файле .env${NC}"
fi

echo -e "${CYAN}🔨 Сборка бэкенда (tsc)...${NC}"
(cd backend && npm run build)

# 5. Обработка зависимостей и чистая сборка Фронтенда (порт 5011)
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

echo -e "${CYAN}🧹 Очистка устаревшего кэша Nitro SWR перед сборкой...${NC}"
rm -rf frontend/.output frontend/.nuxt frontend/.data frontend/node_modules/.cache 2>/dev/null || true

echo -e "${CYAN}🏗️ Production-сборка Nuxt 3 (SSR + Nitro)...${NC}"
(cd frontend && npm run build)

# 6. Перезапуск и проверка здоровья PM2
echo -e "\n${CYAN}🚀 3. Перезапуск процессов в PM2...${NC}"
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js
pm2 save

echo -e "${CYAN}🩺 Диагностика запуска процессов PM2...${NC}"
sleep 2

# Авто-детект падения бэкенда или фронтенда
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
echo -e "${GREEN}🎉 Успешно развернуто за ${ELAPSED} сек! Сайт fyxi.ru обновлен! ${NC}"
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
echo -e "${CYAN}================================================================${NC}"

echo -e "\n${CYAN}📊 Текущий статус PM2:${NC}"
pm2 status

echo -e "\n${CYAN}================================================================${NC}\n"
