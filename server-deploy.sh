#!/bin/bash

# ==============================================================================
# FYXI.RU — УНИВЕРСАЛЬНЫЙ СКРИПТ АВТОМАТИЧЕСКОГО РАЗВОРАЧИВАНИЯ НА СЕРВЕРЕ
# Порты: 5010 (Бэкенд Fastify API), 5011 (Фронтенд Nuxt 3 SSR)
# ==============================================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}        fyxi.ru — Разворачивание на боевом сервере (v2.0)        ${NC}"
echo -e "${CYAN}================================================================${NC}"

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

# 2. Проверка Node.js и PM2
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js не установлен! Установите Node.js LTS (v20+):${NC}"
  echo -e "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
  echo -e "sudo apt-get install -y nodejs"
  exit 1
fi

if ! command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}⚙️ Установка глобальной утилиты PM2...${NC}"
  sudo npm install -g pm2 || npm install -g pm2
fi

# 3. Сборка Бэкенда (порт 5010)
echo -e "\n${CYAN}📦 1. Установка зависимостей и сборка бэкенда (порт 5010)...${NC}"
npm install --prefix backend
(cd backend && npx prisma generate)

# Применение миграций БД (если PostgreSQL запущен)
(cd backend && npx prisma db push || echo -e "${YELLOW}⚠️ PostgreSQL недоступен или будет подключен позже. Пропуск db push.${NC}")

(cd backend && npm run build)

# 4. Сборка Фронтенда (порт 5011)
echo -e "\n${CYAN}📦 2. Установка зависимостей и сборка Nuxt 3 фронтенда (порт 5011)...${NC}"
NUXT_TELEMETRY_DISABLED=1 npm install --prefix frontend
(cd frontend && NUXT_TELEMETRY_DISABLED=1 npm run build)

# 5. Запуск процессов в PM2
echo -e "\n${CYAN}🚀 3. Запуск процессов fyxi в PM2...${NC}"
pm2 startOrReload ecosystem.config.js
pm2 save

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}🎉 Платформа fyxi.ru успешно развернута и запущена в PM2!${NC}"
echo -e "${GREEN}================================================================${NC}"

echo -e "\n${CYAN}📊 Текущие запуски PM2:${NC}"
pm2 status

echo -e "\n${YELLOW}🌐 Настройка в Nginx Proxy Manager (NPM):${NC}"
echo -e "  • ${CYAN}Домен:${NC}                  fyxi.ru, www.fyxi.ru"
echo -e "  • ${CYAN}Фронтенд (Nuxt 3):${NC}       http://127.0.0.1:5011"
echo -e "  • ${CYAN}Custom Location /api:${NC}   http://127.0.0.1:5010"
echo -e "  • ${CYAN}SSL Certificate:${NC}        Request a new SSL (Let's Encrypt)"

echo -e "\n${CYAN}================================================================${NC}\n"
