import {cookies} from 'next/headers';
import {SESSION_COOKIE} from '@/lib/auth';
import {mutate,snapshot} from '@/lib/service';
import {body,failure,originCheck,response} from '@/lib/http';
import {GameError} from '@/lib/engine';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function GET(){try{return response(await snapshot((await cookies()).get(SESSION_COOKIE)?.value));}catch(e){return failure(e);}}
export async function POST(req:Request){try{originCheck(req);const key=req.headers.get('Idempotency-Key');if(!key||!/^[a-zA-Z0-9_-]{8,100}$/.test(key))throw new GameError('IDEMPOTENCY_KEY','正しい処理キーが必要です。',422);return response(await mutate((await cookies()).get(SESSION_COOKIE)?.value,key,await body(req)));}catch(e){return failure(e);}}
