const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const app = express();
const port = 5000;

// ================= MIDDLEWARE =================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ================= MYSQL CONNECTION =================
const db = mysql.createConnection({
    host: 'localhost',
    user: 'ambrose',
    password: 'amby@123',
    database: 'campus_club_hub'
});

db.connect((err) => {
    if (err) {
        console.log("Database connection failed:", err);
    } else {
        console.log("Connected to MySQL database");
    }
});

// ================= SERVE LOGIN PAGE =================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ================= REGISTER =================
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

// ================= LOGIN =================
app.post('/login', (req, res) => {

    const { email, password } = req.body;

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {

        if (err) return res.send("Database error");

        if (results.length === 0) {
            return res.send("User not found");
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.send("Incorrect password");
        }

        res.redirect('/dashboard');
    });
});

// ================= DASHBOARD =================
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ================= UPDATE PROFILE =================
app.post('/update-profile', (req, res) => {

    const userId = 1; // ⚠️ Replace with session later
    const { full_name, reg_number, year } = req.body;

    if (!full_name || !reg_number || !year) {
        return res.send("All fields are required");
    }

    const sql = "UPDATE users SET full_name=?, reg_number=?, year=? WHERE id=?";
    db.query(sql, [full_name, reg_number, year, userId], (err) => {

        if (err) {
            console.log(err);
            return res.send("Error updating profile");
        }

        res.send("Profile updated successfully!");
    });
});

// ================= COMPLETE PROFILE + JOIN CLUB =================
app.post('/complete-profile', (req, res) => {

    const userId = 1; // ⚠️ Replace with session later
    const { reg_number, year, club_name } = req.body;

    if (!reg_number || !year) {
        return res.send("All fields are required");
    }

    // Update profile
    const updateSql = "UPDATE users SET reg_number=?, year=? WHERE id=?";
    db.query(updateSql, [reg_number, year, userId], (err) => {

        if (err) {
            console.log(err);
            return res.send("Error updating profile");
        }

        // Insert club registration
        const insertSql = "INSERT INTO club_registrations (user_id, club_name) VALUES (?, ?)";
        db.query(insertSql, [userId, club_name], (err2) => {

            if (err2) {
                console.log(err2);
                return res.send("Error joining club");
            }

            res.send(`Profile completed and successfully joined ${club_name}`);
        });
    });
});

// ================= JOIN CLUB =================
app.post('/complete-profile', (req, res) => {

    const userId = 1; // ⚠️ Replace with session later
    const { club_name } = req.body;

    if (!club_name) {
        return res.send("No club selected");
    }

    const checkUser = "SELECT full_name, reg_number, year FROM users WHERE id=?";
    db.query(checkUser, [userId], (err, results) => {

        if (err) {
            console.log(err);
            return res.send("Database error");
        }

        if (results.length === 0) {
            return res.send("User not found");
        }

        const user = results[0];

        if (!user.full_name || !user.reg_number || !user.year) {
            return res.redirect(`/complete-profile.html?club=${club_name}`);
        }

        const checkDuplicate = "SELECT * FROM club_registrations WHERE user_id=? AND club_name=?";
        db.query(checkDuplicate, [userId, club_name], (err2, duplicate) => {

            if (err2) {
                console.log(err2);
                return res.send("Database error");
            }

            if (duplicate.length > 0) {
                return res.send("You already joined this club");
            }

            const insertSql = "INSERT INTO club_registrations (user_id, club_name) VALUES (?, ?)";
            db.query(insertSql, [userId, club_name], (err3) => {

                if (err3) {
                    console.log(err3);
                    return res.send("Error joining club");
                }

                res.send(`Successfully joined ${club_name}`);
            });
        });
    });
});

// ================= START SERVER =================
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});