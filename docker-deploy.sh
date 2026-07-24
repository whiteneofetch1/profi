#!/bin/bash
set -e

GREEN='\03rd[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}       Запуск деплоя fyxi.ru через DOCKER             ${NC}"
echo -e "${CYAN}======================================================${NC}"

# 1. Загрузка обновлений
echo -e "\n${CYAN}📥 1. Получение последних изменений из git...${NC}"
git pull origin main

# 2. Остановка PM2
echo -e "\n${CYAN}🛑 2. Остановка старых процессов PM2 (если есть)...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    pm2 kill 2>/dev/null || true
fi

# 3. Принудительное освобождение портов
echo -e "\n${CYAN}🧹 3. Очистка портов 5010 и 5011...${NC}"
if command -v npx &> /dev/null; then
    sudo npx --yes kill-port 5010 5011 2>/dev/null || true
fi
sudo kill -9 $(sudo lsof -t -i:5010) 2>/dev/null || true
sudo kill -9 $(sudo lsof -t -i:5011) 2>/dev/null || true

# 4. Запуск Docker Compose
echo -e "\n${CYAN}🐳 4. Сборка и запуск Docker контейнеров...${NC}"
docker compose up -d --build

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}✅ Успешно! Приложение запущено в Docker.${NC}"
echo -e "${CYAN}Логи бэкенда: docker compose logs -f backend${NC}"
echo -e "${CYAN}Логи фронтенда: docker compose logs -f frontend${NC}"
echo -e "${GREEN}======================================================${NC}"
