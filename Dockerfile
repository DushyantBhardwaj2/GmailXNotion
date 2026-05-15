# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --quiet

COPY . .

# Compile TypeScript
RUN npm run build || true 

EXPOSE 3000

CMD ["npm", "start"]
