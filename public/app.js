const TAG_CLASS = {
  SOLD: 'tag-sold',
  AGREED: 'tag-agreed',
  PENDING: 'tag-pending',
  DEADLINE: 'tag-deadline',
};

const introEl = document.getElementById('intro');
if (introEl) {
  introEl.addEventListener('click', () => {
    introEl.style.animation = 'intro-out 0.3s ease forwards';
  });
}

let clients = [];
let selectedId = null;

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 401) {
    window.location.href = '/login.html';
    throw new Error('Not authenticated');
  }
  if (!res.ok) throw new Error('Request failed: ' + path);
  return res.json();
}

function renderClientList() {
  const list = document.getElementById('client-list');
  list.innerHTML = '';

  clients.forEach((c) => {
    const row = document.createElement('button');
    row.className = 'client-row' + (c.id === selectedId ? ' selected' : '');
    row.type = 'button';
    row.setAttribute('aria-label', 'Open ' + c.name);

    const avatar = document.createElement('div');
    avatar.className = 'avatar avatar-sm';
    avatar.style.background = c.avatarBg;
    avatar.textContent = c.initials;

    const info = document.createElement('div');
    info.className = 'client-info';
    const name = document.createElement('div');
    name.className = 'client-name';
    name.textContent = c.name;
    const last = document.createElement('div');
    last.className = 'client-last';
    last.textContent = c.lastMessage;
    info.append(name, last);

    row.append(avatar, info);

    if (c.hasPending) {
      const dot = document.createElement('div');
      dot.className = 'pending-dot';
      dot.setAttribute('aria-label', 'Has open items');
      row.append(dot);
    }

    row.addEventListener('click', () => selectClient(c.id));

    list.append(row);
  });
}

async function selectClient(id) {
  selectedId = id;
  renderClientList();

  const main = document.querySelector('.main');
  main.classList.add('content-fade-out');

  const { client } = await api('/api/clients/' + id);

  setTimeout(() => {
    renderProfile(client);
    main.classList.remove('content-fade-out');
  }, 140);
}

function renderProfile(c) {
  const avatar = document.getElementById('profile-avatar');
  avatar.style.background = c.avatarBg;
  avatar.textContent = c.initials;

  document.getElementById('profile-name').textContent = c.name;
  document.getElementById('profile-meta').textContent = c.phone + ' · owned by ' + c.ownerName;
  document.getElementById('profile-summary').textContent = c.summary;

  const facts = document.getElementById('profile-facts');
  facts.innerHTML = '';
  c.facts.forEach((f) => {
    const row = document.createElement('div');
    row.className = 'fact-row';

    const tag = document.createElement('div');
    tag.className = 'tag ' + (TAG_CLASS[f.label] || '');
    tag.textContent = f.label;

    const text = document.createElement('div');
    text.className = 'fact-text';
    text.textContent = f.text;

    row.append(tag, text);
    facts.append(row);
  });

  const history = document.getElementById('profile-history');
  history.innerHTML = '';
  c.history.forEach((m) => {
    const row = document.createElement('div');
    row.className = 'history-row';

    const time = document.createElement('div');
    time.className = 'history-time';
    time.textContent = m.time;

    const bubble = document.createElement('div');
    bubble.className = 'history-bubble';
    const from = document.createElement('div');
    from.className = 'history-from';
    from.textContent = m.from;
    const text = document.createElement('div');
    text.className = 'history-text';
    text.textContent = m.text;
    bubble.append(from, text);

    row.append(time, bubble);
    history.append(row);
  });
}

async function init() {
  const { user } = await api('/api/me');
  document.getElementById('user-name').textContent = user.name;

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await api('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });

  const data = await api('/api/clients');
  clients = data.clients;
  renderClientList();

  if (clients.length > 0) {
    selectClient(clients[0].id);
  }
}

init().catch((err) => console.error(err));
