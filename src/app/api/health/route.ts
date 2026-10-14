import {transaction} from '@/lib/db';
import {response} from '@/lib/http';
import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function GET(){try{await transaction(async c=>{await c.query('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1');});return response({status:'ready',version:'0.3.0',storage:process.env.DATABASE_URL?'postgresql':'local-development'});}catch{return NextResponse.json({status:'not-ready',message:'Database connection or migration is required.'},{status:503});}}
