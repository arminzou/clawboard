import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import http from 'http';

// Load environment variables from .env (one directory up from backend/)
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import routes (CommonJS modules)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tasksRouter = require('./routes/tasks');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tasksArchiveRouter = require('./routes/tasks.archive');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const activitiesRouter = require('./routes/activities');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const docsRouter = require('./routes/docs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const projectsRouter = require('./routes/projects');

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const HOST = String(process.env.HOST ?? '127.0.0.1');

// Database setup
const DB_PATH = path.join(__dirname, '../data/clawboard.db');
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

// Optional auth (only enforced when CLAWBOARD_API_KEY is set)
const { requireApiKey, isRequestAuthorized } = require('./utils/auth');
app.use('/api', requireApiKey({ allowPaths: ['/health'] }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// API Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/tasks', tasksArchiveRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/docs', docsRouter);
app.use('/api/projects', projectsRouter);

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
            name: 'Clawboard Backend',
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

wss.on('connection', (ws: import('ws').WebSocket, req: http.IncomingMessage) => {
    if (!isRequestAuthorized(req)) {
        try {
            ws.close(1008, 'Unauthorized');
        } catch {
            // ignore
        }
        return;
    }

    console.log('WebSocket client connected');

    ws.on('message', (message: import('ws').RawData) => {
        console.log('Received:', message.toString());
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

// Broadcast helper for routes to use
app.locals.broadcast = (data: unknown) => {
    wss.clients.forEach((client: import('ws').WebSocket) => {
        if (client.readyState === 1) {
            client.send(JSON.stringify(data));
        }
    });
};

// Start server
server.on('error', (err: NodeJS.ErrnoException) => {
    if (err?.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error(`👉 Try: PORT=${PORT + 1} npm run dev\n`);
        process.exit(1);
    }
    if (err?.code === 'EACCES' || err?.code === 'EPERM') {
        console.error(`\n❌ Permission denied binding to ${HOST}:${PORT}.`);
        console.error('👉 Try a higher port (e.g. 3002) or set HOST=127.0.0.1\n');
        process.exit(1);
    }
    throw err;
});

server.listen(PORT, HOST, () => {
    const baseUrl = `http://${HOST}:${PORT}`;
    const wsUrl = `ws://${HOST}:${PORT}/ws`;
    console.log(`\n🚀 Clawboard Backend running on ${baseUrl}`);
    console.log(`📊 WebSocket endpoint: ${wsUrl}`);
    console.log(`💾 Database: ${DB_PATH}`);

    // Optional: keep dashboard data fresh automatically
    if (String(process.env.AUTO_SYNC || '').toLowerCase() === '1' || String(process.env.AUTO_SYNC || '').toLowerCase() === 'true') {
        const intervalMs = Number(process.env.SYNC_INTERVAL_MS || 60_000);
        const { createAutoSync } = require('./utils/autoSync');
        const auto = createAutoSync({ intervalMs, log: console, db, broadcast: app.locals.broadcast });
        app.locals.autoSync = auto;
        console.log(`🔁 Auto-sync enabled (every ${intervalMs}ms)\n`);
    } else {
        console.log('');
    }
});

// Graceful shutdown
const shutdown = (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);

    // Stop auto-sync if running
    if (app.locals.autoSync) {
        app.locals.autoSync.stop();
    }

    // Close WebSocket connections
    wss.clients.forEach((client: import('ws').WebSocket) => {
        client.close(1001, 'Server shutting down');
    });

    // Close server and database
    server.close(() => {
        db.close();
        console.log('Server closed');
        process.exit(0);
    });

    // Force exit after 5s if graceful shutdown hangs
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 5000);
};

process.on('SIGINT', () => shutdown('SIGINT'));   // Ctrl-c
process.on('SIGTERM', () => shutdown('SIGTERM')); // kill command
