FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

# Mail templates need to be copied
COPY --from=builder /app/src/mail/templates ./dist/mail/templates
# i18n files
COPY --from=builder /app/src/i18n ./dist/i18n

EXPOSE 3000

CMD ["node", "dist/main"]
