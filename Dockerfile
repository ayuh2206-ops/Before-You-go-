FROM node:20-alpine

WORKDIR /app

# Install backend dependencies (use package files inside backend/)
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copy application code and public assets
COPY backend/ ./backend/
COPY public/ ./public/

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "backend/server.js"]
