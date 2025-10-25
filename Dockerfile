# Use Node.js as the base image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files into container
COPY . .

# Expose Vite default port
EXPOSE 3000

# Run the dev server (hot reload enabled)
CMD ["npm", "run", "dev", "--", "--host"]
