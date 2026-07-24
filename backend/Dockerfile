FROM node:20-alpine

# Устанавливаем openssl для Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install

# Копируем схему Prisma и генерируем клиент
COPY prisma ./prisma
RUN npx prisma generate

# Копируем исходники и собираем
COPY . .
RUN npm run build

# Запускаем скомпилированный код
CMD ["npm", "start"]
