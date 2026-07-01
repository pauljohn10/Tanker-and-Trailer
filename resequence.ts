import 'dotenv/config';
import { dbResequenceRecords, dbGetRecords } from './src/lib/supabaseService';

async function run() {
  console.log('Fetching records before re-sequence...');
  try {
    const records = await dbGetRecords();
    console.log(`Found ${records.length} records. Last SN is currently: ${records[records.length - 1]?.sn}`);
    
    console.log('Running resequence function...');
    await dbResequenceRecords();
    
    console.log('Done! Checking records again...');
    const newRecords = await dbGetRecords(); // the cache is cleared in dbResequenceRecords
    console.log(`Last SN is now: ${newRecords[newRecords.length - 1]?.sn}`);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
