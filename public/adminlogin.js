/* -------------------------------------------------
   adminlogin.js – Minimal secure login (no 👁️ toggle)
   -------------------------------------------------
   • Attempts POST /verify-admin for JSON { success:true }.
   • Falls back to SHA‑256 hash comparison when offline.
   • On success → sets localStorage flags + redirects to admin.html.
-------------------------------------------------*/

const VERIFY_ENDPOINT = '/verify-admin'; // adjust when backend is ready
// SHA‑256("admin123")
const LOCAL_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

/* ---------- SHA‑256 helper ---------- */
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const form      = document.getElementById('adminLoginForm');
  const pwInput   = document.getElementById('adminPassword');
  const errorBox  = document.getElementById('loginError');
  const submitBtn = form.querySelector('button[type="submit"]');

  const showErr = msg => { errorBox.textContent = msg; errorBox.style.display = 'block'; };
  const hideErr = ()  => { errorBox.style.display = 'none'; };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideErr();

    const pwd = pwInput.value.trim();
    if (!pwd) {
      showErr('⚠️ Please enter the password.');
      return;
    }

    // UI lock
    submitBtn.disabled = true;
    pwInput.disabled   = true;
    submitBtn.textContent = 'Logging in…';

    let verified = false;

    /* 1. Try backend */
    try {
      const res = await fetch(VERIFY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      });
      if (res.ok) {
        const { success } = await res.json().catch(() => ({ success: false }));
        verified = !!success;
      }
    } catch (err) {
      console.warn('Backend unreachable:', err);
    }

    /* 2. Fallback to local hash */
    if (!verified) {
      try {
        const hash = await sha256(pwd);
        verified = (hash === LOCAL_HASH);
      } catch (err) {
        console.error('Hash error:', err);
      }
    }

    if (verified) {
      localStorage.setItem('adminAuthenticated', 'true');
      localStorage.setItem('adminKey', pwd);
      window.location.href = 'admin.html';
    } else {
      showErr('❌ Incorrect password. Try again.');
    }

    // reset UI state
    submitBtn.disabled = false;
    pwInput.disabled   = false;
    pwInput.value      = '';
    submitBtn.textContent = 'Login';
  });
});
