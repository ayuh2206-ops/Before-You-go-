FROM node:18-alpine

# Set working directory inside container to backend so server.js can reference ../public
WORKDIR /app/backend

# Install only production dependencies
COPY backend/package*.json ./
RUN npm install --production || npm install

# Copy backend sources
COPY backend/ ./

# Copy frontend public folder to /app/public so server.js (which uses ../public) finds it
COPY public/ ../public/

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
# Dockerfile for backend
# Builds and runs the Node.js Express backend which serves ../public
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies (only from backend folder context in CI)
COPY package*.json ./
RUN npm ci --production || npm install --production

# Copy backend sources
COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
