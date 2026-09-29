require('dotenv').config();
const createApp = require('./app');

const port = process.env.PORT || 3000;
const app = createApp();

app.listen(port, () => {
  console.log(`EVE diagnostics backend listening on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/docs`);
});
