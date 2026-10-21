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

module.exports = {
  findUserByEmail,
  findUserById,
  verifyPassword,
  publicUser,
  getClientsForUser,
  getClientForUser,
  ownerName,
  getTeamOverview,
  getHandoverSummary,
};
