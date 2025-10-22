# Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Set Node.js memory limit to 8GB to handle large files and AI processing
ENV NODE_OPTIONS="--max-old-space-size=8192"

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for nodemon)
RUN npm install

# Copy application files
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Start the application (default command, can be overridden by docker-compose)
CMD ["npm", "start"]

