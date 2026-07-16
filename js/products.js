
async function getSellerProfile(userId) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('name, email, phone')
    .eq('id', userId)
    .single();

  if (error) return { name: 'Unknown Seller', email: '', phone: '' };
  return data || { name: 'Unknown Seller', email: '', phone: '' };
}


async function getAllProducts(category = '', searchTerm = '') {
  let query = supabaseClient
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  // Filter by category
  if (category && category !== 'all' && category !== '') {
    query = query.eq('category', category);
  }

  // Filter by search term (title or description)
  if (searchTerm) {
    query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ============================================================
// FETCH SINGLE PRODUCT by ID
// ============================================================
async function getProductById(productId) {
  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// FETCH USER'S OWN PRODUCTS
// ============================================================
async function getUserProducts(userId) {
  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================================
// CREATE PRODUCT
// ============================================================
async function createProduct(productData) {
  const { data, error } = await supabaseClient
    .from('products')
    .insert([productData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// UPDATE PRODUCT
// ============================================================
async function updateProduct(productId, updates) {
  const { data, error } = await supabaseClient
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// DELETE PRODUCT (also removes images from storage)
// ============================================================
async function deleteProduct(productId, imageUrls = []) {
  // Delete images from Supabase Storage
  for (const url of imageUrls) {
    if (url) {
      try {
        // Extract the file path from the URL
        const path = url.split('/storage/v1/object/public/product-images/')[1];
        if (path) {
          await supabaseClient.storage.from('product-images').remove([path]);
        }
      } catch (e) {
        console.warn('Could not delete image:', e);
      }
    }
  }

  const { error } = await supabaseClient
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) throw error;
  return true;
}

// ============================================================
// UPLOAD IMAGE to Supabase Storage
// Returns: public URL of uploaded image
// ============================================================
async function uploadProductImage(file, userId) {
  // Validate file size (3MB max)
  const MAX_SIZE = 3 * 1024 * 1024; // 3MB
  if (file.size > MAX_SIZE) {
    throw new Error('Image must be less than 3MB');
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG and WebP images are allowed');
  }

  // Create unique filename
  const ext = file.name.split('.').pop();
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

  const { data, error } = await supabaseClient.storage
    .from('product-images')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabaseClient.storage
    .from('product-images')
    .getPublicUrl(filename);

  return urlData.publicUrl;
}

// ============================================================
// RENDER PRODUCT CARDS (Home Page)
// ============================================================
function renderProductCards(products, container, isLoggedIn) {
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">📦</div>
        <h3>No Products Yet</h3>
        <p>Be the first to list something! Products will appear here once added.</p>
        ${isLoggedIn ? '<a href="add-product.html" class="btn btn-primary">+ Add Product</a>' : ''}
      </div>
    `;
    return;
  }

  container.innerHTML = products.map((product, i) => {
    const imageUrl = product.image_url_1 || product.image_url_2 || '';
    const isNew = (Date.now() - new Date(product.created_at)) < 86400000 * 3; // 3 days

    const cardClass = isLoggedIn ? 'product-card clickable card-appear' : 'product-card card-appear';
    const staggerClass = i < 8 ? `stagger-${(i % 4) + 1}` : '';

    const imageContent = imageUrl
      ? `<img src="${imageUrl}" alt="${escapeHtml(product.title)}" loading="lazy" onerror="this.parentElement.innerHTML='🖼️'">`
      : `<span>🖼️</span>`;

    return `
      <div class="${cardClass} ${staggerClass}" 
           ${isLoggedIn ? `onclick="window.location.href='product.html?id=${product.id}'"` : ''}
           data-id="${product.id}">
        ${isNew ? '<span class="badge-new">NEW</span>' : ''}
        <div class="product-card-image">${imageContent}</div>
        <div class="product-card-body">
          <div class="product-card-price">${formatPrice(product.price)}</div>
          <div class="product-card-title">${escapeHtml(product.title)}</div>
          <div class="product-card-desc">${escapeHtml(product.description)}</div>
          <div class="product-card-meta">
            <span>📅 ${formatDate(product.created_at)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// RENDER USER'S PRODUCT LIST (Dashboard)
// ============================================================
function renderUserProductList(products, container) {
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No listings yet</h3>
        <p>You haven't added any products. Start selling today!</p>
        <a href="add-product.html" class="btn btn-primary mt-16">+ Add your first product</a>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(product => {
    const imageUrl = product.image_url_1 || product.image_url_2 || '';
    const imageContent = imageUrl
      ? `<img src="${imageUrl}" alt="${escapeHtml(product.title)}" onerror="this.parentElement.innerHTML='🖼️'">`
      : '🖼️';

    return `
      <div class="product-list-item" data-id="${product.id}">
        <div class="product-list-thumb">${imageContent}</div>
        <div class="product-list-info">
          <div class="product-list-title">${escapeHtml(product.title)}</div>
          <div class="product-list-price">${formatPrice(product.price)}</div>
          <div style="font-size:0.78rem;color:var(--text-light);margin-top:3px;">${formatDate(product.created_at)}</div>
        </div>
        <div class="product-list-actions">
          <button class="btn btn-ghost btn-sm" onclick="openEditModal('${product.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteProduct('${product.id}', '${escapeHtml(product.title)}', ['${product.image_url_1 || ''}','${product.image_url_2 || ''}'])">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// ESCAPE HTML for safety
// ============================================================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// ============================================================
// INIT ADD PRODUCT PAGE
// ============================================================
function initAddProductPage() {
  const form = document.getElementById('add-product-form');
  if (!form) return;

  let uploadedImages = []; // Array of File objects
  let user = null;

  requireAuth().then(u => {
    user = u;
    if (!u) return;
    updateNavbar();
  });

  // Image upload preview
  const imageInput = document.getElementById('image-input');
  const previewContainer = document.getElementById('image-previews');
  const uploadArea = document.getElementById('upload-area');

  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      handleImageSelection(e.target.files);
    });
  }

  // Drag & Drop
  if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      handleImageSelection(e.dataTransfer.files);
    });
  }

  function handleImageSelection(files) {
    const MAX_IMAGES = 2;
    const MAX_SIZE = 3 * 1024 * 1024;

    for (const file of files) {
      if (uploadedImages.length >= MAX_IMAGES) {
        showToast(`Maximum ${MAX_IMAGES} images allowed`, 'error');
        break;
      }
      if (file.size > MAX_SIZE) {
        showToast(`${file.name} is too large (max 3MB)`, 'error');
        continue;
      }
      if (!file.type.startsWith('image/')) {
        showToast(`${file.name} is not an image`, 'error');
        continue;
      }
      uploadedImages.push(file);
    }
    renderPreviews();
  }

  function renderPreviews() {
    if (!previewContainer) return;
    previewContainer.innerHTML = '';
    uploadedImages.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const item = document.createElement('div');
        item.className = 'image-preview-item';
        item.innerHTML = `
          <img src="${e.target.result}" alt="Preview">
          <button type="button" class="remove-image" onclick="removeImage(${index})">✕</button>
        `;
        previewContainer.appendChild(item);
      };
      reader.readAsDataURL(file);
    });

    // Update counter
    const counter = document.getElementById('image-counter');
    if (counter) counter.textContent = `${uploadedImages.length}/2 images selected`;
  }

  // Make removeImage available globally
  window.removeImage = (index) => {
    uploadedImages.splice(index, 1);
    renderPreviews();
  };

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!user) { window.location.href = 'login.html'; return; }

    const btn = document.getElementById('submit-btn');
    const alertEl = document.getElementById('product-alert');

    const title = document.getElementById('title').value.trim();
    const price = document.getElementById('price').value;
    const description = document.getElementById('description').value.trim();
    const category = document.getElementById('category').value;

    // Validation
    if (!title || !price || !category || !description) {
      alertEl.className = 'alert alert-error';
      alertEl.innerHTML = '❌ Please fill in all fields.';
      alertEl.classList.remove('hidden');
      return;
    }

    alertEl.classList.add('hidden');
    setLoading(btn, true);

    try {
      // Upload images
      let image_url_1 = null, image_url_2 = null;

      if (uploadedImages[0]) {
        image_url_1 = await uploadProductImage(uploadedImages[0], user.id);
      }
      if (uploadedImages[1]) {
        image_url_2 = await uploadProductImage(uploadedImages[1], user.id);
      }

      // Create product record
      await createProduct({
        title,
        price: parseFloat(price),
        description,
        category,
        image_url_1,
        image_url_2,
        user_id: user.id,
        created_at: new Date().toISOString()
      });

      showToast('Product listed successfully!', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 1200);

    } catch (err) {
      alertEl.className = 'alert alert-error';
      alertEl.innerHTML = `❌ Error: ${err.message}`;
      alertEl.classList.remove('hidden');
      setLoading(btn, false);
    }
  });
}

// ============================================================
// INIT PRODUCT DETAIL PAGE
// ============================================================
async function initProductDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    window.location.href = 'index.html';
    return;
  }

  const user = await requireAuth('login.html?return=product.html?id=' + productId);
  if (!user) return;

  updateNavbar();

  const container = document.getElementById('product-detail');
  if (!container) return;

  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>Loading product...</p></div>';

  try {
    const product = await getProductById(productId);
    const seller = await getSellerProfile(product.user_id);
    renderProductDetail(product, container, user, seller);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">😕</div><h3>Product not found</h3><p>${err.message}</p><a href="index.html" class="btn btn-primary">Go Home</a></div>`;
  }
}

function renderProductDetail(product, container, user, seller = {}) {
  const img1 = product.image_url_1;
  const img2 = product.image_url_2;
  const sellerName = seller.name || seller.email || 'Anonymous Seller';

  let thumbnailsHtml = '';
  if (img1 && img2) {
    thumbnailsHtml = `
      <div class="product-thumbnails">
        <div class="product-thumb active" onclick="switchImage('${img1}', this)"><img src="${img1}" alt="Image 1" onerror="this.parentElement.innerHTML='🖼️'"></div>
        <div class="product-thumb" onclick="switchImage('${img2}', this)"><img src="${img2}" alt="Image 2" onerror="this.parentElement.innerHTML='🖼️'"></div>
      </div>
    `;
  }

  const mainImageContent = img1
    ? `<img src="${img1}" alt="${escapeHtml(product.title)}" id="main-product-image" onerror="this.parentElement.innerHTML='🖼️'">`
    : '🖼️';

  container.innerHTML = `
    <div class="breadcrumb">
      <a href="index.html">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span>${escapeHtml(product.title)}</span>
    </div>
    <div class="product-detail-grid">
      <div class="product-images">
        <div class="product-main-image" id="main-image-container">${mainImageContent}</div>
        ${thumbnailsHtml}
      </div>
      <div>
        <div class="product-info-card">
          <div class="product-detail-price">${formatPrice(product.price)}</div>
          <div class="product-detail-title">${escapeHtml(product.title)}</div>
          <div class="product-detail-desc">${escapeHtml(product.description)}</div>
          <div class="divider"></div>
          <div style="font-weight:600;font-size:0.9rem;margin-bottom:12px;color:var(--text-muted);">SELLER DETAILS</div>
          <div class="seller-card">
            <div class="seller-avatar">${getInitials(sellerName)}</div>
            <div>
              <div class="seller-name">${escapeHtml(sellerName)}</div>
              <div class="seller-label">📧 ${escapeHtml(seller.email || '')}</div>
              ${seller.phone ? `<div class="seller-label">📞 ${escapeHtml(seller.phone)}</div>` : ''}
            </div>
          </div>
          <div class="product-date">📅 Listed on ${formatDate(product.created_at)}</div>
          ${product.user_id === user.id ? `
          <div class="divider"></div>
          <div style="display:flex;gap:10px;">
            <a href="dashboard.html" class="btn btn-ghost" style="flex:1;padding:12px;font-size:1rem;">✏️ Edit in Dashboard</a>
          </div>` : `
          <div class="divider"></div>
          <button id="wishlist-btn" class="wishlist-btn-featured" onclick="toggleWishlist('${product.id}', '${escapeHtml(product.title)}')">
            <span id="wishlist-icon" style="font-size:1.4rem;">🤍</span>
            <span id="wishlist-text" style="font-weight:600;font-size:1.05rem;">Add to Wishlist</span>
          </button>`}
        </div>
      </div>
    </div>
  `;

  // Add CSS for featured wishlist button
  if (!document.getElementById('wishlist-btn-css')) {
    const style = document.createElement('style');
    style.id = 'wishlist-btn-css';
    style.textContent = `
      .wishlist-btn-featured {
        width: 100%;
        padding: 14px 16px;
        border: 2px solid #ff6b6b;
        background: #fff5f5;
        color: #c92a2a;
        border-radius: 8px;
        font-size: 1.05rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(255, 107, 107, 0.15);
      }
      
      .wishlist-btn-featured:hover {
        background: #ff6b6b;
        color: white;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
      }
      
      .wishlist-btn-featured.in-wishlist {
        border-color: #ff0000;
        background: #ffe0e0;
        color: #c92a2a;
      }
      
      .wishlist-btn-featured.in-wishlist:hover {
        background: #ff0000;
        color: white;
        border-color: #c92a2a;
      }
    `;
    document.head.appendChild(style);
  }

  // Update wishlist button state
  updateWishlistButton(product.id);

  // Image switching
  window.switchImage = (url, thumbEl) => {
    const main = document.getElementById('main-image-container');
    if (main) main.innerHTML = `<img src="${url}" alt="Product" onerror="this.parentElement.innerHTML='🖼️'">`;
    document.querySelectorAll('.product-thumb').forEach(t => t.classList.remove('active'));
    if (thumbEl) thumbEl.classList.add('active');
  };
}

// ============================================================
// WISHLIST FUNCTIONS
// ============================================================
function getWishlist() {
  const wishlist = localStorage.getItem('marketplace_wishlist');
  return wishlist ? JSON.parse(wishlist) : [];
}

function saveWishlist(wishlist) {
  localStorage.setItem('marketplace_wishlist', JSON.stringify(wishlist));
}

function isInWishlist(productId) {
  const wishlist = getWishlist();
  return wishlist.some(item => item.id === productId);
}

function toggleWishlist(productId, productTitle) {
  const wishlist = getWishlist();
  const isInList = isInWishlist(productId);

  if (isInList) {
    // Remove from wishlist
    const updatedWishlist = wishlist.filter(item => item.id !== productId);
    saveWishlist(updatedWishlist);
    showToast(`Removed from wishlist`, 'default');
  } else {
    // Add to wishlist
    wishlist.push({
      id: productId,
      title: productTitle,
      addedAt: new Date().toISOString()
    });
    saveWishlist(wishlist);
    showToast(`Added to wishlist! 💕`, 'success');
  }

  updateWishlistButton(productId);
}

function updateWishlistButton(productId) {
  const wishlistBtn = document.getElementById('wishlist-btn');
  const wishlistIcon = document.getElementById('wishlist-icon');
  const wishlistText = document.getElementById('wishlist-text');

  if (!wishlistBtn) return;

  if (isInWishlist(productId)) {
    wishlistIcon.textContent = '❤️';
    wishlistText.textContent = 'Remove from Wishlist';
    wishlistBtn.classList.add('in-wishlist');
  } else {
    wishlistIcon.textContent = '🤍';
    wishlistText.textContent = 'Add to Wishlist';
    wishlistBtn.classList.remove('in-wishlist');
  }
}
