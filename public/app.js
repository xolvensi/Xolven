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
let clientSearchQuery = '';

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
  const empty = document.getElementById('client-empty');
  list.innerHTML = '';

  const query = clientSearchQuery.trim().toLowerCase();
  const filtered = query ? clients.filter((c) => c.name.toLowerCase().includes(query)) : clients;

  empty.hidden = filtered.length > 0;

  filtered.forEach((c) => {
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
  if (view === 'demo') runDemo();
}

// ---- Live Demo (simulated — no real client data, for showing stakeholders how the pipeline works) ----

const DEMO_SCRIPT = {
  client: { name: 'Olivia Bennett', initials: 'OB', avatarBg: '#1DB954', phone: '+1 512 555 0164', owner: 'Carlos R.' },
  messages: [
    { from: 'client', type: 'text', time: '10:02 AM', text: "Hi! Just checking in — how's the project coming along on your end?" },
    { from: 'agent', type: 'text', time: '10:03 AM', text: 'Hey Olivia! Good timing, we just wrapped up the second design round.' },
    { from: 'client', type: 'voice', time: '10:05 AM', duration: '0:34', transcript: 'Great, thanks for the update. Quick question — are we still on track to launch by November 30th?' },
    { from: 'agent', type: 'text', time: '10:07 AM', text: "Yes, still on track. You'll have everything ready before November 30th." },
  ],
  steps: [
    { label: 'New WhatsApp message received', detail: 'Incoming message from Olivia Bennett' },
    { label: 'Transcribing voice note', detail: 'Converting 34s audio clip to text' },
    { label: 'Reading full conversation', detail: 'Pulling conversation history for context' },
    { label: 'Analyzing with AI', detail: 'Extracting agreements, pending items and deadlines' },
    { label: 'Updating client profile', detail: 'Saving structured summary — nothing is invented' },
  ],
  summary: 'Working with this client since the website redesign project kicked off. Responsive and easy to coordinate with — the only thing to track is the November 30th launch date she confirmed in her last message.',
  facts: [
    { label: 'SOLD', text: 'Website redesign project, full build and launch.' },
    { label: 'AGREED', text: 'Second design round approved, moving into development.' },
    { label: 'PENDING', text: 'Nothing open right now.' },
    { label: 'DEADLINE', text: 'Project delivery due November 30, 2026.' },
  ],
  qa: {
    question: "When is this client's project due?",
    answer: 'Olivia was told the project would be delivered by November 30, 2026 — she confirmed that date in her last message.',
  },
};

let demoRunning = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setDemoStep(index, state) {
  const steps = document.querySelectorAll('#demo-pipeline .demo-step');
  const el = steps[index];
  if (!el) return;
  el.classList.remove('active', 'done');
  if (state) el.classList.add(state);
  const icon = el.querySelector('.demo-step-icon');
  icon.textContent = state === 'done' ? '✓' : '';
}

async function runDemo() {
  if (demoRunning) return;
  demoRunning = true;

  const replayBtn = document.getElementById('demo-replay-btn');
  replayBtn.disabled = true;

  const chat = document.getElementById('demo-chat');
  const pipeline = document.getElementById('demo-pipeline');
  const profileCard = document.getElementById('demo-profile-card');
  const askCard = document.getElementById('demo-ask-card');

  chat.innerHTML = '';
  profileCard.hidden = true;
  askCard.hidden = true;
  document.getElementById('demo-ask-question').textContent = '';
  document.getElementById('demo-ask-answer').textContent = '';
  document.getElementById('demo-ask-answer-row').hidden = true;

  pipeline.innerHTML = '';
  DEMO_SCRIPT.steps.forEach((step) => {
    const row = document.createElement('div');
    row.className = 'demo-step';
    row.innerHTML =
      '<div class="demo-step-icon"></div>' +
      '<div><div class="demo-step-label">' + step.label + '</div><div class="demo-step-detail">' + step.detail + '</div></div>';
    pipeline.append(row);
  });

  await sleep(400);

  for (let i = 0; i < DEMO_SCRIPT.messages.length; i++) {
    const msg = DEMO_SCRIPT.messages[i];

    const typing = document.createElement('div');
    typing.className = 'demo-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    chat.append(typing);
    chat.scrollTop = chat.scrollHeight;
    await sleep(500);
    typing.remove();

    const row = document.createElement('div');
    row.className = 'demo-msg ' + msg.from;

    if (msg.type === 'voice') {
      row.innerHTML =
        '<div class="demo-bubble demo-voice-bubble">' +
        '<div class="demo-voice-icon">▶</div>' +
        '<div class="demo-voice-wave"><span></span><span></span><span></span><span></span><span></span><span></span></div>' +
        '<span class="demo-voice-duration">' + msg.duration + '</span>' +
        '</div>';
    } else {
      row.innerHTML = '<div class="demo-bubble">' + msg.text + '<span class="demo-bubble-time">' + msg.time + '</span></div>';
    }
    chat.append(row);
    chat.scrollTop = chat.scrollHeight;

    if (msg.from === 'client' && i === 0) setDemoStep(0, 'active');

    if (msg.type === 'voice') {
      setDemoStep(1, 'active');
      await sleep(900);
      const transcript = document.createElement('div');
      transcript.className = 'demo-transcript';
      transcript.textContent = '"' + msg.transcript + '"';
      row.querySelector('.demo-bubble').after(transcript);
      setDemoStep(1, 'done');
      setDemoStep(0, 'done');
      chat.scrollTop = chat.scrollHeight;
    }

    await sleep(600);
  }

  setDemoStep(0, 'done');
  setDemoStep(1, 'done');
  setDemoStep(2, 'active');
  await sleep(800);
  setDemoStep(2, 'done');

  setDemoStep(3, 'active');
  await sleep(1100);
  setDemoStep(3, 'done');

  setDemoStep(4, 'active');
  await sleep(700);
  setDemoStep(4, 'done');

  const c = DEMO_SCRIPT.client;
  document.getElementById('demo-profile-avatar').style.background = c.avatarBg;
  document.getElementById('demo-profile-avatar').textContent = c.initials;
  document.getElementById('demo-profile-name').textContent = c.name;
  document.getElementById('demo-profile-meta').textContent = c.phone + ' · owned by ' + c.owner;
  document.getElementById('demo-profile-summary').textContent = DEMO_SCRIPT.summary;

  const facts = document.getElementById('demo-profile-facts');
  facts.innerHTML = '';
  profileCard.hidden = false;

  for (const f of DEMO_SCRIPT.facts) {
    const row = document.createElement('div');
    row.className = 'fact-row demo-msg client';
    const tag = document.createElement('div');
    tag.className = 'tag ' + (TAG_CLASS[f.label] || '');
    tag.textContent = f.label;
    const text = document.createElement('div');
    text.className = 'fact-text';
    text.textContent = f.text;
    row.append(tag, text);
    facts.append(row);
    await sleep(220);
  }

  await sleep(600);
  await runAskXolven();

  replayBtn.disabled = false;
  demoRunning = false;
}

async function runAskXolven() {
  const askCard = document.getElementById('demo-ask-card');
  const qEl = document.getElementById('demo-ask-question');
  const answerRow = document.getElementById('demo-ask-answer-row');
  const aEl = document.getElementById('demo-ask-answer');

  askCard.hidden = false;
  askCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const question = DEMO_SCRIPT.qa.question;
  for (let i = 0; i < question.length; i++) {
    qEl.textContent += question[i];
    await sleep(20);
  }

  await sleep(500);
  answerRow.hidden = false;
  aEl.innerHTML = '<div class="demo-typing" style="opacity:1;"><span></span><span></span><span></span></div>';
  await sleep(1000);
  aEl.textContent = DEMO_SCRIPT.qa.answer;
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

  document.getElementById('client-search').addEventListener('input', (e) => {
    clientSearchQuery = e.target.value;
    renderClientList();
  });

  document.getElementById('demo-replay-btn').addEventListener('click', () => {
    runDemo();
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
