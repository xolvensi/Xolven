const express = require('express');
const session = require('express-session');
const path = require('path');
const store = require('./lib/store');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'xolven-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8,
  },
}));

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not authenticated' });
    return res.redirect('/login.html');
  }
  next();
}

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = email && store.findUserByEmail(email);
  if (!user || !store.verifyPassword(user, password || '')) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  req.session.userId = user.id;
  res.json({ user: store.publicUser(user) });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', requireAuth, (req, res) => {
  const user = store.findUserById(req.session.userId);
  res.json({ user: store.publicUser(user) });
});

app.get('/api/clients', requireAuth, (req, res) => {
  const user = store.findUserById(req.session.userId);
  const clients = store.getClientsForUser(user).map((c) => ({
    id: c.id,
    name: c.name,
    initials: c.initials,
    avatarBg: c.avatarBg,
    lastMessage: c.lastMessage,
    hasPending: c.hasPending,
  }));
  res.json({ clients });
});

app.get('/api/clients/:id', requireAuth, (req, res) => {
  const user = store.findUserById(req.session.userId);
  const client = store.getClientForUser(user, req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json({ client: { ...client, ownerName: store.ownerName(client.ownerId) } });
});

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index.html', (req, res) => res.redirect('/'));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Xolven.Si backend listening on port ${PORT}`);
});
