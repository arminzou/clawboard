const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/tasks.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);

// Read and execute schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

console.log('✓ Database initialized:', DB_PATH);

// Insert sample data
const insertTask = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, assigned_to, position)
    VALUES (?, ?, ?, ?, ?, ?)
`);

const sampleTasks = [
    ['Set up backend server', 'Initialize Express server with SQLite integration', 'in_progress', 'high', 'tee', 0],
    ['Design Kanban UI', 'Create React components for Kanban board', 'backlog', 'medium', 'fay', 0],
    ['Implement activity parser', 'Parse session logs for agent activities', 'backlog', 'high', 'tee', 1],
    ['Add WebSocket support', 'Real-time updates for dashboard', 'backlog', 'medium', null, 2],
];

const insertActivity = db.prepare(`
    INSERT INTO activities (agent, activity_type, description, timestamp)
    VALUES (?, ?, ?, ?)
`);

const sampleActivities = [
    ['tee', 'task_start', 'Started setting up project structure', new Date().toISOString()],
    ['tee', 'file_edit', 'Created database schema', new Date().toISOString()],
];

try {
    sampleTasks.forEach(task => insertTask.run(...task));
    sampleActivities.forEach(activity => insertActivity.run(...activity));
    console.log('✓ Sample data inserted');
} catch (err) {
    console.log('Sample data already exists or error:', err.message);
}

db.close();
console.log('✓ Database ready');
