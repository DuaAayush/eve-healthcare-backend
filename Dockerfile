FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# Includes devDependencies (sequelize-cli) since the container itself runs
# migrations on startup below; fine for this assignment's scope.
RUN npm install

COPY . .

EXPOSE 3000

# Runs pending migrations, seeds demo data (idempotent - safe to rerun), then starts the API.
CMD ["sh", "-c", "npx sequelize-cli db:migrate && npm run seed && node src/server.js"]
