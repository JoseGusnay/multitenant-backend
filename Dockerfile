# Etapa de desarrollo
FROM node:20-alpine AS development

WORKDIR /usr/src/app

# Copiar configuración de dependencias
COPY package*.json ./
COPY yarn.lock ./

# Instalar todas las dependencias (incluyendo dev)
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto de NestJS
EXPOSE 3000

# Comando para correr en modo desarrollo (watch)
CMD ["npm", "run", "start:dev"]
