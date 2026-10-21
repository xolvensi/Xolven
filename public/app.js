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
let currentUser = null;
let teamData = null;

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

function switchView(view) {
  document.querySelectorAll('.view').forEach((el) => { el.hidden = el.id !== 'view-' + view; });
  document.getElementById('client-list-wrap').hidden = view !== 'clients';
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.view === view);
  });

  if (view === 'team' && currentUser.role === 'admin') loadTeam();
  if (view === 'handover' && currentUser.role === 'admin') loadHandoverOptions();
  if (view === 'settings') renderSettings();
}

function renderSettings() {
  document.getElementById('settings-name').textContent = currentUser.name;
  document.getElementById('settings-email').textContent = currentUser.email;
  document.getElementById('settings-role').textContent = currentUser.role === 'admin' ? 'Admin' : 'Team member';

  if (currentUser.role === 'admin') {
    document.getElementById('team-manage-card').hidden = false;
    loadUserList();
  }
}

async function loadUserList() {
  const { users } = await api('/api/users');
  const list = document.getElementById('team-manage-list');
  list.innerHTML = '';

  users.filter((u) => u.role !== 'admin').forEach((u) => {
    const row = document.createElement('div');
    row.className = 'settings-user-item';

    const info = document.createElement('div');
    info.className = 'settings-user-info';
    const name = document.createElement('span');
    name.className = 'settings-user-name';
    name.textContent = u.name;
    const email = document.createElement('span');
    email.className = 'settings-user-email';
    email.textContent = u.email + ' · ' + u.clientCount + ' client' + (u.clientCount === 1 ? '' : 's');
    info.append(name, email);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'settings-user-remove';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', async () => {
      try {
        await api('/api/users/' + u.id, { method: 'DELETE' });
        teamData = null;
        loadUserList();
      } catch (err) {
        alert('Could not remove this team member.');
      }
    });

    row.append(info, removeBtn);
    list.append(row);
  });

  if (users.filter((u) => u.role !== 'admin').length === 0) {
    list.innerHTML = '<div class="handover-empty">No team members yet.</div>';
  }
}

function initSettingsForms() {
  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById('password-error');
    const successBox = document.getElementById('password-success');
    errorBox.hidden = true;
    successBox.hidden = true;

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
      errorBox.textContent = 'New passwords do not match.';
      errorBox.hidden = false;
      return;
    }

    try {
      const res = await fetch('/api/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        errorBox.textContent = data.error || 'Could not update password.';
        errorBox.hidden = false;
        return;
      }
      successBox.hidden = false;
      e.target.reset();
    } catch (err) {
      errorBox.textContent = 'Network error. Try again.';
      errorBox.hidden = false;
    }
  });

  document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById('add-user-error');
    errorBox.hidden = true;

    const name = document.getElementById('new-user-name').value.trim();
    const email = document.getElementById('new-user-email').value.trim();
    const password = document.getElementById('new-user-password').value;

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        errorBox.textContent = data.error || 'Could not add team member.';
        errorBox.hidden = false;
        return;
      }
      e.target.reset();
      teamData = null;
      loadUserList();
    } catch (err) {
      errorBox.textContent = 'Network error. Try again.';
      errorBox.hidden = false;
    }
  });
}

async function loadTeam() {
  if (!teamData) {
    const data = await api('/api/team');
    teamData = data.team;
  }
  renderTeam(teamData);
}

function renderTeam(team) {
  const grid = document.getElementById('team-grid');
  grid.innerHTML = '';

  team.forEach((member) => {
    const card = document.createElement('div');
    card.className = 'team-card';

    const head = document.createElement('div');
    head.className = 'team-card-head';
    const avatar = document.createElement('div');
    avatar.className = 'avatar avatar-sm';
    avatar.style.background = '#1DB954';
    avatar.textContent = member.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
    const nameWrap = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'team-card-name';
    name.textContent = member.name;
    const email = document.createElement('p');
    email.className = 'team-card-email';
    email.textContent = member.email;
    nameWrap.append(name, email);
    head.append(avatar, nameWrap);

    const stats = document.createElement('div');
    stats.className = 'team-card-stats';
    stats.innerHTML =
      '<div class="team-stat"><span class="team-stat-num">' + member.clientCount + '</span><span class="team-stat-label">Clients</span></div>' +
      '<div class="team-stat"><span class="team-stat-num">' + member.pendingCount + '</span><span class="team-stat-label">Pending</span></div>';

    const chips = document.createElement('div');
    chips.className = 'team-client-chips';
    member.clients.forEach((c) => {
      const chip = document.createElement('div');
      chip.className = 'team-chip' + (c.hasPending ? ' has-pending' : '');
      const chipAvatar = document.createElement('div');
      chipAvatar.className = 'avatar';
      chipAvatar.style.background = c.avatarBg;
      chipAvatar.textContent = c.initials;
      const chipName = document.createElement('span');
      chipName.textContent = c.name;
      chip.append(chipAvatar, chipName);
      chips.append(chip);
    });

    card.append(head, stats, chips);
    grid.append(card);
  });
}

async function loadHandoverOptions() {
  if (!teamData) {
    const data = await api('/api/team');
    teamData = data.team;
  }
  const select = document.getElementById('handover-select');
  if (select.options.length <= 1) {
    teamData.forEach((member) => {
      const opt = document.createElement('option');
      opt.value = member.id;
      opt.textContent = member.name + ' (' + member.clientCount + ' client' + (member.clientCount === 1 ? '' : 's') + ')';
      select.append(opt);
    });
  }
}

async function renderHandover(employeeId) {
  const result = document.getElementById('handover-result');
  if (!employeeId) {
    result.innerHTML = '';
    return;
  }

  result.innerHTML = '<div class="handover-empty">Generating summary…</div>';
  const { handover } = await api('/api/handover/' + employeeId);

  result.innerHTML = '';

  const headCard = document.createElement('div');
  headCard.className = 'card';
  headCard.innerHTML =
    '<div class="handover-summary-head"><div class="card-label accent">Executive summary</div></div>' +
    '<p class="summary-text">' + handover.employee.name + ' manages ' + handover.clientCount + ' client' + (handover.clientCount === 1 ? '' : 's') +
    ', with ' + handover.pendingCount + ' open item' + (handover.pendingCount === 1 ? '' : 's') + ' pending across all of them. ' +
    'Review each client below before reassigning.</p>';
  result.append(headCard);

  if (handover.clients.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.innerHTML = '<div class="handover-empty">No clients assigned to this team member.</div>';
    result.append(empty);
    return;
  }

  handover.clients.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'card handover-client-card';

    const title = document.createElement('p');
    title.className = 'handover-client-name';
    title.textContent = c.name;
    const phone = document.createElement('p');
    phone.className = 'handover-client-phone';
    phone.textContent = c.phone;

    const summary = document.createElement('p');
    summary.className = 'summary-text';
    summary.style.marginBottom = '12px';
    summary.textContent = c.summary;

    const facts = document.createElement('div');
    facts.className = 'facts-list';
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

    card.append(title, phone, summary, facts);
    result.append(card);
  });
}

function initNav() {
  document.querySelectorAll('.nav-link[data-view]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(link.dataset.view);
    });
  });

  document.getElementById('handover-select').addEventListener('change', (e) => {
    renderHandover(e.target.value);
  });

  document.getElementById('generate-handover-btn').addEventListener('click', () => {
    switchView('handover');
  });
}

async function init() {
  const { user } = await api('/api/me');
  currentUser = user;
  document.getElementById('user-name').textContent = user.name;

  if (user.role === 'admin') {
    document.getElementById('nav-team').hidden = false;
    document.getElementById('nav-handover').hidden = false;
  }

  initNav();
  initSettingsForms();

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
