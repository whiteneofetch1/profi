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
echo -e "${CYAN}   fyxi.ru — Запуск через PM2 (без Docker)           ${NC}"
echo -e "${CYAN}====================================================${NC}"

# 1. Check for PM2 command
if ! command -v pm2 &> /dev/null; then
  echo -e "${RED}❌ Утилита PM2 не найдена.${NC}"
  echo -e "${YELLOW}Пожалуйста, установите PM2 глобально с помощью npm:${NC}"
  echo -e "👉 ${GREEN}npm install -g pm2${NC}"
  exit 1
fi

# 2. Check for .env file
if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠️  Файл .env не найден. Создаю его из .env.example...${NC}"
  cp .env.example .env
  echo -e "${GREEN}✅ Файл .env успешно создан.${NC}"
  echo -e "${YELLOW}ВАЖНО: Пожалуйста, проверьте и настройте подключение к вашей PostgreSQL БД в .env файле!${NC}"
else
  echo -e "${GREEN}✅ Файл .env существует.${NC}"
fi

# Copy .env to subfolders so sub-services can resolve variables locally
echo -e "${CYAN}🔗 Синхронизация файлов .env для подсервисов...${NC}"
cp .env backend/.env
cp .env frontend/.env

# 3. Process backend dependencies & prisma
echo -e "\n${CYAN}📦 1. Установка зависимостей и сборка бэкенда...${NC}"
npm install --prefix backend

echo -e "\n${CYAN}⚙️  Генерация Prisma Client...${NC}"
(cd backend && npx prisma generate)

echo -e "\n${CYAN}🗄️  Применение миграций базы данных...${NC}"
# Use db push to apply schema quickly to the configured PostgreSQL db
(cd backend && npx prisma db push)

echo -e "\n${CYAN}🌱 Наполнение базы данных анкетными карточками (Seed)...${NC}"
(cd backend && npx prisma db seed)

# 4. Process frontend dependencies
echo -e "\n${CYAN}📦 2. Установка зависимостей Nuxt 3 фронтенда...${NC}"
npm install --prefix frontend

# 5. Start apps in PM2 (Development Mode with HMR)
echo -e "\n${CYAN}🚀 3. Запуск сервисов в PM2...${NC}"
pm2 startOrReload ecosystem.config.js

# 6. Success summary and useful endpoints
echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}🎉 Платформа fyxi.ru запущена через PM2 в режиме Разработки (HMR)!${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "\n${YELLOW}🔗 Полезные адреса для проверки локально:${NC}"
echo -e "  • ${CYAN}Главный каталог:${NC}     http://localhost:3000"
echo -e "  • ${CYAN}Личный кабинет:${NC}     http://localhost:3000/cabinet"
echo -e "  • ${CYAN}Раздел статей/SEO:${NC}   http://localhost:3000/blog"
echo -e "  • ${CYAN}Админ-панель:${NC}       http://localhost:3000/admin"

echo -e "\n${YELLOW}🔑 Тестовые аккаунты для входа:${NC}"
echo -e "  • ${CYAN}Администратор:${NC}      email: ${GREEN}admin@fyxi.ru${NC}   / пароль: ${GREEN}admin_pass_2026${NC}"
echo -e "  • ${CYAN}Разработчик:${NC}        email: ${GREEN}developer@fyxi.ru${NC} / пароль: ${GREEN}securepassword2026${NC}"
echo -e "  • ${CYAN}UX/UI Дизайнер:${NC}     email: ${GREEN}designer@fyxi.ru${NC}  / пароль: ${GREEN}securepassword2026${NC}"

echo -e "\n${YELLOW}🛠️ Полезные консольные команды PM2:${NC}"
echo -e "  • Посмотреть статус процессов:   ${CYAN}pm2 status${NC}"
echo -e "  • Посмотреть живые логи:        ${CYAN}pm2 logs${NC}"
echo -e "  • Перезапустить платформу:      ${CYAN}pm2 restart ecosystem.config.js${NC}"
echo -e "  • Остановить все сервисы:       ${CYAN}pm2 stop ecosystem.config.js${NC}"
echo -e "${CYAN}====================================================${NC}\n"
