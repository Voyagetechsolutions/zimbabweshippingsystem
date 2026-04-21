# Use Node.js 20 LTS (required for dependencies)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create session directory
RUN mkdir -p whatsapp-session

# Expose port (Railway will set PORT env var)
EXPOSE $PORT

# Start the application
CMD ["npm", "start"]