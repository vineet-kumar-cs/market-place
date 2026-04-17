// ============================================================
// js/supabase.js — Supabase Client Initialization
// ============================================================
// HOW TO SET UP:
//   1. Go to https://supabase.com → New Project
//   2. After project is created, go to Settings → API
//   3. Copy your "Project URL" and "anon public" key
//   4. Replace the values below with your credentials
// ============================================================

const SUPABASE_URL = 'https://bcbsvmmhjelqaeawepml.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjYnN2bW1oamVscWFlYXdlcG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjYwOTYsImV4cCI6MjA5MTk0MjA5Nn0.pXJheXJIFGssUz59Igh_vSooym_5OLi1o9gGeXbTAT4';

// Initialize Supabase client (using CDN version)
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// UTILITY: Toast Notification System

// ============================================================
function showToast(message, type = 'default') {
  // Create container if not exists
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = { success: '✅', error: '❌', default: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || icons.default}</span> ${message}`;

  container.appendChild(toast);

  // Auto-remove after 3.5 seconds
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================================
// UTILITY: Format currency (INR default)
// ============================================================
function formatPrice(price) {
  return '₹' + Number(price).toLocaleString('en-IN');
}

// ============================================================
// UTILITY: Format date
// ============================================================
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

// ============================================================
// UTILITY: Get initials from email or name
// ============================================================
function getInitials(text) {
  if (!text) return '?';
  const parts = text.split(/[@.\s]/);
  return parts.filter(p => p.length > 0).slice(0, 2)
    .map(p => p[0].toUpperCase()).join('');
}

// ============================================================
// UTILITY: Show/hide loading
// ============================================================
function setLoading(btnEl, isLoading, originalText = '') {
  if (!btnEl) return;
  if (isLoading) {
    btnEl.disabled = true;
    btnEl.dataset.originalText = btnEl.innerHTML;
    btnEl.innerHTML = '<span class="spinner" style="width:16px;height:16px;margin:0;border-width:2px;display:inline-block;vertical-align:middle;"></span>';
  } else {
    btnEl.disabled = false;
    btnEl.innerHTML = btnEl.dataset.originalText || originalText;
  }
}

// ============================================================
// UTILITY: Show error on form field
// ============================================================
function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.style.borderColor = 'var(--danger)';
  let errEl = field.parentElement.querySelector('.form-error');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'form-error';
    field.parentElement.appendChild(errEl);
  }
  errEl.textContent = message;
  errEl.style.display = 'block';
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.style.borderColor = '';
  const errEl = field.parentElement.querySelector('.form-error');
  if (errEl) errEl.style.display = 'none';
}


const ADMIN_EMAILS = ['whitegriffin.respact@gmail.com'];  // ← your admin email