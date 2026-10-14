import {writeFileSync} from 'node:fs';
import {z} from 'zod';
import {ActionSchema} from '../src/lib/actions';
import {BOSSES,TRIALS} from '../src/lib/endgame';
import {STORY_SCENES} from '../src/lib/story-scenes';
import {SCHEMA} from '../src/lib/schema';
import {QUESTS,UNITS,CHAPTERS} from '../src/lib/content';
const requestSchema=z.toJSONSchema(ActionSchema,{target:'draft-2020-12'});
const errors={description:'拒否された更新はデータを変更しない',content:{'application/json':{schema:{type:'object',properties:{error:{type:'object',properties:{code:{type:'string'},message:{type:'string'}}}}}}}};
const spec={openapi:'3.1.0',info:{title:'AFTERLIGHT implemented API',version:'0.3.0',description:'現在実装済みのAPI。全更新は認証Cookie、同一Origin、JSON、操作版とIdempotencyキーで検証。'},servers:[{url:'/'}],components:{securitySchemes:{session:{type:'apiKey',in:'cookie',name:'afterlight_session'}}},paths:{
'/api/health':{get:{summary:'DB接続とmigrationのreadiness',responses:{'200':{description:'ready'},'503':{description:'DB未接続またはmigration未適用'}}}},
'/api/auth':{post:{summary:'ゲスト開始・登録・ログイン・ログアウト',requestBody:{required:true,content:{'application/json':{schema:{oneOf:[{type:'object',required:['kind','name'],properties:{kind:{const:'guest'},name:{type:'string',minLength:1,maxLength:24}}},{type:'object',required:['kind','name','handle','password'],properties:{kind:{const:'register'},name:{type:'string',minLength:1,maxLength:24},handle:{type:'string',pattern:'^[a-z0-9_]{3,24}$'},password:{type:'string',minLength:12,maxLength:128}}},{type:'object',required:['kind','handle','password'],properties:{kind:{const:'login'},handle:{type:'string'},password:{type:'string',minLength:12,maxLength:128}}},{type:'object',required:['kind'],properties:{kind:{const:'logout'}}}]}}}},responses:{'200':{description:'HttpOnly Cookie設定・更新または削除'},'401':errors,'409':errors,'422':errors,'429':errors}}},
'/api/game':{get:{summary:'自分のプロフィール・所持・戦闘・交流を取得',security:[{session:[]}],responses:{'200':{description:'Snapshot {profile, state, social}'},'401':errors,'503':errors}},post:{summary:'型付きゲーム操作を原子的に確定',security:[{session:[]}],parameters:[{name:'Idempotency-Key',in:'header',required:true,schema:{type:'string',minLength:8,maxLength:100,pattern:'^[a-zA-Z0-9_-]+$'}}],requestBody:{required:true,content:{'application/json':{schema:requestSchema}}},responses:{'200':{description:'Snapshot {profile, state, social}; 同じキー/bodyは同じ確定応答'},'401':errors,'403':errors,'409':errors,'422':errors,'429':errors,'503':errors}}}
}};
writeFileSync('docs/openapi.json',JSON.stringify(spec,null,2));writeFileSync('db/schema.sql','-- AFTERLIGHT v0.3 / generated from src/lib/schema.ts\n'+SCHEMA);
writeFileSync('docs/content-manifest.json',JSON.stringify({chapters:CHAPTERS.map(c=>({id:c.id,title:c.title,location:c.location})),units:UNITS,quests:QUESTS,bosses:BOSSES,trials:TRIALS,scenes:STORY_SCENES},null,2));
console.log(`Exported API, DB schema, ${QUESTS.length} quests, ${UNITS.length} units.`);
