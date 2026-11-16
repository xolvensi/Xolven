const fs = require('fs');
const os = require('os');
const path = require('path');
const pino = require('pino');

const store = require('./store');
const ai = require('./ai');
const deepgram = require('./deepgram');
const media = require('./media');
const seed = require('./seed');

const LEGACY_AUTH_DIR = path.join(__dirname, '..', 'whatsapp-auth');

// A deploy rebuilds the app folder, so the session lives in the user's home
// folder instead and is copied there once from the old location.
function resolveAuthDir() {
  if (process.env.WHATSAPP_AUTH_DIR) return process.env.WHATSAPP_AUTH_DIR;
  const persistent = path.join(os.homedir(), '.xolven', 'whatsapp-auth');
  try {
    fs.mkdirSync(persistent, { recursive: true });
    fs.accessSync(persistent, fs.constants.W_OK);
  } catch (err) {
    return LEGACY_AUTH_DIR;
  }
  const hasSession = fs.existsSync(path.join(persistent, 'creds.json'));
  if (!hasSession && fs.existsSync(path.join(LEGACY_AUTH_DIR, 'creds.json'))) {
    fs.cpSync(LEGACY_AUTH_DIR, persistent, { recursive: true });
    log('Copied the existing session to', persistent);
  }
  return persistent;
}

let AUTH_DIR = null;
const OWNER_ID = process.env.WHATSAPP_OWNER_ID || 'carlos';

const state = { status: 'disabled', qr: null, lastError: null };
let onQr = null;

function log(...args) {
  console.log('[WA]', ...args);
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function jidToPhone(jid) {
  return '+' + jid.split('@')[0].split(':')[0];
}

// WhatsApp may address a chat by an opaque "lid" instead of the phone number;
// the real number, when known, comes in remoteJidAlt.
function phonesFromKey(key) {
  const jids = [key.remoteJid, key.remoteJidAlt].filter(Boolean);
  const pn = jids.find((j) => j.endsWith('@s.whatsapp.net'));
  const ordered = pn ? [pn, ...jids.filter((j) => j !== pn)] : jids;
  return ordered.map(jidToPhone);
}

async function saveIncoming(phones, name, text, audio) {
  let client = phones.map((p) => store.findClientByPhone(p)).find(Boolean);
  if (!client) {
    client = store.createClientFromWhatsapp({ phone: phones[0], name: seed.aliasName(name), ownerId: OWNER_ID });
    log('New client created:', client.name);
  }

  const message = { time: formatTime(new Date()), from: client.name, text };
  if (audio) message.audio = audio;
  const updated = store.appendMessage(client.id, message);
  log('Message stored for', client.name);

  try {
    const profile = await ai.generateClientProfile(updated);
    store.updateClientProfile(client.id, profile);
    log('Profile updated for', client.name);
  } catch (err) {
    console.error('[WA] AI profile update failed:', err.message);
  }
}

async function connect() {
  const baileys = await import('@whiskeysockets/baileys');
  const makeWASocket = baileys.makeWASocket || baileys.default;
  const { useMultiFileAuthState, downloadMediaMessage, DisconnectReason } = baileys;

  AUTH_DIR = AUTH_DIR || resolveAuthDir();
  log('Session folder:', AUTH_DIR);
  const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const sock = makeWASocket({ auth: authState, logger: pino({ level: 'silent' }) });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      state.status = 'qr';
      state.qr = qr;
      if (onQr) onQr(qr);
    }

    if (connection === 'open') {
      state.status = 'connected';
      state.qr = null;
      state.lastError = null;
      log('Connected. Waiting for messages.');
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      state.qr = null;
      // Another process (e.g. the new deploy) took over this session: step aside
      // instead of fighting it for the connection.
      if (code === DisconnectReason.connectionReplaced) {
        state.status = 'error';
        state.lastError = 'Session opened by another instance';
        log('Session taken over by another instance. This one stops.');
        return;
      }
      state.status = 'connecting';
      if (loggedOut) {
        log('Session logged out. Clearing it so a new QR can be scanned.');
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }
      setTimeout(() => start(), 2000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const jid = msg.key.remoteJid;
      if (!jid || jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) continue;

      const phones = phonesFromKey(msg.key);
      const name = msg.pushName || phones[0];

      try {
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (text) {
          await saveIncoming(phones, name, text);
        } else if (msg.message.audioMessage) {
          log('Voice note received, transcribing...');
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          const transcript = await deepgram.transcribeAudio(buffer, msg.message.audioMessage.mimetype);
          const audioFile = media.saveAudio(buffer);
          await saveIncoming(phones, name, 'Voice note transcript: ' + transcript, audioFile);
        }
      } catch (err) {
        console.error('[WA] Error handling message:', err.message);
      }
    }
  });
}

async function start(options = {}) {
  if (options.onQr) onQr = options.onQr;
  state.status = 'connecting';
  try {
    await connect();
  } catch (err) {
    state.status = 'error';
    state.lastError = err.message;
    console.error('[WA] Could not start:', err.message);
  }
}

function getStatus() {
  return { status: state.status, qr: state.qr, lastError: state.lastError };
}

module.exports = { start, getStatus, resolveAuthDir };
