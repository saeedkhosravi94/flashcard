# Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Set Node.js memory limit (optional, for large AI ops)
ENV NODE_OPTIONS="--max-old-space-size=8192"

# Install required build & system dependencies (including Poppler)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev \
    poppler-utils

# Copy package files
COPY package*.json ./

RUN npm install

# Copy the rest of the app
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose the backend port
EXPOSE 5000


# Start the application (default command, can be overridden by docker-compose)
CMD ["npm", "start"]

