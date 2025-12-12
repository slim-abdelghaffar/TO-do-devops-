# Étape 1 : Build de l'application frontend
FROM node:20-alpine AS builder

WORKDIR /app
# Copie seulement ce qu'il faut pour installer les dépendances
COPY frontend/package*.json ./
RUN npm ci

# Copie tout le code source et build
COPY frontend/ .
RUN npm run build
# → crée un dossier /app/dist avec tout le nécessaire

# Étape 2 : Image finale ultra légère
FROM nginx:alpine

# Supprime la config par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Colle ta config nginx personnalisée (SPA + routing)
COPY nginx.conf /etc/nginx/conf.d/

# Copie UNIQUEMENT le résultat du build (tout est dedans)
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]