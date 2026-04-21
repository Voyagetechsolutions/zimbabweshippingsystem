# Use Node.js 20 LTS (required for dependencies)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Create session directory with proper permissions
RUN mkdir -p /app/data/whatsapp-session && \
    chown -R node:node /app/data

# Switch to non-root user
USER node

# Expose port (Railway will set PORT env var)
EXPOSE $PORT

# Start the application
CMD ["npm", "start"]