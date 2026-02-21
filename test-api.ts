import { getDeviceLogs } from './app/lib/services/device-service';

async function test() {
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);
  
  console.log('Fetching logs for device 15 from', weekAgo.toISOString(), 'to', now.toISOString());
  
  const result = await getDeviceLogs('15', weekAgo, now);
  
  if (result.success) {
    console.log('SUCCESS: Fetched', result.data?.length, 'logs');
    if (result.data && result.data.length > 0) {
      console.log('SAMPLE DATA PAYLOAD:', JSON.stringify(result.data[0].data_payload, null, 2));
      
      // Look for specific patterns
      const programs = new Set(result.data.map(l => (l as any).data_payload?.program_name || (l as any).data_payload?.ProgramName).filter(Boolean));
      console.log('UNIQUE PROGRAMS FOUND:', Array.from(programs));
    }
  } else {
    console.error('FAILED:', result.error);
  }
}

test();
