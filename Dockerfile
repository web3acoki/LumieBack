FROM node:22-alpine AS builder

WORKDIR /app
ENV HUSKY=0
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app
ENV NODE_ENV=production
ENV HUSKY=0
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/mail/mail-templates ./dist/mail/mail-templates
COPY --from=builder /app/src/i18n ./dist/i18n

EXPOSE 3000

CMD ["node", "dist/main"]
