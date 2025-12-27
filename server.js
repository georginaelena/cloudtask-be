require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const {
  DB_HOST,
  DB_USER,
  DB_PASS,
  DB_NAME,
  DB_PORT,
  JWT_SECRET,
  PORT = 8080,
} = process.env;

const app = express();
app.use(cors());
app.use(express.json());

// DATABASE
const pool = new Pool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  port: Number(DB_PORT),
});

// AUTH MIDDLEWARE
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.sendStatus(401);

  try {
    const token = h.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
}

// HEALTH CHECK
app.get("/health", (_, res) => res.json({ ok: true }));

// REGISTER
app.post("/auth/register", async (req, res) => {
  const { workspaceName, email, password } = req.body;

  if (!workspaceName || !email || !password)
    return res.status(400).json({ error: "missing field" });

  try {
    await pool.query(
      `INSERT INTO workspaces (id, name)
       VALUES ($1,$2)
       ON CONFLICT (id) DO NOTHING`,
      [workspaceName, workspaceName]
    );

    const hash = await bcrypt.hash(password, 10);

    const user = await pool.query(
      `INSERT INTO users (workspace_id, email, password_hash)
       VALUES ($1,$2,$3)
       RETURNING id`,
      [workspaceName, email, hash]
    );

    const token = jwt.sign(
      { id: user.rows[0].id, workspaceId: workspaceName },
      JWT_SECRET
    );

    res.json({ token });
  } catch {
    res.status(409).json({ error: "email exists in workspace" });
  }
});

// LOGIN
app.post("/auth/login", async (req, res) => {
  const { workspaceName, email, password } = req.body;

  const user = await pool.query(
    `SELECT * FROM users
     WHERE workspace_id=$1 AND email=$2`,
    [workspaceName, email]
  );

  if (!user.rowCount) return res.sendStatus(401);

  const ok = await bcrypt.compare(password, user.rows[0].password_hash);
  if (!ok) return res.sendStatus(401);

  const token = jwt.sign(
    { id: user.rows[0].id, workspaceId: workspaceName },
    JWT_SECRET
  );

  res.json({ token });
});


// TASK CRUD

// GET TASKS
app.get("/tasks", auth, async (req, res) => {
  const r = await pool.query(
    `SELECT * FROM tasks
     WHERE workspace_id=$1
     ORDER BY id DESC`,
    [req.user.workspaceId]
  );
  res.json(r.rows);
});

// CREATE TASK 
app.post("/tasks", auth, async (req, res) => {
  const { title, priority = "LOW", deadline = null, notes = null } = req.body;

  const r = await pool.query(
    `INSERT INTO tasks
     (workspace_id, created_by, title, priority, deadline, notes)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      req.user.workspaceId,
      req.user.id,
      title,
      priority,
      deadline,
      notes,
    ]
  );

  res.json(r.rows[0]);
});

// UPDATE TASK
app.patch("/tasks/:id", auth, async (req, res) => {
  const { is_done, notes } = req.body;

  const updates = [];
  const values = [];
  let paramCount = 1;

  if (is_done !== undefined) {
    updates.push(`is_done=$${paramCount++}`);
    values.push(is_done);
  }
  if (notes !== undefined) {
    updates.push(`notes=$${paramCount++}`);
    values.push(notes);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "no fields to update" });
  }

  values.push(req.params.id, req.user.workspaceId);

  const r = await pool.query(
    `UPDATE tasks
     SET ${updates.join(", ")}
     WHERE id=$${paramCount} AND workspace_id=$${paramCount + 1}
     RETURNING *`,
    values
  );

  res.json(r.rows[0]);
});

// DELETE TASK
app.delete("/tasks/:id", auth, async (req, res) => {
  await pool.query(
    `DELETE FROM tasks
     WHERE id=$1 AND workspace_id=$2`,
    [req.params.id, req.user.workspaceId]
  );
  res.sendStatus(204);
});

app.listen(PORT, () =>
  console.log("API RUNNING ON", PORT)
);