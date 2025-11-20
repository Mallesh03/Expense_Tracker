const KEY = 'expense_tracker_v1';

export function readExpenses(){
  try{
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  }catch(e){
    console.error('storage read error', e);
    return [];
  }
}

export function saveExpenses(list){
  try{
    localStorage.setItem(KEY, JSON.stringify(list));
  }catch(e){
    console.error('storage save error', e);
  }
}
