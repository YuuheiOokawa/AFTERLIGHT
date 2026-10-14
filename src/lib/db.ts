import {Pool, type PoolClient} from 'pg';
import {PGlite} from '@electric-sql/pglite';
import {SCHEMA} from './schema';
export type Row=Record<string,any>;
export type DBClient={query:(sql:string,params?:unknown[])=>Promise<{rows:Row[];rowCount?:number|null}>};
type Connection={pool?:Pool;local?:PGlite};
const globalDB=globalThis as unknown as {afterlightDb?:Promise<Connection>;afterlightQueue?:Promise<void>};
async function initialize():Promise<Connection>{
 if(process.env.DATABASE_URL){const pool=new Pool({connectionString:process.env.DATABASE_URL,max:5,idleTimeoutMillis:10000,connectionTimeoutMillis:10000});return {pool};}
 if(process.env.VERCEL||process.env.NODE_ENV==='production'&&process.env.AFTERLIGHT_ALLOW_LOCAL_DB!=='1')throw new Error('DATABASE_URL is required for production.');
 const local=new PGlite(process.env.LOCAL_DB_PATH||'.local-db/afterlight');await local.waitReady;await local.exec(SCHEMA);return {local};
}
export const connection=()=>globalDB.afterlightDb??=initialize();
export async function transaction<T>(run:(client:DBClient)=>Promise<T>):Promise<T>{const conn=await connection();
 if(conn.pool){const c:PoolClient=await conn.pool.connect();try{await c.query('BEGIN');const value=await run(c as DBClient);await c.query('COMMIT');return value;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 const before=globalDB.afterlightQueue??Promise.resolve();let release:()=>void=()=>{};globalDB.afterlightQueue=new Promise<void>(r=>release=r);await before;
 try{return await conn.local!.transaction(async local=>run({query:async(sql,params)=>{const r=await local.query<Row>(sql,params);return {rows:r.rows,rowCount:r.affectedRows};}}));}finally{release();}
}
export async function migrate(){const c=await connection();if(c.pool)await c.pool.query(SCHEMA);else await c.local!.exec(SCHEMA);}
export async function closeDB(){const c=await connection();if(c.pool)await c.pool.end();else await c.local!.close();delete globalDB.afterlightDb;delete globalDB.afterlightQueue;}
