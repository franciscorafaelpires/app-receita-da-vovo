const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { createApp } = require('./app');

dotenv.config();

const app = createApp();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI;

async function start() {
  if (!mongoUri) {
    throw new Error('MONGODB_URI nao definido. Crie um arquivo .env em backend/.');
  }

  await mongoose.connect(mongoUri);

  app.listen(port, () => {
    console.log(`API rodando em http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Erro ao iniciar API:', error.message);
  process.exit(1);
});
