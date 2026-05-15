# Frontend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --quiet

COPY . .

# Build Next.js app
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/next.config.js ./ || true
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3001

CMD ["npm", "start"]
