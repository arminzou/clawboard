const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const { WebSocketServer } = require('ws');
const http = require('http');

// Import routes
const tasksRouter = require('./routes/tasks');
const activitiesRouter = require('./routes/activities');
const docsRouter = require('./routes/docs');

const app = express();
const PORT = process.env.PORT || 3001;

// Database setup
const DB_PATH = path.join(__dirname, '../data/tasks.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // Better performance for concurrent reads/writes

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
server.listen(PORT, () => {
    console.log(`\n🚀 Project Manager Backend running on http://localhost:${PORT}`);
    console.log(`📊 WebSocket endpoint: ws://localhost:${PORT}/ws`);
    console.log(`💾 Database: ${DB_PATH}\n`);
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
