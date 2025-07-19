const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API to register user
app.post('/api/register', (req, res) => {
    const { UserName, Password } = req.body;

    if (!UserName || !Password) {
        return res.status(400).send('Missing fields');
    }

    const users = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8') || '[]');
    users.push({ username: UserName, password: Password });

    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    res.send('User registered!');
});

// API to get all users (for debug)
app.get('/api/users', (req, res) => {
    const users = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8') || '[]');
    res.json(users);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
