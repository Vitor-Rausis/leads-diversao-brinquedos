const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const routes = require('./routes');
const { generalLimiter } = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorHandler');
const env = require('./config/env');

const app = express();

// Trust proxy for Render/Railway/etc
app.set('trust proxy', 1);

// Security
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(
  cors({
    origin: env.FRONTEND_URL || '*',
    credentials: true,
  })
);

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check (before rate limit)
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve frontend static files in production (before rate limit)
if (env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
}

// General rate limit (only for API routes)
app.use('/api', generalLimiter);

// API Routes
app.use('/api/v1', routes);

// SPA fallback - serve index.html for all non-API routes (production only)
if (env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Error handling
app.use(errorHandler);

module.exports = app;
