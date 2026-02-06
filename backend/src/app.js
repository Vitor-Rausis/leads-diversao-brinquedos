const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

console.log('=== APP.JS LOADED v2 ===');
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
const frontendPath = path.join(__dirname, '../../frontend/dist');
console.log('Frontend path:', frontendPath);
console.log('NODE_ENV:', env.NODE_ENV);
console.log('Dist exists:', fs.existsSync(frontendPath));

if (fs.existsSync(frontendPath)) {
  console.log('Dist contents:', fs.readdirSync(frontendPath));
  app.use(express.static(frontendPath));
}

// General rate limit (only for API routes)
app.use('/api', generalLimiter);

// API Routes
app.use('/api/v1', routes);

// SPA fallback - serve index.html for all non-API routes
if (fs.existsSync(frontendPath)) {
  app.get('*', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    console.log('Serving index.html from:', indexPath);
    res.sendFile(indexPath);
  });
}

// Error handling
app.use(errorHandler);

module.exports = app;
