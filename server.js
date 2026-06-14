const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'myhub-secret-key-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 }
}));

// ---------- DB helpers ----------
function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { apps: [], tools: [], projects: [], subscribers: [], messages: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data || '{}');
}
function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ---------- Admin credentials ----------
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kajal@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'kajal';

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect('/admin');
}

// ---------- Public Pages ----------
app.get('/', (req, res) => {
  const db = readDB();
  res.render('index', {
    trendingTools: db.tools.slice(-5).reverse(),
    trendingApps: db.apps.slice(-5).reverse(),
    trendingProjects: db.projects.slice(-5).reverse(),
    page: 'home'
  });
});

app.get('/tools', (req, res) => {
  const db = readDB();
  res.render('tools', { tools: db.tools, page: 'tools' });
});

app.get('/tools/:id', (req, res) => {
  const db = readDB();
  const tool = db.tools.find(t => t.id === req.params.id);
  if (!tool) return res.status(404).render('404', { page: '' });
  res.render('tool-detail', { tool, page: 'tools' });
});

app.get('/apps', (req, res) => {
  const db = readDB();
  res.render('apps', { apps: db.apps, page: 'apps' });
});

app.get('/projects', (req, res) => {
  const db = readDB();
  res.render('projects', { projects: db.projects, page: 'projects' });
});

app.get('/about', (req, res) => res.render('about', { page: 'about' }));
app.get('/privacy-policy', (req, res) => res.render('privacy', { page: 'privacy' }));
app.get('/terms', (req, res) => res.render('terms', { page: 'terms' }));
app.get('/disclaimer', (req, res) => res.render('disclaimer', { page: 'disclaimer' }));

app.get('/contact', (req, res) => res.render('contact', { page: 'contact', sent: false }));
app.post('/contact', (req, res) => {
  const db = readDB();
  const { name, email, message } = req.body;
  db.messages.push({ id: randomUUID(), name, email, message, date: new Date().toISOString() });
  writeDB(db);
  res.render('contact', { page: 'contact', sent: true });
});

// ---------- Search ----------
app.get('/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  const db = readDB();
  const filterFn = item => item.name && item.name.toLowerCase().includes(q);
  const results = {
    tools: q ? db.tools.filter(filterFn) : [],
    apps: q ? db.apps.filter(filterFn) : [],
    projects: q ? db.projects.filter(filterFn) : []
  };
  res.render('search', { q, results, page: 'search' });
});

// ---------- Subscribe ----------
app.post('/subscribe', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email required' });
  const db = readDB();
  db.subscribers.push({ id: randomUUID(), name, email, date: new Date().toISOString() });
  writeDB(db);
  res.json({ success: true, message: 'Thanks for subscribing!' });
});

// ---------- Direct Download Proxy ----------
// Forces a "Save File" download instead of opening raw GitHub URL in browser
app.get('/download', (req, res) => {
  const fileUrl = req.query.url;
  if (!fileUrl) return res.status(400).send('Missing url');

  let parsed;
  try {
    parsed = new URL(fileUrl);
  } catch (e) {
    return res.status(400).send('Invalid url');
  }

  const client = parsed.protocol === 'http:' ? http : https;
  const filename = decodeURIComponent(parsed.pathname.split('/').pop() || 'download');

  const request = client.get(fileUrl, (fileRes) => {
    // Follow redirects (GitHub raw often redirects to githubusercontent CDN)
    if ([301, 302, 303, 307, 308].includes(fileRes.statusCode) && fileRes.headers.location) {
      fileRes.resume();
      return res.redirect('/download?url=' + encodeURIComponent(fileRes.headers.location));
    }
    if (fileRes.statusCode !== 200) {
      fileRes.resume();
      return res.status(fileRes.statusCode).send('Failed to fetch file');
    }
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', fileRes.headers['content-type'] || 'application/octet-stream');
    if (fileRes.headers['content-length']) {
      res.setHeader('Content-Length', fileRes.headers['content-length']);
    }
    fileRes.pipe(res);
  });

  request.on('error', () => {
    if (!res.headersSent) res.status(500).send('Download failed');
  });
});

// ---------- Admin ----------
app.get('/admin', (req, res) => {
  if (req.session && req.session.isAdmin) return res.redirect('/admin/dashboard');
  res.render('admin/login', { error: null, page: 'admin' });
});

app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', { error: 'Invalid email or password', page: 'admin' });
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin'));
});

app.get('/admin/dashboard', requireAuth, (req, res) => {
  const db = readDB();
  res.render('admin/dashboard', {
    apps: db.apps, tools: db.tools, projects: db.projects, page: 'admin'
  });
});

// Add App
app.post('/admin/add-app', requireAuth, (req, res) => {
  const { name, img, downloadLink } = req.body;
  const db = readDB();
  db.apps.push({ id: randomUUID(), name, img, downloadLink });
  writeDB(db);
  res.redirect('/admin/dashboard');
});

// Add Tool
app.post('/admin/add-tool', requireAuth, (req, res) => {
  const { name, img, description, videoUrl } = req.body;
  let commands = req.body.commands;
  if (!commands) commands = [];
  if (!Array.isArray(commands)) commands = [commands];
  commands = commands.filter(c => c && c.trim());
  const db = readDB();
  db.tools.push({ id: randomUUID(), name, img, description, commands, videoUrl });
  writeDB(db);
  res.redirect('/admin/dashboard');
});

// Add Project
app.post('/admin/add-project', requireAuth, (req, res) => {
  const { name, img, downloadLink, liveLink, sourceLink } = req.body;
  const db = readDB();
  db.projects.push({ id: randomUUID(), name, img, downloadLink, liveLink, sourceLink });
  writeDB(db);
  res.redirect('/admin/dashboard');
});

// Delete routes
app.post('/admin/delete-app/:id', requireAuth, (req, res) => {
  const db = readDB();
  db.apps = db.apps.filter(a => a.id !== req.params.id);
  writeDB(db);
  res.redirect('/admin/dashboard');
});
app.post('/admin/delete-tool/:id', requireAuth, (req, res) => {
  const db = readDB();
  db.tools = db.tools.filter(t => t.id !== req.params.id);
  writeDB(db);
  res.redirect('/admin/dashboard');
});
app.post('/admin/delete-project/:id', requireAuth, (req, res) => {
  const db = readDB();
  db.projects = db.projects.filter(p => p.id !== req.params.id);
  writeDB(db);
  res.redirect('/admin/dashboard');
});

// 404
app.use((req, res) => res.status(404).render('404', { page: '' }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
