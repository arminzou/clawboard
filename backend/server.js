const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const http = require('http');

// Import routes
const tasksRouter = require('./routes/tasks');
const activitiesRouter = require('./routes/activities');
const docsRouter = require('./routes/docs');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

// Database setup
const DB_PATH = path.join(__dirname, '../data/tasks.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // Better performance for concurrent reads/writes

// Migrations
try {
    const { migrate } = require('./db/migrate');
    migrate(db);
} catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
}

// Make db available to routes
app.locals.db = db;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// API Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/docs', docsRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Frontend (production build)
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');
const FRONTEND_INDEX = path.join(FRONTEND_DIST, 'index.html');
const HAS_FRONTEND = fs.existsSync(FRONTEND_INDEX);

if (HAS_FRONTEND) {
    // Serve SPA
    app.use(express.static(FRONTEND_DIST));

    // History API fallback (avoid intercepting /api/*)
    app.get(/^\/(?!api\/).*/, (req, res) => {
        res.sendFile(FRONTEND_INDEX);
    });
} else {
    // Root route (helpful for quick sanity checks)
    app.get('/', (req, res) => {
        res.json({
            name: 'Project Manager Backend',
            status: 'ok',
            api: {
                health: '/api/health',
                tasks: '/api/tasks',
                activities: '/api/activities',
                docs: '/api/docs',
            },
            note: 'Frontend build not found. Run: npm --prefix frontend run build',
        });
    });
}

// Create HTTP server for WebSocket upgrade
const server = http.createServer(app);

// WebSocket setup for real-time updates
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
        console.log('Received:', message.toString());
    });
    
    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

// Broadcast helper for routes to use
app.locals.broadcast = (data) => {
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify(data));
        }
    });
};

// Start server
server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error(`👉 Try: PORT=${Number(PORT) + 1} npm run dev\n`);
        process.exit(1);
    }
    if (err && (err.code === 'EACCES' || err.code === 'EPERM')) {
        console.error(`\n❌ Permission denied binding to ${HOST}:${PORT}.`);
        console.error('👉 Try a higher port (e.g. 3002) or set HOST=127.0.0.1\n');
        process.exit(1);
    }
    throw err;
});

server.listen(PORT, HOST, () => {
    const baseUrl = `http://${HOST}:${PORT}`;
    const wsUrl = `ws://${HOST}:${PORT}/ws`;
    console.log(`\n🚀 Project Manager Backend running on ${baseUrl}`);
    console.log(`📊 WebSocket endpoint: ${wsUrl}`);
    console.log(`💾 Database: ${DB_PATH}`);

    // Optional: keep dashboard data fresh automatically
    if (String(process.env.AUTO_SYNC || '').toLowerCase() === '1' || String(process.env.AUTO_SYNC || '').toLowerCase() === 'true') {
        const intervalMs = Number(process.env.SYNC_INTERVAL_MS || 60_000);
        const { createAutoSync } = require('./utils/autoSync');
        const auto = createAutoSync({ intervalMs, log: console });
        app.locals.autoSync = auto;
        console.log(`🔁 Auto-sync enabled (every ${intervalMs}ms)\n`);
    } else {
        console.log('');
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    db.close();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
