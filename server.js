const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const app = express();

// ✅ Use Render port
const port = process.env.PORT || 5000;

// ================= ADMIN CREDENTIALS =================
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "amby@123";

// ================= MIDDLEWARE =================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve student pages
app.use(express.static(path.join(__dirname, 'public')));

// Serve admin pages
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ================= MYSQL CONNECTION =================
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false } // ✅ Required for Aiven
});

db.connect(err => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Connected to Aiven MySQL!");
  }
});

// ================= HOME PAGE =================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ================= ADMIN LOGIN PAGE =================
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

// ================= ADMIN LOGIN =================
app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.redirect('/admin/dashboard.html');
  }

  res.send("Invalid admin credentials");
});

// ================= REGISTER USER =================
app.post('/register', async (req, res) => {
  const { full_name, email, password } = req.body;

  if (!full_name || !email || !password) {
    return res.send("All fields are required");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = 'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)';
    db.query(sql, [full_name, email, hashedPassword], (err) => {
      if (err) {
        console.log(err);
        return res.send("Error registering user");
      }
      res.send("User registered successfully");
    });

  } catch (error) {
    console.log(error);
    res.send("Server error");
  }
});

// ================= USER LOGIN =================
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM users WHERE email=?';

  db.query(sql, [email], async (err, results) => {
    if (err) return res.send("Database error");
    if (results.length === 0) return res.send("User not found");

    const user = results[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.send("Incorrect password");

    res.redirect('/dashboard');
  });
});

// ================= USER DASHBOARD =================
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ================= UPDATE PROFILE =================
app.post('/update-profile', (req, res) => {
  const userId = 1; // TODO: replace with session user
  const { full_name, reg_number, year } = req.body;

  const sql = "UPDATE users SET full_name=?, reg_number=?, year=? WHERE id=?";
  db.query(sql, [full_name, reg_number, year, userId], (err) => {
    if (err) return res.send("Error updating profile");
    res.send("Profile updated successfully");
  });
});

// ================= COMPLETE PROFILE + JOIN CLUB =================
app.post('/complete-profile', (req, res) => {
  const userId = 1;
  const { reg_number, year, club_name } = req.body;

  const updateProfile = "UPDATE users SET reg_number=?, year=? WHERE id=?";
  db.query(updateProfile, [reg_number, year, userId], (err) => {
    if (err) return res.send("Error updating profile");

    const checkDuplicate = "SELECT * FROM club_registrations WHERE user_id=? AND club_name=?";
    db.query(checkDuplicate, [userId, club_name], (err2, duplicate) => {
      if (err2) return res.send("Database error (duplicate check)");

      if (duplicate.length > 0) {
        return res.send("You already joined this club");
      }

      const insertSql = "INSERT INTO club_registrations (user_id, club_name) VALUES (?, ?)";
      db.query(insertSql, [userId, club_name], (err3) => {
        if (err3) return res.send("Error joining club");

        res.send(`Profile completed and you joined ${club_name}`);
      });
    });
  });
});

// ================= ADMIN DASHBOARD DATA =================
app.get('/admin/dashboard-data', (req, res) => {
  const sql = `
    SELECT u.id, u.full_name, u.reg_number, u.year, c.club_name
    FROM club_registrations c
    JOIN users u ON c.user_id = u.id
    ORDER BY u.full_name
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: err.sqlMessage });
    }
    res.json(results);
  });
});

// ================= DELETE PARTICIPANT =================
app.delete('/admin/delete-participant', (req, res) => {
  const { user_id, club_name } = req.query;

  const sql = "DELETE FROM club_registrations WHERE user_id=? AND club_name=?";
  db.query(sql, [user_id, club_name], (err) => {
    if (err) return res.send("Error deleting participant");
    res.send("Participant removed successfully");
  });
});

// ================= START SERVER =================
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${port}`);
});