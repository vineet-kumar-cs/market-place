# 🛒 MarketPlace — OLX-Style Web App
### Built with Vanilla HTML, CSS, JavaScript + Supabase Backend

---

## 📁 FILE STRUCTURE

```
project/
│
├── index.html          ← Home page (browse products)
├── login.html          ← Login page
├── signup.html         ← Sign up page
├── dashboard.html      ← User profile + manage listings
├── add-product.html    ← Add new product form
├── product.html        ← Product detail page
├── admin.html          ← Admin control panel
│
├── js/
│   ├── supabase.js     ← Supabase client + utility functions
│   ├── auth.js         ← Login / Signup / Logout logic
│   └── products.js     ← Product CRUD + image upload
│
├── css/
│   └── style.css       ← Full app stylesheet
│
└── assets/
    └── images/         ← (Local static images if needed)
```

---

## 🚀 STEP 1: SUPABASE PROJECT SETUP

### A) Create Account & Project
1. Go to **https://supabase.com**
2. Click **"Start your project"** → Sign in with GitHub or Email
3. Click **"New Project"**
4. Fill in:
   - **Project name**: `marketplace`
   - **Database password**: (choose a strong password, save it!)(vineet@991762)
   - **Region**: Choose closest to your users (e.g., Southeast Asia)
5. Click **"Create new project"** — wait ~2 minutes

### B) Get Your API Keys
1. In your Supabase project, click the **Settings** icon (⚙️) in left sidebar
2. Click **"API"**
3. Copy these two values:
   - **Project URL** → looks like: `https://abcdefgh.supabase.co`
   - **anon public key** → a long string starting with `eyJ...`

### C) Add Keys to supabase.js
Open `js/supabase.js` and replace:
```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY_HERE';
```
With your actual values.

---

## 🗄️ STEP 2: CREATE DATABASE TABLES

In your Supabase project, go to **SQL Editor** and run these queries:

### Table 1: profiles
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Allow users to read all profiles (for seller info on product page)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" 
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE USING (auth.uid() = id);
```

### Table 2: products
```sql
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  description TEXT,
  image_url_1 TEXT,
  image_url_2 TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Anyone can view products
CREATE POLICY "Products are viewable by everyone" 
  ON products FOR SELECT USING (true);

-- Only authenticated users can insert
CREATE POLICY "Authenticated users can insert products" 
  ON products FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own products
CREATE POLICY "Users can update their own products" 
  ON products FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own products
CREATE POLICY "Users can delete their own products" 
  ON products FOR DELETE USING (auth.uid() = user_id);
```

---

## 🖼️ STEP 3: SET UP STORAGE (for images)

1. In Supabase sidebar, click **"Storage"**
2. Click **"New bucket"**
3. Name it exactly: `product-images`
4. Check **"Public bucket"** ✅ (so images are publicly viewable)
5. Click **"Create bucket"**

### Set Storage Policies (in SQL Editor):
```sql
-- Allow anyone to view images
CREATE POLICY "Images are publicly viewable" 
  ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload images" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 🔐 STEP 4: SET UP ADMIN ACCESS

### Method 1: Set Admin Metadata in Supabase Dashboard
1. Go to **Authentication → Users** in Supabase
2. Click on the user you want to make admin
3. Click **"Edit"**
4. In **Raw user metadata**, add:
   ```json
   {
     "is_admin": true
   }
   ```
5. Save

### Method 2: Hardcode Admin Email (Quick Setup)
In `admin.html`, find this line and change the email:
```javascript
const isAdmin = user.user_metadata?.is_admin === true ||
                user.email === 'admin@marketplace.com'; // ← Change this
```

---

## 🌐 STEP 5: ENABLE EMAIL AUTH (If Not Already)

1. Go to **Authentication → Providers** in Supabase
2. Make sure **Email** is enabled ✅
3. Optional: Under **Authentication → Settings**, you can:
   - Disable "Confirm email" for easier testing (not recommended for production)
   - Or leave it enabled (users must verify email before logging in)

---

## ☁️ STEP 6: DEPLOY ON VERCEL (Free Hosting)

### Option A: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to your project folder
cd project/

# Deploy
vercel

# Follow the prompts:
# - Link to existing project? No
# - What's your project name? marketplace-app
# - Which directory is your code in? ./
# Done! You'll get a live URL like https://marketplace-app.vercel.app
```

### Option B: Deploy via Vercel Website (Easier)
1. Push your project to **GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/marketplace.git
   git push -u origin main
   ```
2. Go to **https://vercel.com** → Sign in with GitHub
3. Click **"New Project"**
4. Import your GitHub repository
5. Click **"Deploy"**
6. Your site is live! 🎉

### Option C: Deploy via Netlify (Also Free)
1. Go to **https://netlify.com**
2. Drag and drop your `project/` folder onto the Netlify dashboard
3. Done! Instant deployment.

---

## 🧪 TESTING LOCALLY

Simply open `index.html` directly in your browser. No server needed!

Or use VS Code's **Live Server** extension:
1. Install "Live Server" extension in VS Code
2. Right-click `index.html` → **"Open with Live Server"**

---

## ✅ FEATURE CHECKLIST

| Feature | File |
|---------|------|
| Home page (before login) | `index.html` |
| Home page (after login - products clickable) | `index.html` + `js/auth.js` |
| User signup | `signup.html` + `js/auth.js` |
| User login | `login.html` + `js/auth.js` |
| User logout | `js/auth.js` → `signOut()` |
| User dashboard/profile | `dashboard.html` |
| Add product with 2 images | `add-product.html` + `js/products.js` |
| Product detail page | `product.html` + `js/products.js` |
| Edit own product | `dashboard.html` (modal) |
| Delete own product | `dashboard.html` (modal) |
| Admin panel | `admin.html` |
| Admin edit any product | `admin.html` |
| Admin delete any product | `admin.html` |
| Admin view all users | `admin.html` |
| Image upload (Supabase Storage) | `js/products.js` → `uploadProductImage()` |
| Search products | `index.html` → `doSearch()` |
| Mobile responsive | `css/style.css` |

---

## 🔧 COMMON ISSUES & FIXES

### "Failed to fetch" error
- Make sure you've replaced the Supabase URL and key in `js/supabase.js`
- Check that your browser allows CORS (Supabase handles this automatically)

### Images not uploading
- Make sure the `product-images` bucket exists in Supabase Storage
- Make sure the bucket is set to **Public**
- Make sure you've run the Storage policies SQL

### "new row violates row-level security policy"
- Make sure you've run all the RLS policy SQL statements
- Make sure the user is logged in before inserting

### Email verification required
- In Supabase → Authentication → Settings → Email Auth
- You can disable "Confirm email" for testing

### Admin panel shows "Access denied"
- Make sure the logged-in user has `is_admin: true` in their metadata
- OR change the hardcoded admin email in `admin.html`

---

## 📞 SUPABASE QUICK REFERENCE

| Action | Code |
|--------|------|
| Get session | `supabaseClient.auth.getSession()` |
| Sign up | `supabaseClient.auth.signUp({email, password})` |
| Sign in | `supabaseClient.auth.signInWithPassword({email, password})` |
| Sign out | `supabaseClient.auth.signOut()` |
| Get data | `supabaseClient.from('table').select('*')` |
| Insert | `supabaseClient.from('table').insert([{...}])` |
| Update | `supabaseClient.from('table').update({...}).eq('id', id)` |
| Delete | `supabaseClient.from('table').delete().eq('id', id)` |
| Upload file | `supabaseClient.storage.from('bucket').upload(path, file)` |
| Get public URL | `supabaseClient.storage.from('bucket').getPublicUrl(path)` |
