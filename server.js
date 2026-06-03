const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { db } = require('./db');
const { runSeed } = require('./seed');
const apiRouter = require('./routes');

const app = express();
const PORT = process.env.PORT || 8000;

// ── CORS ───────────────────────────────────────────────────────
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL.replace(/\/$/, ''), 'http://localhost:3000']
  : '*';

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ── Body parser ────────────────────────────────────────────────
app.use(express.json());

// ── Logging middleware ─────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// ── Seed on DB connect ─────────────────────────────────────────
db.once('open', async () => {
  try {
    const seeded = await runSeed();
    console.log('Seeded database successfully:', seeded);
  } catch (err) {
    console.error('Database seeding failed:', err);
  }
});

// ── DB Connection middleware for serverless ──────────────────
app.use(async (req, res, next) => {
  try {
    const { connectDB } = require('./db');
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection middleware failed:', err);
    res.status(500).json({ detail: 'Database connection failed: ' + err.message });
  }
});

// ── Routes ─────────────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({ message: 'SAM for Life API', version: '2.0.0' });
});

app.get('/api/db-verify', (req, res) => {
  const mongoose = require('mongoose');
  let masked = 'not set';
  if (process.env.MONGO_URL) {
    masked = process.env.MONGO_URL.replace(/:([^@]+)@/, ':****@');
  }
  res.json({
    readyState: mongoose.connection.readyState,
    readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
    url: masked
  });
});

app.use('/api', apiRouter);

// ── Export for Vercel Serverless ───────────────────────────────
// Vercel imports this file as a module — it does NOT call listen().
// When running locally with `node server.js`, listen() is called normally.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
  });
}

module.exports = app;
