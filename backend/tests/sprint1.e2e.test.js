const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createApp } = require('../src/app');

describe('Sprint 1 API E2E', () => {
  let mongo;
  const app = createApp();

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.ANALYTICS_SALT = 'test-salt';

    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  afterEach(async () => {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  });

  it('cobre cadastro/login/onboarding, receita com midia, review, colecao, historico e analytics', async () => {
    const deviceId = 'device-test-1234';

    const registerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Francisco',
      email: 'francisco@example.com',
      password: '123456',
      preferences: {
        vegetarian: true,
        glutenFree: false,
        lactoseFree: false,
      },
      restrictions: ['sem-lactose'],
    });

    expect(registerRes.statusCode).toBe(201);
    expect(registerRes.body.user.preferences.vegetarian).toBe(true);
    expect(registerRes.body.user.preferences.lactoseFree).toBe(true);
    expect(registerRes.body.user.restrictions).toContain('sem-lactose');

    const token = registerRes.body.token;

    const socialRes = await request(app).post('/api/v1/auth/social-login').send({
      provider: 'google',
      email: 'francisco@example.com',
      name: 'Francisco Social',
      providerId: 'google-123',
    });
    expect(socialRes.statusCode).toBe(200);

    const bioEnableRes = await request(app)
      .post('/api/v1/auth/biometric/enable')
      .set('Authorization', `Bearer ${token}`)
      .send({ enabled: true, deviceId });
    expect(bioEnableRes.statusCode).toBe(200);
    expect(bioEnableRes.body.biometricEnabled).toBe(true);

    const bioChallengeRes = await request(app).post('/api/v1/auth/biometric/challenge').send({
      email: 'francisco@example.com',
      deviceId,
    });
    expect(bioChallengeRes.statusCode).toBe(200);
    expect(bioChallengeRes.body.challenge).toBeTruthy();

    const bioLoginRes = await request(app).post('/api/v1/auth/biometric/login').send({
      email: 'francisco@example.com',
      deviceId,
      challenge: bioChallengeRes.body.challenge,
    });
    expect(bioLoginRes.statusCode).toBe(200);

    const recipeRes = await request(app)
      .post('/api/v1/recipes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Bolo de Cenoura',
        description: 'Receita da familia',
        imageUrl: 'file:///tmp/bolo.jpg',
        videoUrl: 'file:///tmp/bolo.mp4',
        videoDurationSeconds: 8,
        ingredients: [
          { name: 'cenoura', quantity: 3, unit: 'un' },
          { name: 'farinha', quantity: 2, unit: 'xicaras' },
        ],
      });

    expect(recipeRes.statusCode).toBe(201);
    expect(recipeRes.body.videoUrl).toContain('.mp4');

    const invalidRecipeRes = await request(app)
      .post('/api/v1/recipes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Video Longo',
        imageUrl: 'file:///tmp/bolo.jpg',
        videoUrl: 'file:///tmp/bolo.mp4',
        videoDurationSeconds: 12,
        ingredients: [{ name: 'acucar', quantity: 1, unit: 'xicara' }],
      });
    expect(invalidRecipeRes.statusCode).toBe(400);

    const recipeId = recipeRes.body._id;

    const reviewRes = await request(app)
      .post(`/api/v1/recipes/${recipeId}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        rating: 5,
        comment: 'Excelente!',
        imageUrl: 'file:///tmp/resultado.jpg',
      });

    expect(reviewRes.statusCode).toBe(201);
    expect(reviewRes.body.averageRating).toBe(5);

    const collectionRes = await request(app)
      .post('/api/v1/collections')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Favoritas' });

    expect(collectionRes.statusCode).toBe(201);
    const collectionId = collectionRes.body._id;

    const addToCollectionRes = await request(app)
      .post(`/api/v1/collections/${collectionId}/recipes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId });
    expect(addToCollectionRes.statusCode).toBe(200);
    expect(addToCollectionRes.body.recipeIds.length).toBe(1);

    const historyRes = await request(app)
      .post('/api/v1/history')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recipeId,
        notes: 'Fiz no domingo',
        realTimeMinutes: 55,
        difficultyVote: 2,
      });

    expect(historyRes.statusCode).toBe(201);

    const consentRes = await request(app)
      .post('/api/v1/analytics/consent')
      .set('Authorization', `Bearer ${token}`)
      .send({ enabled: true });
    expect(consentRes.statusCode).toBe(200);

    const eventRes = await request(app)
      .post('/api/v1/analytics/event')
      .set('Authorization', `Bearer ${token}`)
      .send({
        eventName: 'recipe_viewed',
        metadata: { recipeId },
      });

    expect(eventRes.statusCode).toBe(201);

    const shoppingRes = await request(app).post('/api/v1/shopping-list/from-recipe').send({ recipeId });
    expect(shoppingRes.statusCode).toBe(201);
    expect(shoppingRes.body.items.length).toBeGreaterThan(0);
    expect(shoppingRes.body.addedItemsCount).toBeGreaterThan(0);

    const docsRes = await request(app).get('/api/v1/docs/');
    expect(docsRes.statusCode).toBe(200);
  });
});
