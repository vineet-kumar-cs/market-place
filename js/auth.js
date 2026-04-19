// ============================================================
// js/auth.js — Authentication Logic (Supabase Auth)
// ============================================================

// ============================================================
// CHECK SESSION — Call this on every page load
// Returns: user object or null
// ============================================================
async function getSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session ? session.user : null;
}

// ============================================================
// SIGN UP — Creates new user with email + password
// ============================================================
async function signUp(email, password, name = '') {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { name } // Store name in user metadata
    }
  });

  if (error) throw error;

  // Create profile in profiles table
  if (data.user) {
    await supabaseClient.from('profiles').upsert({
      id: data.user.id,
      name: name || '',
      email: email,
      created_at: new Date().toISOString()
    });
  }

  return data;
}

// ============================================================
// SIGN IN — Login with email + password
// ============================================================
async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

// ============================================================
// SIGN OUT — Logout current user
// ============================================================
async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
  window.location.href = 'index.html';
}

// ============================================================
// GET USER PROFILE from profiles table
// ============================================================
async function getUserProfile(userId) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ============================================================
// UPDATE USER PROFILE (name, phone, email)
// ============================================================
async function updateUserProfile(userId, updates) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// UPDATE USER PASSWORD
// ============================================================
async function updateUserPassword(newPassword) {
  const { data, error } = await supabaseClient.auth.updateUser({
    password: newPassword
  });

  if (error) throw error;
  return data;
}

// ============================================================
// UPDATE USER EMAIL
// ============================================================
async function updateUserEmail(newEmail) {
  const { data, error } = await supabaseClient.auth.updateUser({
    email: newEmail
  });

  if (error) throw error;
  return data;
}

// ============================================================
// REQUIRE AUTH — Redirect to login if not logged in
// Call this on protected pages (dashboard, add-product, etc.)
// ============================================================
async function requireAuth(redirectUrl = 'login.html') {
  const user = await getSession();
  if (!user) {
    window.location.href = redirectUrl;
    return null;
  }
  return user;
}

// ============================================================
// UPDATE NAVBAR based on auth state
// ============================================================
async function updateNavbar() {
  const user = await getSession();
  const navActions = document.getElementById('nav-actions');
  if (!navActions) return;

  if (user) {
    const profile = await getUserProfile(user.id);
    const name = profile?.name || user.email;
    const initials = getInitials(name);

    navActions.innerHTML = `
      <div class="navbar-user">
        <a href="wishllist.html" class="btn btn-outline btn-sm">❤️ Wishlist</a>
        <a href="dashboard.html" class="nav-user-info" style="color:rgba(255,255,255,0.85);">
          <div class="nav-avatar">${initials}</div>
          <span style="display:none" id="nav-username">${name}</span>
        </a>
        <a href="dashboard.html" class="btn btn-outline btn-sm">Dashboard</a>
        <button onclick="signOut()" class="btn btn-primary btn-sm">Logout</button>
      </div>
    `;
  } else {
    navActions.innerHTML = `
      <a href="wishllist.html" class="btn btn-outline btn-sm">❤️ Wishlist</a>
      <a href="login.html" class="btn btn-outline btn-sm">Login</a>
      <a href="signup.html" class="btn btn-primary btn-sm">Sign Up</a>
    `;
  }
}

// ============================================================
// SIGNUP PAGE LOGIC
// ============================================================
function initSignupPage() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  // Redirect if already logged in
  getSession().then(user => {
    if (user) window.location.href = 'index.html';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('signup-btn');
    const alertEl = document.getElementById('signup-alert');

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm-password').value;

    // Validation
    if (password !== confirm) {
      alertEl.className = 'alert alert-error';
      alertEl.innerHTML = '❌ Passwords do not match.';
      alertEl.classList.remove('hidden');
      return;
    }

    if (password.length < 6) {
      alertEl.className = 'alert alert-error';
      alertEl.innerHTML = '❌ Password must be at least 6 characters.';
      alertEl.classList.remove('hidden');
      return;
    }

    alertEl.classList.add('hidden');
    setLoading(btn, true);

    try {
      await signUp(email, password, name);
      alertEl.className = 'alert alert-success';
      alertEl.innerHTML = '✅ Account created! Please check your email to verify, then <a href="login.html">login here</a>.';
      alertEl.classList.remove('hidden');
      form.reset();
    } catch (err) {
      alertEl.className = 'alert alert-error';
      alertEl.innerHTML = `❌ ${err.message}`;
      alertEl.classList.remove('hidden');
    } finally {
      setLoading(btn, false);
    }
  });
}

// ============================================================
// LOGIN PAGE LOGIC
// ============================================================
function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;

  // Redirect if already logged in
  getSession().then(user => {
    if (user) window.location.href = 'index.html';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const alertEl = document.getElementById('login-alert');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    alertEl.classList.add('hidden');
    setLoading(btn, true);

    try {
      await signIn(email, password);
      showToast('Login successful! Welcome back.', 'success');
      // Redirect to home or return URL
      const returnUrl = new URLSearchParams(window.location.search).get('return') || 'index.html';
      setTimeout(() => window.location.href = returnUrl, 600);
    } catch (err) {
      alertEl.className = 'alert alert-error';
      alertEl.innerHTML = `❌ ${err.message}`;
      alertEl.classList.remove('hidden');
      setLoading(btn, false);
    }
  });
}
 
// const { data, error } = await supabaseClient.auth.signUp({
//   email,
//   password
// });

// if (data.user) {
//   await supabaseClient.from('profiles').insert([
//     {
//       id: data.user.id,
//       email: data.user.email,
//       name: name // agar tu naam le raha hai form se
//     }
//   ]);
// }



// document.querySelector("form").addEventListener("submit", async (e) => {
//   e.preventDefault(); // 🔥 ye line missing hogi

//   const email = document.getElementById("email").value;
//   const password = document.getElementById("password").value;

//   const { data, error } = await supabase.auth.signInWithPassword({
//     email,
//     password,
//   });

//   if (error) {
//     alert(error.message);
//   } else {
//     alert("Login successful 🚀");
//     window.location.href = "home.html"; // ya dashboard
//   }
// });