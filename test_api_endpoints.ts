import dotenv from 'dotenv';
dotenv.config();
import { getSupabaseClient } from './src/lib/supabaseService';

async function testEndpoints() {
  console.log('Testing authenticateToken or endpoints...');
  // Let's see if there's any obvious issue or if we can run server-side functions directly
  try {
    const client = getSupabaseClient();
    console.log('Client active:', !!client);
    
    // Test fetching logs
    const { data: logs, error: logsError } = await client.from('audit_logs').select('*');
    console.log('Audit logs status:', { count: logs?.length, error: logsError });
    
    // Test profiles
    const { data: profiles, error: profError } = await client.from('profiles').select('*');
    console.log('Profiles status:', { count: profiles?.length, error: profError });
    console.log('Profiles list:', profiles);
    
    // Test capacity categories
    const { data: capCats, error: capError } = await client.from('capacity_categories').select('*');
    console.log('Capacity categories status:', { count: capCats?.length, error: capError });

    // Test special standby ledger
    const { data: standby, error: standbyError } = await client.from('special_standby_ledger').select('*');
    console.log('Special standby ledger status:', { count: standby?.length, error: standbyError });
  } catch (err) {
    console.error('Test error:', err);
  }
}

testEndpoints().catch(console.error);
