require('dotenv').config({ path: 'frontend/.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const [d, p, c, a] = await Promise.all([
    supabase.from('districts').select('*').eq('is_deleted', false).order('district_name'),
    supabase.from('pastors').select('*, church:churches(id, church_name, district:districts(id, district_name))').eq('is_deleted', false).order('full_name'),
    supabase.from('churches').select('*, district:districts(id, district_name), pastors(id, full_name, is_deleted)').eq('is_deleted', false).order('church_name'),
    supabase.from('assignments').select('*, pastor:pastors(id, full_name), church:churches(id, church_name)').order('start_date', { ascending: false })
  ]);
  console.log("Districts Error:", d.error);
  console.log("Pastors Error:", p.error);
  console.log("Churches Error:", c.error);
  console.log("Assignments Error:", a.error);
}
run();
