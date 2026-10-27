
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const pool = require("./db");

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  throw new Error("DATABASE_URL and JWT_SECRET must be configured.");
}

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://aurora-dashboard-7rfjx0047-mmuhammednihal421-crypto.vercel.app",
    "https://aurora-dashboard-ten-sooty.vercel.app"
  ],
}));
app.use(express.json({ limit: "20kb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/", (req, res) => {
  res.json({ message: "AURORA API is running ✨" });
});

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS database_time");
    res.json({
      success: true,
      message: "AURORA is connected to Neon!",
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    console.error("Health check failed:", error.message);
    res.status(500).json({ success: false, message: "Database connection failed." });
  }
});

app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = req.body.password;

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 128
    ) {
      return res.status(400).json({
        message: "Enter a valid email and a password of 12–128 characters.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();

    await pool.query(
      `INSERT INTO app_users (id, email, password_hash)
       VALUES ($1, $2, $3)`,
      [id, email, passwordHash]
    );

    const token = jwt.sign({ sub: id }, process.env.JWT_SECRET, {
      expiresIn: "2h",
      issuer: "aurora-api",
      audience: "aurora-app",
    });

    res.status(201).json({ token, user: { id, email } });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "This email already has an account." });
    }

    console.error("Registration failed:", error.message);
    res.status(500).json({ message: "Could not create the account." });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = req.body.password;

    if (!email || typeof password !== "string") {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const result = await pool.query(
      "SELECT id, email, password_hash FROM app_users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
      expiresIn: "2h",
      issuer: "aurora-api",
      audience: "aurora-app",
    });

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Login failed:", error.message);
    res.status(500).json({ message: "Could not log in." });
  }
});

function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Please log in." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "aurora-api",
      audience: "aurora-app",
    });

    if (typeof payload.sub !== "string") throw new Error("Invalid user");
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ message: "Session expired. Please log in again." });
  }
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

app.get("/api/day/:date", requireAuth, async (req, res) => {
  const { date } = req.params;

  if (!validDate(date)) {
    return res.status(400).json({ message: "Use a valid YYYY-MM-DD date." });
  }

  try {
    const [routines, tasks] = await Promise.all([
      pool.query(
        `SELECT activity_id, target_hours, actual_hours
         FROM routine_entries
         WHERE user_id = $1 AND activity_date = $2`,
        [req.userId, date]
      ),
      pool.query(
        `SELECT id, title, category, done, hours, created_at
         FROM tasks
         WHERE user_id = $1 AND activity_date = $2
         ORDER BY created_at DESC`,
        [req.userId, date]
      ),
    ]);

    res.json({ date, routines: routines.rows, tasks: tasks.rows });
  } catch (error) {
    console.error("Read day failed:", error.message);
    res.status(500).json({ message: "Could not load this day's records." });
  }
});

app.put("/api/day/:date/routines", requireAuth, async (req, res) => {
  const { date } = req.params;
  const { activityId, targetHours, actualHours } = req.body;

  if (!validDate(date)) {
    return res.status(400).json({ message: "Invalid date." });
  }

  if (
    typeof activityId !== "string" ||
    !/^[a-zA-Z0-9_-]{1,60}$/.test(activityId) ||
    !Number.isFinite(targetHours) ||
    !Number.isFinite(actualHours) ||
    targetHours < 0 || targetHours > 24 ||
    actualHours < 0 || actualHours > 24
  ) {
    return res.status(400).json({ message: "Invalid routine values." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO routine_entries
       (user_id, activity_date, activity_id, target_hours, actual_hours)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, activity_date, activity_id)
       DO UPDATE SET
         target_hours = EXCLUDED.target_hours,
         actual_hours = EXCLUDED.actual_hours,
         updated_at = NOW()
       RETURNING activity_id, target_hours, actual_hours`,
      [req.userId, date, activityId, targetHours, actualHours]
    );

    res.json({ routine: result.rows[0] });
  } catch (error) {
    console.error("Save routine failed:", error.message);
    res.status(500).json({ message: "Could not save routine." });
  }
});

app.post("/api/day/:date/tasks", requireAuth, async (req, res) => {
  const { date } = req.params;
  const { title, category = "Personal", hours = 0 } = req.body;
  const categories = [
    "Personal", "Home", "Friends", "Urgent", "Other",
    "Work", "Learning", "Health",
  ];

  if (!validDate(date)) {
    return res.status(400).json({ message: "Invalid date." });
  }

  if (
    typeof title !== "string" || !title.trim() || title.trim().length > 200 ||
    !categories.includes(category) ||
    !Number.isFinite(hours) || hours < 0 || hours > 24
  ) {
    return res.status(400).json({ message: "Invalid task values." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (user_id, activity_date, title, category, hours)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, category, done, hours, created_at`,
      [req.userId, date, title.trim(), category, hours]
    );

    res.status(201).json({ task: result.rows[0] });
  } catch (error) {
    console.error("Create task failed:", error.message);
    res.status(500).json({ message: "Could not create task." });
  }
});

app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { done, hours } = req.body;

  if (
    !/^\d+$/.test(id) ||
    (done === undefined && hours === undefined) ||
    (done !== undefined && typeof done !== "boolean") ||
    (hours !== undefined &&
      (!Number.isFinite(hours) || hours < 0 || hours > 24))
  ) {
    return res.status(400).json({ message: "Invalid task update." });
  }

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET done = COALESCE($1, done),
           hours = COALESCE($2, hours)
       WHERE id = $3 AND user_id = $4
       RETURNING id, title, category, done, hours`,
      [done ?? null, hours ?? null, id, req.userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Task not found." });
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error("Update task failed:", error.message);
    res.status(500).json({ message: "Could not update task." });
  }
});

app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ message: "Invalid task ID." });
  }

  try {
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Task not found." });
    }

    res.status(204).end();
  } catch (error) {
    console.error("Delete task failed:", error.message);
    res.status(500).json({ message: "Could not delete task." });
  }
});

app.get("/api/routines/range", requireAuth, async (req, res) => {
  const { start, end } = req.query;

  const isValidDate = (value) =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

  if (!isValidDate(start) || !isValidDate(end) || start > end) {
    return res.status(400).json({
      message: "Please provide valid start and end dates.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT activity_date, activity_id, target_hours, actual_hours
       FROM routine_entries
       WHERE user_id = $1
         AND activity_date BETWEEN $2::date AND $3::date
       ORDER BY activity_date, activity_id`,
      [req.userId, start, end]
    );

    res.json({ routines: result.rows });
  } catch (error) {
    console.error("Weekly routine query failed:", error);
    res.status(500).json({
      message: "Could not load weekly routine data.",
    });
  }
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`AURORA backend running at http://localhost:${PORT}`);
});
