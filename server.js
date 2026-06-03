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
  ? [process.env.FRONTEND_URL, 'http://localhost:3000']
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

// ── Routes ─────────────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({ message: 'SAM for Life API', version: '2.0.0' });
});

app.get('/api/db-status', (req, res) => {
  const mongoose = require('mongoose');
  let maskedUrl = 'not set';
  if (process.env.MONGO_URL) {
    maskedUrl = process.env.MONGO_URL.replace(/:([^@]+)@/, ':****@');
  }
  res.json({
    readyState: mongoose.connection.readyState,
    readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
    connectionStatus: global.mongoConnectionStatus || 'unknown',
    connectionError: global.mongoConnectionError || null,
    mongoUrl: maskedUrl,
    envKeys: Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DB') || k.includes('URL') || k.includes('PORT'))
  });
});

app.get('/api/db-net-test', async (req, res) => {
  const dns = require('dns');
  const net = require('net');
  
  const hosts = [
    'ac-jh5b7dd-shard-00-00.z44fllm.mongodb.net',
    'ac-jh5b7dd-shard-00-01.z44fllm.mongodb.net',
    'ac-jh5b7dd-shard-00-02.z44fllm.mongodb.net'
  ];
  const port = 27017;
  
  const results = {};
  
  for (const host of hosts) {
    results[host] = {
      dnsResolve: null,
      tcpConnect: null
    };
    
    try {
      results[host].dnsResolve = await new Promise((resolve) => {
        dns.resolve4(host, (err, addresses) => {
          if (err) resolve({ error: err.message });
          else resolve(addresses);
        });
      });
      
      results[host].tcpConnect = await new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3000);
        
        socket.connect(port, host, () => {
          socket.destroy();
          resolve({ status: 'connected' });
        });
        
        socket.on('error', (err) => {
          socket.destroy();
          resolve({ status: 'failed', error: err.message });
        });
        
        socket.on('timeout', () => {
          socket.destroy();
          resolve({ status: 'timeout' });
        });
      });
    } catch (err) {
      results[host].error = err.message;
    }
  }
  
  res.json(results);
});

app.get('/api/db-test-direct', async (req, res) => {
  const mongoose = require('mongoose');
  const results = {
    status: null,
    error: null
  };
  
  if (!process.env.MONGO_URL) {
    results.status = 'error';
    results.error = 'MONGO_URL is not set';
    return res.json(results);
  }
  
  try {
    // Construct a direct connection URL by taking the first host of the current MONGO_URL
    let directUrl = process.env.MONGO_URL;
    if (directUrl.includes(',')) {
      // If it's the multi-host URL, grab the first host and append directConnection=true
      const hostsPart = directUrl.split('@')[1].split('/')[0];
      const firstHost = hostsPart.split(',')[0];
      const creds = directUrl.split('@')[0];
      const rest = directUrl.split('@')[1].split('/').slice(1).join('/');
      directUrl = `${creds}@${firstHost}/${rest}`;
      if (!directUrl.includes('directConnection=true')) {
        directUrl += (directUrl.includes('?') ? '&' : '?') + 'directConnection=true';
      }
    } else if (directUrl.includes('mongodb+srv://')) {
      // If it's SRV, we can't do direct connection easily unless we use one of the resolved hosts.
      // Let's use ac-jh5b7dd-shard-00-00.z44fllm.mongodb.net
      const creds = directUrl.split('@')[0].replace('mongodb+srv://', 'mongodb://');
      const dbName = directUrl.split('.mongodb.net/')[1] || '';
      directUrl = `${creds}@ac-jh5b7dd-shard-00-00.z44fllm.mongodb.net:27017/${dbName}`;
      directUrl += (directUrl.includes('?') ? '&' : '?') + 'ssl=true&authSource=admin&directConnection=true';
    }
    
    // Create a new connection instance to avoid side-effects on main connection
    const conn = await mongoose.createConnection(directUrl, {
      serverSelectionTimeoutMS: 5000
    }).asPromise();
    
    results.status = 'connected';
    results.readyState = conn.readyState;
    await conn.close();
  } catch (err) {
    results.status = 'failed';
    results.error = err.message;
  }
  
  res.json(results);
});

app.get('/api/db-test-srv', async (req, res) => {
  const mongoose = require('mongoose');
  const results = {
    status: null,
    error: null
  };
  
  const srvUrl = 'mongodb+srv://samAdmin:ej3XeaEecdELiBio@clustersam.z44fllm.mongodb.net/samforlife?retryWrites=true&w=majority&appName=ClusterSam';
  
  try {
    const conn = await mongoose.createConnection(srvUrl, {
      serverSelectionTimeoutMS: 5000
    }).asPromise();
    
    results.status = 'connected';
    results.readyState = conn.readyState;
    await conn.close();
  } catch (err) {
    results.status = 'failed';
    results.error = err.message;
  }
  
  res.json(results);
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
