
async function getSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session ? session.user : null;
}


async function signUp(email, password, name = '', phone = '') {
  const { data, error: authError } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { name } // Store name in user metadata
    }
  });

  if (authError) throw authError;

  // Create profile in profiles table
  if (data.user) {
    const { error: profileError } = await supabaseClient.from('profiles').upsert({
      id: data.user.id,
      name: name || '',
      email: email,
      phone: phone || '',
      password: password, 
      role: 'user',
      created_at: new Date().toISOString()
    });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      throw new Error('Database error: Could not save user profile. Please check if the "profiles" table is correctly set up with RLS policies.');
    }
  }

  return data;
}


async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}


async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
  window.location.href = 'index.html';
}


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
// DELETE USER ACCOUNT (with all products and data)
// Deletes profile, all products, and product images
// ============================================================
async function deleteUserAccount(userId, userProducts = []) {
  try {
    // Delete all products and their images
    for (const product of userProducts) {
      const imagesToDelete = [];
      if (product.image_url_1) imagesToDelete.push(product.image_url_1);
      if (product.image_url_2) imagesToDelete.push(product.image_url_2);
      
      // Delete images from storage
      for (const url of imagesToDelete) {
        try {
          const path = url.split('/storage/v1/object/public/product-images/')[1];
          if (path) {
            await supabaseClient.storage.from('product-images').remove([path]);
          }
        } catch (e) {
          console.warn('Could not delete image:', e);
        }
      }
      
      // Delete product record
      const { error: deleteError } = await supabaseClient
        .from('products')
        .delete()
        .eq('id', product.id);
      
      if (deleteError) throw deleteError;
    }

    // Delete user profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) throw profileError;

    return true;
  } catch (err) {
    throw new Error(`Failed to delete account: ${err.message}`);
  }
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
        <button onclick="toggleDarkMode()" class="theme-toggle" title="Toggle Dark Mode" style="margin-right: 8px;">🌙</button>
        <a href="wishllist.html" class="btn btn-outline btn-sm">❤️ Wishlist</a>
        <a href="dashboard.html" class="nav-user-info" style="color:rgba(255,255,255,0.85);">
          <div class="nav-avatar">${initials}</div>
          <span style="display:none" id="nav-username">${name}</span>
        </a>
        <button onclick="signOut()" class="btn btn-primary btn-sm">Logout</button>
      </div>
    `;
  } else {
    navActions.innerHTML = `
      <button onclick="toggleDarkMode()" class="theme-toggle" title="Toggle Dark Mode" style="margin-right: 8px;">🌙</button>
      <a href="wishllist.html" class="btn btn-outline btn-sm">❤️ Wishlist</a>
      <a href="login.html" class="btn btn-outline btn-sm">Login</a>
      <a href="signup.html" class="btn btn-primary btn-sm">Sign Up</a>
    `;
  }

  // Update theme toggle icons if the darkmode script is available
  if (window.updateToggleButtons && window.getPreferredTheme) {
    window.updateToggleButtons(window.getPreferredTheme());
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
    const phone = document.getElementById('phone').value.trim();

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
      // alertEl.innerHTML = `❌ ${err.message}`;
      await signUp(email, password, name, phone);
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

// ============================================================
// GET USER ROLE — Check if user is 'admin' or 'user'
// ============================================================
async function getUserRole(userId) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.role || null;
}

// ============================================================
// IS USER ADMIN — Check if user has admin role
// ============================================================
async function isUserAdmin(userId) {
  const role = await getUserRole(userId);
  return role === 'admin';
}

// ============================================================
// SET USER ROLE — Update user role (admin only)
// Usage: await setUserRole(userId, 'admin') or 'user'
// ============================================================
async function setUserRole(userId, role) {
  if (role !== 'admin' && role !== 'user') {
    throw new Error('Role must be either "admin" or "user"');
  }

  const { data, error } = await supabaseClient
    .from('profiles')
    .update({ role: role })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// SET ADMIN PASSWORD — Manually set password for admin account
// Usage: await setAdminPassword(userId, newPassword)
// ============================================================
async function setAdminPassword(userId, newPassword) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .update({ password: newPassword })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// ADMIN LOGIN — Check email + password + role='admin' from profiles table
// ============================================================
async function adminLogin(email, password) {
  // Get profile by email
  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !profile) {
    throw new Error('Admin account not found');
  }

  // Check if role is admin
  if (profile.role !== 'admin') {
    throw new Error('This account is not an admin account');
  }

  // Check if password matches
  if (profile.password !== password) {
    throw new Error('Incorrect password');
  }

  // Admin login successful - store admin session in localStorage
  localStorage.setItem('admin_session', JSON.stringify({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    logged_in_at: new Date().toISOString()
  }));

  return profile;
}

// ============================================================
// GET ADMIN SESSION (with persistence check)
// ============================================================
function getAdminSession() {
  try {
    const session = localStorage.getItem('admin_session');
    if (session) {
      const adminData = JSON.parse(session);
      // Session exists and is valid
      return adminData;
    }
    return null;
  } catch (err) {
    console.error('Error retrieving admin session:', err);
    localStorage.removeItem('admin_session');
    return null;
  }
}

// ============================================================
// ADMIN LOGOUT
// ============================================================
function adminLogout() {
  localStorage.removeItem('admin_session');
  // Force a complete page reload to ensure session is cleared
  window.location.href = 'admin.html?logout=true';
}

// ============================================================
// REQUIRE ADMIN AUTH — Redirect to admin login if not admin
// ============================================================
function requireAdminAuth() {
  const adminSession = getAdminSession();
  if (!adminSession) {
    document.getElementById('admin-login-overlay').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
    return false;
  }
  return adminSession;
}

// ============================================================
// ADMIN LOGIN PAGE LOGIC
// ============================================================
function initAdminLoginPage() {
  const form = document.getElementById('admin-login-form');
  const loginOverlay = document.getElementById('admin-login-overlay');
  const adminPanel = document.getElementById('admin-panel');
  
  if (!form) return;

  // Form submission handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-login-btn');
    const alertEl = document.getElementById('admin-login-alert');

    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;

    alertEl.classList.add('hidden');
    setLoading(btn, true);

    try {
      await adminLogin(email, password);
      alertEl.className = 'alert alert-success';
      alertEl.innerHTML = '✅ Admin login successful!';
      alertEl.classList.remove('hidden');
      
      // Show admin panel after short delay
      setTimeout(() => {
        if (loginOverlay) loginOverlay.style.display = 'none';
        if (adminPanel) adminPanel.style.display = 'block';
        adminUser = getAdminSession();
        loadAdminData();
      }, 500);
    } catch (err) {
      alertEl.className = 'alert alert-error';
      alertEl.innerHTML = `❌ ${err.message}`;
      alertEl.classList.remove('hidden');
      setLoading(btn, false);
    }
  });
}