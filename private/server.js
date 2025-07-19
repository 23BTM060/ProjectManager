const express = require('express');
const path = require('path');
const os = require('os');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'user.json');
const PROJECTS_FILE = path.join(__dirname, 'projects.json');

app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Helper: Read users from file
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Helper: Write users to file
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

// Helper: Read projects from file
function readProjects() {
  if (!fs.existsSync(PROJECTS_FILE)) return [];
  const data = fs.readFileSync(PROJECTS_FILE, 'utf-8');
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Helper: Write projects to file
function writeProjects(projects) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
}

// Registration endpoint
app.post('/api/register', (req, res) => {
  const { UserName, Password } = req.body;
  if (!UserName || !Password) return res.status(400).send('Missing fields');

  let users = readUsers();
  if (users.find(u => u.UserName === UserName)) {
    return res.status(409).send('Username already exists');
  }
  users.push({ UserName, Password });
  writeUsers(users);

  // Add default project for new user
  let projects = readProjects();
  projects.push({
    UserName,
    projects: [
      {
        name: "Getting Started",
        type: "Personal",
        priority: "Low",
        description: "Welcome to your first project!",
        tasks: []
      }
    ]
  });
  writeProjects(projects);

  res.send('Registration successful!');
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { UserName, Password } = req.body;
  if (!UserName || !Password) return res.status(400).send('Missing fields');

  let users = readUsers();
  const user = users.find(u => u.UserName === UserName && u.Password === Password);
  if (user) {
    res.send('Login successful!');
  } else {
    res.status(401).send('Invalid credentials');
  }
});

// Route for the landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/Landing_page.html'));
});

// Get all projects for a user
app.get('/api/projects/:username', (req, res) => {
  const { username } = req.params;
  let projects = readProjects();
  const userProjects = projects.find(p => p.UserName === username);
  res.json(userProjects ? userProjects.projects : []);
});

// Add a new project
app.post('/api/projects/:username', (req, res) => {
  const { username } = req.params;
  const { name, type, priority, description } = req.body;
  let projects = readProjects();
  let userProjects = projects.find(p => p.UserName === username);
  if (!userProjects) {
    userProjects = { UserName: username, projects: [] };
    projects.push(userProjects);
  }
  userProjects.projects.push({ name, type, priority, description, tasks: [] });
  writeProjects(projects);
  res.json({ success: true });
});

// Edit a project
app.put('/api/projects/:username/:projIdx', (req, res) => {
  const { username, projIdx } = req.params;
  const { name, type, priority, description } = req.body;
  let projects = readProjects();
  let userProjects = projects.find(p => p.UserName === username);
  if (userProjects && userProjects.projects[projIdx]) {
    userProjects.projects[projIdx].name = name;
    userProjects.projects[projIdx].type = type;
    userProjects.projects[projIdx].priority = priority;
    userProjects.projects[projIdx].description = description;
    writeProjects(projects);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Project not found' });
  }
});

// Delete a project
app.delete('/api/projects/:username/:projIdx', (req, res) => {
  const { username, projIdx } = req.params;
  let projects = readProjects();
  let userProjects = projects.find(p => p.UserName === username);
  if (userProjects && userProjects.projects[projIdx]) {
    userProjects.projects.splice(projIdx, 1);
    writeProjects(projects);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Project not found' });
  }
});

// Add a task to a project (support multiple reminders)
app.post('/api/projects/:username/:projIdx/tasks', (req, res) => {
  const { username, projIdx } = req.params;
  const { title, priority, description, reminders, status } = req.body;
  let projects = readProjects();
  let userProjects = projects.find(p => p.UserName === username);
  if (userProjects && userProjects.projects[projIdx]) {
    userProjects.projects[projIdx].tasks = userProjects.projects[projIdx].tasks || [];
    userProjects.projects[projIdx].tasks.push({
      title,
      priority,
      description,
      reminders: Array.isArray(reminders) ? reminders : (reminders ? [reminders] : []),
      status: status || "Pending"
    });
    writeProjects(projects);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Project not found' });
  }
});

// Edit a task (support multiple reminders)
app.put('/api/projects/:username/:projIdx/tasks/:taskIdx', (req, res) => {
  const { username, projIdx, taskIdx } = req.params;
  const { title, priority, description, reminders, status } = req.body;
  let projects = readProjects();
  let userProjects = projects.find(p => p.UserName === username);
  if (userProjects && userProjects.projects[projIdx] && userProjects.projects[projIdx].tasks[taskIdx]) {
    const task = userProjects.projects[projIdx].tasks[taskIdx];
    task.title = title;
    task.priority = priority;
    task.description = description;
    task.reminders = Array.isArray(reminders) ? reminders : (reminders ? [reminders] : []);
    task.status = status;
    writeProjects(projects);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});

// Change task status (for drag & drop)
app.put('/api/projects/:username/:projIdx/tasks/:taskIdx/status', (req, res) => {
  const { username, projIdx, taskIdx } = req.params;
  const { status } = req.body;
  let projects = readProjects();
  let userProjects = projects.find(p => p.UserName === username);
  if (userProjects && userProjects.projects[projIdx] && userProjects.projects[projIdx].tasks[taskIdx]) {
    userProjects.projects[projIdx].tasks[taskIdx].status = status;
    writeProjects(projects);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});

// Delete a task
app.delete('/api/projects/:username/:projIdx/tasks/:taskIdx', (req, res) => {
  const { username, projIdx, taskIdx } = req.params;
  let projects = readProjects();
  let userProjects = projects.find(p => p.UserName === username);
  if (userProjects && userProjects.projects[projIdx] && userProjects.projects[projIdx].tasks[taskIdx]) {
    userProjects.projects[projIdx].tasks.splice(taskIdx, 1);
    writeProjects(projects);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});

// Helper to get LAN IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, () => {
  const ip = getLocalIP();
  console.log(`Server running at:`);
  console.log(`  http://localhost:${PORT}/`);
  console.log(`  http://${ip}:${PORT}/`);
});