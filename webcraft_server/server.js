const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Разрешить CORS для фронтенда
app.use(cors());
app.use(express.json());

// Подключение БД
const db = new Database('./database.sqlite');

// === Таблица для формы обратной связи ===
db.prepare(`
    CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// === Таблица для менеджера задач ===
db.prepare(`
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// === Тестовый маршрут ===
app.get('/', (req, res) => {
    res.send('Сервер работает 🚀');
});

// === CRUD: Форма обратной связи ===
app.post('/api/records', (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    const stmt = db.prepare(`INSERT INTO records (name, email, message) VALUES (?, ?, ?)`);
    const info = stmt.run(name, email, message);
    res.json({ id: info.lastInsertRowid, name, email, message });
});

app.get('/api/records', (req, res) => {
    const stmt = db.prepare(`SELECT * FROM records ORDER BY created_at DESC`);
    const records = stmt.all();
    res.json(records);
});

// === CRUD: Менеджер задач ===
app.post('/api/tasks', (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Пустое содержимое' });
    const stmt = db.prepare(`INSERT INTO tasks (content) VALUES (?)`);
    const info = stmt.run(content);
    res.json({ id: info.lastInsertRowid, content });
});

app.get('/api/tasks', (req, res) => {
    const stmt = db.prepare(`SELECT * FROM tasks ORDER BY created_at DESC`);
    const tasks = stmt.all();
    res.json(tasks);
});

app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare(`DELETE FROM tasks WHERE id = ?`);
    const info = stmt.run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Задача не найдена' });
    res.json({ message: `Задача ${id} удалена` });
});

// === Запуск сервера ===
app.listen(3000, '127.0.0.1', () => {
  console.log(`✅ Сервер запущен: http://localhost:192.168.0.101`);
});
