const form = document.getElementById('login-form');
const errorBox = document.getElementById('login-error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.hidden = true;

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      errorBox.textContent = data.error || 'Could not sign in. Try again.';
      errorBox.hidden = false;
      return;
    }

    window.location.href = '/';
  } catch (err) {
    errorBox.textContent = 'Network error. Try again.';
    errorBox.hidden = false;
  }
});
