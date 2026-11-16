const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function load() {
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

function save(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function findUserByEmail(email) {
  const db = load();
  return db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
}

function findUserById(id) {
  const db = load();
  return db.users.find((u) => u.id === id);
}

function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.passwordHash);
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function getClientsForUser(user) {
  const db = load();
  if (user.role === 'admin') return db.clients;
  return db.clients.filter((c) => c.ownerId === user.id);
}

function getClientForUser(user, clientId) {
  const clients = getClientsForUser(user);
  return clients.find((c) => c.id === clientId);
}

function ownerName(ownerId) {
  const user = findUserById(ownerId);
  return user ? user.name : ownerId;
}

function getTeamOverview() {
  const db = load();
  return db.users
    .filter((u) => u.role !== 'admin')
    .map((u) => {
      const clients = db.clients.filter((c) => c.ownerId === u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        clientCount: clients.length,
        pendingCount: clients.filter((c) => c.hasPending).length,
        clients: clients.map((c) => ({ id: c.id, name: c.name, initials: c.initials, avatarBg: c.avatarBg, hasPending: c.hasPending })),
      };
    });
}

function getHandoverSummary(employeeId) {
  const db = load();
  const employee = db.users.find((u) => u.id === employeeId);
  if (!employee) return null;

  const clients = db.clients.filter((c) => c.ownerId === employeeId);
  const pendingCount = clients.reduce((sum, c) => sum + c.facts.filter((f) => f.label === 'PENDING' && !/nothing/i.test(f.text)).length, 0);

  return {
    employee: { id: employee.id, name: employee.name, email: employee.email },
    clientCount: clients.length,
    pendingCount,
    generatedAt: new Date().toISOString(),
    clients: clients.map((c) => ({
      id: c.id,
      name: c.name,
      initials: c.initials,
      avatarBg: c.avatarBg,
      phone: c.phone,
      summary: c.summary,
      facts: c.facts,
    })),
  };
}

function updatePassword(userId, newPassword) {
  const db = load();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;
  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  save(db);
  return true;
}

function listUsers() {
  const db = load();
  return db.users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    clientCount: db.clients.filter((c) => c.ownerId === u.id).length,
  }));
}

function slugify(name) {
  return String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'user';
}

function createTeamMember({ name, email, password }) {
  const db = load();
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { error: 'A user with this email already exists.' };
  }
  let id = slugify(name);
  let suffix = 1;
  while (db.users.some((u) => u.id === id)) {
    id = slugify(name) + '-' + (++suffix);
  }
  const user = {
    id,
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'member',
  };
  db.users.push(user);
  save(db);
  return { user: publicUser(user) };
}

function deleteTeamMember(userId) {
  const db = load();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return { error: 'User not found.' };
  if (user.role === 'admin') return { error: 'Cannot remove an admin.' };
  const hasClients = db.clients.some((c) => c.ownerId === userId);
  if (hasClients) return { error: 'Reassign this person\'s clients before removing them.' };
  db.users = db.users.filter((u) => u.id !== userId);
  save(db);
  return { ok: true };
}

function normalizePhone(phone) {
  return String(phone).replace(/[^\d+]/g, '');
}

function findClientByPhone(phone) {
  const db = load();
  const target = normalizePhone(phone);
  return db.clients.find((c) => normalizePhone(c.phone) === target);
}

function createClientFromWhatsapp({ phone, name, ownerId }) {
  const db = load();
  let id = slugify(name || phone);
  let suffix = 1;
  while (db.clients.some((c) => c.id === id)) {
    id = slugify(name || phone) + '-' + (++suffix);
  }
  const palette = ['#1DB954', '#2563EB', '#9333EA', '#DC2626', '#EA580C'];
  const client = {
    id,
    name: name || phone,
    initials: (name || phone).slice(0, 2).toUpperCase(),
    avatarBg: palette[Math.floor(Math.random() * palette.length)],
    phone,
    ownerId,
    lastMessage: '',
    hasPending: false,
    summary: 'No AI summary yet — waiting on the first message.',
    facts: [],
    history: [],
    updatedAt: Date.now(),
  };
  db.clients.push(client);
  save(db);
  return client;
}

function appendMessage(clientId, message) {
  const db = load();
  const client = db.clients.find((c) => c.id === clientId);
  if (!client) return null;
  client.history.push(message);
  client.lastMessage = message.text;
  client.updatedAt = Date.now();
  save(db);
  return client;
}

function seedClients(clients) {
  const db = load();
  const missing = clients.filter((c) => !db.clients.some((x) => x.id === c.id));
  if (missing.length === 0) return 0;
  db.clients.push(...missing);
  save(db);
  return missing.length;
}

function removeClientsById(ids) {
  const db = load();
  const before = db.clients.length;
  db.clients = db.clients.filter((c) => !ids.includes(c.id));
  if (db.clients.length !== before) save(db);
  return before - db.clients.length;
}

function attachAudio(clientId, messageIndex, file) {
  const db = load();
  const message = db.clients.find((c) => c.id === clientId)?.history[messageIndex];
  if (!message || message.audio === file) return false;
  message.audio = file;
  save(db);
  return true;
}

function plain(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function renameClientByName(oldName, newName) {
  const db = load();
  const client = db.clients.find((c) => plain(c.name) === plain(oldName));
  if (!client) return null;
  const previous = client.name;
  client.name = newName;
  client.initials = newName.split(' ').map((w) => w[0]).join('').toUpperCase();
  client.history.forEach((m) => { if (m.from === previous) m.from = newName; });
  save(db);
  return client;
}

function updateClientProfile(clientId, { summary, facts }) {
  const db = load();
  const client = db.clients.find((c) => c.id === clientId);
  if (!client) return null;
  client.summary = summary;
  client.facts = facts;
  client.hasPending = facts.some((f) => f.label === 'PENDING' && !/nothing/i.test(f.text));
  save(db);
  return client;
}

module.exports = {
  updateClientProfile,
  findUserByEmail,
  findUserById,
  verifyPassword,
  publicUser,
  getClientsForUser,
  getClientForUser,
  ownerName,
  getTeamOverview,
  getHandoverSummary,
  updatePassword,
  listUsers,
  createTeamMember,
  deleteTeamMember,
  findClientByPhone,
  createClientFromWhatsapp,
  appendMessage,
  seedClients,
  attachAudio,
  removeClientsById,
  renameClientByName,
};
