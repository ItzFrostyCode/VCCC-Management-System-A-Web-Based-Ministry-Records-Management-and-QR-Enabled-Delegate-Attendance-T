const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key) acc[key] = val;
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const [d, p, c, a] = await Promise.all([
    supabase.from('districts').select('*').eq('is_deleted', false).order('district_name'),
    supabase.from('pastors').select('*, church:churches(id, church_name, district:districts(id, district_name))').eq('is_deleted', false).order('full_name'),
    supabase.from('churches').select('*, district:districts(id, district_name), pastors(id, full_name, is_deleted)').eq('is_deleted', false).order('church_name'),
    supabase.from('assignments').select('*, pastor:pastors(id, full_name), church:churches(id, church_name)').order('start_date', { ascending: false })
  ]);
  console.log("Districts Length:", d.data ? d.data.length : d.error);
}
run();
