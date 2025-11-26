# Use official Node.js 20 image
FROM node:20

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json first for caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Install Playwright browsers
RUN npx playwright install chromium

# Copy the rest of the app
COPY . .

# Expose the port Render will use
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]
