# Etapa de desarrollo
FROM node:20-alpine AS development

WORKDIR /usr/src/app

# Copiar configuración de dependencias
COPY package*.json yarn.lock ./

# Instalar todas las dependencias (incluyendo dev)
RUN yarn install --frozen-lockfile

# Copiar el resto del código
COPY . .

# Exponer el puerto de NestJS
EXPOSE 3000

# Comando para correr en modo desarrollo
CMD ["npm", "run", "start:dev"]

# Etapa de construcción (Build)
FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json yarn.lock ./

# Usamos ci o frozen-lockfile para instalaciones limpias
RUN yarn install --frozen-lockfile

COPY . .

# Ejecutamos el build de NestJS
RUN npm run build

# Etapa de Producción
FROM node:20-alpine AS production

WORKDIR /usr/src/app

# Instalar Chromium y dependencias para Puppeteer (WhatsApp Web JS)
# Instalar también tzdata si necesitas configurar zona horaria
RUN apk update && apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Le decimos a Puppeteer que use el Chromium instalado por Alpine
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json yarn.lock ./

# Instalamos SOLAMENTE las dependencias de producción
RUN yarn install --frozen-lockfile --production

# Copiamos la compilación desde la etapa build
COPY --from=build /usr/src/app/dist ./dist

# Variables de entorno por defecto (se sobreescriben en docker-compose)
ENV NODE_ENV=production

EXPOSE 3000

# Comando de arranque para producción con migraciones y semillas
CMD ["npm", "run", "start:prod:docker"]
