const cors = require('cors');
const express = require('express');
const swaggerUi = require('swagger-ui-express');

const authRouter = require('./routes/auth');
const recipesRouter = require('./routes/recipes');
const shoppingListRouter = require('./routes/shopping-list');
const mealPlanRouter = require('./routes/meal-plan');
const collectionsRouter = require('./routes/collections');
const historyRouter = require('./routes/history');
const analyticsRouter = require('./routes/analytics');
const { swaggerSpec } = require('./config/swagger');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', service: 'receita-da-vovo-backend' });
  });

  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/recipes', recipesRouter);
  app.use('/api/v1/shopping-list', shoppingListRouter);
  app.use('/api/v1/meal-plan', mealPlanRouter);
  app.use('/api/v1/collections', collectionsRouter);
  app.use('/api/v1/history', historyRouter);
  app.use('/api/v1/analytics', analyticsRouter);

  return app;
}

module.exports = { createApp };
