import {loadEnvConfig} from '@next/env';
loadEnvConfig(process.cwd());
async function main(){const {migrate,closeDB}=await import('../src/lib/db');await migrate();console.log('AFTERLIGHT schema version 1 applied.');await closeDB();}
main().catch(()=>{console.error('Migration failed. Check DATABASE_URL and database access.');process.exit(1);});
