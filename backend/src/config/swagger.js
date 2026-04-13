const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Receita da Vovo API',
      version: '1.0.0',
      description: 'API versionada para receitas, autenticacao e planejamento',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        RegisterInput: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            password: { type: 'string' },
            preferences: { type: 'object' },
            restrictions: { type: 'array', items: { type: 'string' } },
          },
        },
        RecipeInput: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            imageUrl: { type: 'string' },
            videoUrl: { type: 'string' },
            videoDurationSeconds: { type: 'number' },
            ingredients: { type: 'array', items: { type: 'object' } },
          },
        },
        CollectionInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
          },
        },
        HistoryInput: {
          type: 'object',
          required: ['recipeId'],
          properties: {
            recipeId: { type: 'string' },
            notes: { type: 'string' },
            realTimeMinutes: { type: 'number' },
            difficultyVote: { type: 'number' },
            preparedAt: { type: 'string', format: 'date-time' },
          },
        },
        AnalyticsConsentInput: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
          },
        },
        AnalyticsEventInput: {
          type: 'object',
          required: ['eventName'],
          properties: {
            eventName: { type: 'string' },
            metadata: { type: 'object' },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJSDoc(options);

swaggerSpec.paths = {
  '/health': {
    get: {
      summary: 'Health check',
      responses: { 200: { description: 'OK' } },
    },
  },
  '/auth/register': {
    post: {
      summary: 'Cadastro com onboarding',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RegisterInput' },
          },
        },
      },
      responses: { 201: { description: 'Usuario criado' } },
    },
  },
  '/auth/login': {
    post: {
      summary: 'Login local',
      responses: { 200: { description: 'Login realizado' } },
    },
  },
  '/auth/social-login': {
    post: {
      summary: 'Login social (Google/Apple)',
      responses: { 200: { description: 'Login social realizado' } },
    },
  },
  '/auth/biometric/enable': {
    post: {
      summary: 'Habilitar ou desabilitar login biometrico',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Biometria atualizada' } },
    },
  },
  '/auth/biometric/challenge': {
    post: {
      summary: 'Gerar challenge biometrico',
      responses: { 200: { description: 'Challenge gerado' } },
    },
  },
  '/auth/biometric/login': {
    post: {
      summary: 'Login biometrico por challenge',
      responses: { 200: { description: 'Login biometrico realizado' } },
    },
  },
  '/recipes': {
    get: { summary: 'Listar receitas', responses: { 200: { description: 'Lista de receitas' } } },
    post: {
      summary: 'Criar receita com foto/video',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RecipeInput' },
          },
        },
      },
      responses: { 201: { description: 'Receita criada' } },
    },
  },
  '/recipes/{id}/reviews': {
    post: {
      summary: 'Criar avaliacao com comentario e foto',
      security: [{ bearerAuth: [] }],
      responses: { 201: { description: 'Avaliacao criada' } },
    },
  },
  '/collections': {
    get: {
      summary: 'Listar colecoes do usuario autenticado',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Lista de colecoes' } },
    },
    post: {
      summary: 'Criar colecao',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CollectionInput' },
          },
        },
      },
      responses: { 201: { description: 'Colecao criada' } },
    },
  },
  '/collections/{id}': {
    put: {
      summary: 'Renomear colecao',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CollectionInput' },
          },
        },
      },
      responses: { 200: { description: 'Colecao atualizada' } },
    },
    delete: {
      summary: 'Excluir colecao',
      security: [{ bearerAuth: [] }],
      responses: { 204: { description: 'Colecao removida' } },
    },
  },
  '/collections/{id}/recipes': {
    post: {
      summary: 'Adicionar receita em colecao',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Receita adicionada na colecao' } },
    },
  },
  '/collections/{id}/recipes/{recipeId}': {
    delete: {
      summary: 'Remover receita da colecao',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Receita removida da colecao' } },
    },
  },
  '/history': {
    get: {
      summary: 'Listar historico de preparo do usuario',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Historico retornado' } },
    },
    post: {
      summary: 'Registrar preparo de receita no historico',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/HistoryInput' },
          },
        },
      },
      responses: { 201: { description: 'Historico registrado' } },
    },
  },
  '/analytics/consent': {
    post: {
      summary: 'Definir consentimento de analytics',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AnalyticsConsentInput' },
          },
        },
      },
      responses: { 200: { description: 'Consentimento atualizado' } },
    },
  },
  '/analytics/event': {
    post: {
      summary: 'Registrar evento de analytics anonimizado',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AnalyticsEventInput' },
          },
        },
      },
      responses: { 201: { description: 'Evento registrado' } },
    },
  },
};

module.exports = { swaggerSpec };
