import { formatCurrency, formatDateISO, monthKeyFromDate } from './utils.js';
import { readExpenses, saveExpenses } from './storage.js';

// DOM refs
const form = document.getElementById('expense-form');
const idField = document.getElementById('expense-id');
const nameField = document.getElementById('name');
const amountField = document.getElementById('amount');
const dateField = document.getElementById('date');
const categoryField = document.getElementById('category');
const notesField = document.getElementById('notes');

const listEl = document.getElementById('expense-list');
const totalEl = document.getElementById('total-amount');
const monthlyEl = document.getElementById('monthly-total');

const searchInput = document.getElementById('search');
const filterMonth = document.getElementById('filter-month');
const filterCategory = document.getElementById('filter-category');
const clearAllBtn = document.getElementById('clear-all');
const exportBtn = document.getElementById('export-csv');
const resetBtn = document.getElementById('reset-btn');
const saveBtn = document.getElementById('save-btn');

let expenses = [];
let categoryChart = null;

// Helpers
function generateId(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

function load(){
  expenses = readExpenses();
  populateMonthFilter();
  render();
}

function populateMonthFilter(){
  const months = Array.from(new Set(expenses.map(e => monthKeyFromDate(e.date))));
  filterMonth.innerHTML = '<option value="all">All months</option>';
  months.sort((a,b) => b.localeCompare(a)).forEach(mk => {
    const opt = document.createElement('option');
    opt.value = mk;
    opt.textContent = mk;
    filterMonth.appendChild(opt);
  });
}

// Filtering & rendering
function getFiltered(){
  const q = searchInput.value.trim().toLowerCase();
  const month = filterMonth.value;
  const category = filterCategory.value;
  return expenses.filter(e => {
    if (q && !e.name.toLowerCase().includes(q)) return false;
    if (month !== 'all' && monthKeyFromDate(e.date) !== month) return false;
    if (category !== 'all' && category !== '' && e.category !== category) return false;
    return true;
  }).sort((a,b) => new Date(b.date) - new Date(a.date));
}

function render(){
  const list = getFiltered();
  listEl.innerHTML = '';
  if (!list.length){
    listEl.innerHTML = '<p class="small">No expenses yet.</p>';
  } else {
    list.forEach(e => {
      const card = document.createElement('div');
      card.className = 'expense-card';
      card.innerHTML = `
        <div class="expense-left">
          <div class="expense-name">${escapeHtml(e.name)} <span class="small">· ${escapeHtml(e.category)}</span></div>
          <div class="expense-meta small">${formatDateISO(e.date)} · ${escapeHtml(e.notes || '')}</div>
        </div>
        <div class="expense-right" style="display:flex;align-items:center;gap:12px">
          <div style="text-align:right">
            <div style="font-weight:700">${formatCurrency(e.amount)}</div>
            <div class="small">${new Date(e.date).toLocaleDateString()}</div>
          </div>
          <div class="expense-actions">
            <button class="secondary edit" data-id="${e.id}">Edit</button>
            <button class="danger del" data-id="${e.id}">Delete</button>
          </div>
        </div>
      `;
      listEl.appendChild(card);
    });
  }

  // totals
  const total = expenses.reduce((s, x) => s + Number(x.amount || 0), 0);
  totalEl.textContent = formatCurrency(total);

  const month = filterMonth.value !== 'all' ? filterMonth.value : monthKeyFromDate(new Date());
  const monthlyTotal = expenses.filter(e => monthKeyFromDate(e.date) === month).reduce((s, x) => s + Number(x.amount || 0), 0);
  monthlyEl.textContent = formatCurrency(monthlyTotal);

  attachButtons();
  renderCategoryChart(list);
}

// safe html escape for text nodes
function escapeHtml(s){
  return String(s || '').replace(/[&<>"'\/]/g, function (c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;'}[c];
  });
}

// Buttons: edit & delete
function attachButtons(){
  document.querySelectorAll('.edit').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const exp = expenses.find(x => x.id === id);
      if (!exp) return;
      idField.value = exp.id;
      nameField.value = exp.name;
      amountField.value = exp.amount;
      dateField.value = formatDateISO(exp.date);
      categoryField.value = exp.category;
      notesField.value = exp.notes || '';
      saveBtn.textContent = 'Update Expense';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  });
  document.querySelectorAll('.del').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      if (!confirm('Delete this expense?')) return;
      expenses = expenses.filter(e => e.id !== id);
      saveExpenses(expenses);
      populateMonthFilter();
      render();
    };
  });
}

// Form submit
form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const id = idField.value;
  const name = nameField.value.trim();
  const amount = parseFloat(amountField.value);
  const date = dateField.value;
  const category = categoryField.value;
  const notes = notesField.value.trim();

  if (!name || isNaN(amount) || !date || !category) {
    alert('Please fill all required fields.');
    return;
  }

  if (id) {
    const idx = expenses.findIndex(e => e.id === id);
    if (idx >= 0) {
      expenses[idx] = {...expenses[idx], name, amount, date, category, notes};
      saveExpenses(expenses);
    }
  } else {
    const exp = { id: generateId(), name, amount, date, category, notes };
    expenses.push(exp);
    saveExpenses(expenses);
  }
  resetForm();
  populateMonthFilter();
  render();
});

resetBtn.addEventListener('click', resetForm);
function resetForm(){
  idField.value = '';
  form.reset();
  saveBtn.textContent = 'Add Expense';
}

// Filters & actions
searchInput.addEventListener('input', render);
filterMonth.addEventListener('change', render);
filterCategory.addEventListener('change', render);

clearAllBtn.addEventListener('click', () => {
  if (!confirm('Clear all expenses? This cannot be undone.')) return;
  expenses = [];
  saveExpenses(expenses);
  populateMonthFilter();
  render();
});

exportBtn.addEventListener('click', () => {
  if (!expenses.length) return alert('No data to export');
  const rows = [['Name','Amount','Date','Category','Notes']];
  expenses.forEach(e => rows.push([e.name, e.amount, e.date, e.category, (e.notes||'')]));
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'expenses.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// Chart.js integration
function getCategoryTotals(list) {
  const map = {};
  list.forEach(e => {
    const cat = e.category || 'Other';
    map[cat] = (map[cat] || 0) + Number(e.amount || 0);
  });
  const entries = Object.entries(map).sort((a,b) => b[1] - a[1]);
  const categories = entries.map(e => e[0]);
  const amounts = entries.map(e => e[1]);
  return { categories, amounts };
}

function renderCategoryChart(list){
  const ctx = document.getElementById('categoryChart');
  if (!ctx || typeof Chart === 'undefined') return;
  const { categories, amounts } = getCategoryTotals(list);
  const labels = categories.length ? categories : ['No data'];
  const data = amounts.length ? amounts : [1];

  const backgroundColors = [
    '#3182CE','#38A169','#ED8936','#D53F8C','#718096','#F6AD55','#63B3ED','#9F7AEA'
  ];

  const cfg = {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: backgroundColors.slice(0, labels.length),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = Number(ctx.parsed).toFixed(2);
              return `${ctx.label}: ₹${val}`;
            }
          }
        }
      }
    }
  };

  if (categoryChart) {
    categoryChart.data.labels = cfg.data.labels;
    categoryChart.data.datasets = cfg.data.datasets;
    categoryChart.update();
  } else {
    categoryChart = new Chart(ctx, cfg);
  }
}

// init
expenses = readExpenses();
populateMonthFilter();
render();
