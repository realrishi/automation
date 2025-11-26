FROM mcr.microsoft.com/playwright:focal
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
CMD ["node", "index.js"]
