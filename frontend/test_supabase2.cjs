const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key) acc[key] = val;
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('churches')
    .select('*, district:districts(id, district_name), assignments(status, pastor:pastors(id, full_name, pastor_image_url))')
    .limit(1);
  console.log("Error:", error);
}
run();
