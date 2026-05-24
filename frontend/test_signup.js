import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || 'https://wfeeoojneyuoeutzndie.supabase.co', process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_zOwCaEW4IE_isQ321B9UyQ_4SuHdom-');
async function test() {
  const res = await supabase.auth.signUp({ email: 'brandnew123@example.com', password: 'password123' });
  console.log("Res:", JSON.stringify(res, null, 2));
}
test();
