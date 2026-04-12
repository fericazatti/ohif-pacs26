# --- ETAPA 1: Construcción (Builder) ---
FROM node:20-slim as builder

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y python3 make g++ git curl unzip

WORKDIR /usr/src/app

# Instalar gestores
RUN npm install -g bun lerna
ENV PATH /usr/src/app/node_modules/.bin:$PATH

# Copiar configuración básica
COPY package.json yarn.lock preinstall.js lerna.json ./
COPY extensions/ ./extensions/
COPY modes/ ./modes/
COPY platform/ ./platform/

# Configurar timeout y memoria
RUN yarn config set network-timeout 300000
ENV NODE_OPTIONS="--max-old-space-size=8192"

# Instalar paquetes
RUN yarn install

# Copiar todo el código fuente
COPY . .

# Parches necesarios
RUN yarn add react-refresh postcss postcss-preset-env -W

# --- VARIABLES DE ENTORNO CRÍTICAS ---
ENV NODE_ENV=production
ENV QUICK_BUILD=false
# ESTO ES LO IMPORTANTE: Define la ruta base para los assets (JS/CSS)
ENV PUBLIC_URL=/viewer/

# Compilar
RUN yarn run build

# --- ETAPA 2: Servidor (Nginx) ---
FROM nginx:alpine

# Crear la estructura de carpetas FÍSICA
RUN mkdir -p /usr/share/nginx/html/viewer

# Copiar el build DENTRO de la carpeta viewer
COPY --from=builder /usr/src/app/platform/app/dist /usr/share/nginx/html/viewer

# Copiar la configuración de Nginx
# NOTA: Asumimos que nginx.conf está al lado de este Dockerfile
COPY nginx.conf /etc/nginx/nginx.conf

# Script de inicio (SSL)
RUN apk add --no-cache openssl bash && \
    mkdir -p /etc/nginx/certs && \
    printf "#!/bin/bash\n\
if [ ! -f /etc/nginx/certs/nginx-selfsigned.key ]; then\n\
    echo 'Generando certificado SSL...'\n\
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/nginx-selfsigned.key \
    -out /etc/nginx/certs/nginx-selfsigned.crt \
    -subj '/C=AR/ST=RioNegro/L=Bariloche/O=CNEA/CN=localhost'\n\
fi\n\
exec nginx -g 'daemon off;'" > /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Asegurar permisos de lectura
RUN chmod -R 755 /usr/share/nginx/html/viewer

EXPOSE 443
ENTRYPOINT ["/entrypoint.sh"]