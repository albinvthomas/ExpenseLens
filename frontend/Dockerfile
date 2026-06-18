# Use official Node runtime as a parent image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port 5173
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--", "--host"]
