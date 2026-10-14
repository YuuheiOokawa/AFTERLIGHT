import {createHash,randomBytes,randomInt,randomUUID,scrypt as scryptCb,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import type {DBClient} from './db';
import {transaction} from './db';
import {GameError,initialState} from './engine';
import type {Profile} from './types';
const scrypt=promisify(scryptCb);
export const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export const SESSION_COOKIE='afterlight_session';
export const SESSION_AGE=30*24*3600;
export async function passwordHash(password:string){const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64) as Buffer;return `${salt}:${key.toString('hex')}`;}
export async function passwordValid(password:string,value:string){const [salt,key]=value.split(':');if(!salt||!key)return false;const actual=await scrypt(password,salt,64) as Buffer;const expected=Buffer.from(key,'hex');return expected.length===actual.length&&timingSafeEqual(actual,expected);}
export const profile=(row:Record<string,any>):Profile=>({id:row.id,code:row.code,name:row.display_name,guest:!row.handle,handle:row.handle,rating:row.rating});
export async function sessionPlayer(c:DBClient,token:string|undefined):Promise<Profile|null>{if(!token)return null;const {rows}=await c.query('SELECT a.* FROM sessions s JOIN accounts a ON a.id=s.player_id WHERE s.token_hash=$1 AND s.expires_at>now()',[hash(token)]);return rows[0]?profile(rows[0]):null;}
export async function issueSession(c:DBClient,id:string){const token=randomBytes(32).toString('base64url');await c.query('DELETE FROM sessions WHERE player_id=$1 AND expires_at<now()',[id]);await c.query('INSERT INTO sessions(token_hash,player_id,expires_at) VALUES($1,$2,$3)',[hash(token),id,new Date(Date.now()+SESSION_AGE*1000)]);return token;}
export async function limit(c:DBClient,key:string,max:number,seconds:number){const name=hash(key);const {rows}=await c.query(`INSERT INTO rate_limits(key,window_start,count) VALUES($1,now(),1) ON CONFLICT(key) DO UPDATE SET window_start=CASE WHEN rate_limits.window_start<now()-($2::int*interval '1 second') THEN now() ELSE rate_limits.window_start END,count=CASE WHEN rate_limits.window_start<now()-($2::int*interval '1 second') THEN 1 ELSE rate_limits.count+1 END RETURNING count`,[name,seconds]);return rows[0].count<=max;}
export async function createAccount(c:DBClient,name:string,handle:string|null=null,pw:string|null=null){const id=randomUUID();let code:string='';for(let i=0;i<8;i++){code=String(randomInt(100000000,999999999));const old=await c.query('SELECT id FROM accounts WHERE code=$1',[code]);if(!old.rows.length)break;}await c.query('INSERT INTO accounts(id,code,handle,password_hash,display_name) VALUES($1,$2,$3,$4,$5)',[id,code,handle,pw,name]);await c.query('INSERT INTO player_state(player_id,state) VALUES($1,$2)',[id,JSON.stringify(initialState())]);return id;}
export async function authenticate(token:string|undefined){return transaction(async c=>{const p=await sessionPlayer(c,token);if(!p)throw new GameError('UNAUTHENTICATED','ログインし直してください。',401);return p;});}
