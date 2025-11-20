export function formatCurrency(v){
  if (isNaN(v)) v = 0;
  return '₹' + Number(v).toFixed(2);
}

export function formatDateISO(date){
  const d = new Date(date);
  if (isNaN(d)) return '';
  return d.toISOString().slice(0,10);
}

export function monthKeyFromDate(date){
  const d = new Date(date);
  if (isNaN(d)) return 'unknown';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; // e.g., 2025-11
}
