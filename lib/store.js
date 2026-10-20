const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function load() {
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw);
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

module.exports = {
  findUserByEmail,
  findUserById,
  verifyPassword,
  publicUser,
  getClientsForUser,
  getClientForUser,
  ownerName,
};
