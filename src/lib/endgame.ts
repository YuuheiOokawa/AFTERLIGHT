import {unit} from './content';
import type {GameState,OwnedUnit} from './types';
import type {Element,Enemy,Role} from './types';
export type BossChallenge={id:string;name:string;image:string;element:Element;gimmick:Enemy['gimmick'];tier:number;level:number;unlock:number;description:string;rule:'overdrive'|'silence'|'poison'|'judgement'|'reflection'|'bulwark'};
const themes:[string,string,Element,Enemy['gimmick'],BossChallenge['rule'],string][]=[
['止まらない機関','enemy01','fire','revenge','overdrive','HP半分で機関が加速。攻撃力が上がり、単体技の連打へ移る。'],
['未刊の司書','enemy02','water','seal','silence','3ターンごとに全員の必殺ゲージを削る。必殺の順番と支援が鍵。'],
['根を忘れた鹿','enemy03','wind','roots','poison','根の毒が徐々に強まる。長期戦になる前にブレイクを重ねよう。'],
['選ばない審判','enemy04','light','judge','judgement','偶数ターンに障壁を回復。防御を固めるだけでは削り切れない。'],
['映らない海蛇','enemy05','shadow','mirror','reflection','偶数ターンの攻撃に反射。ブレイクで反射を止められる。'],
['帰路のない衛士','enemy06','fire','plain','bulwark','高い防御で攻撃を受け止め、半分以下で障壁を張り直す。']
];
export const BOSSES:BossChallenge[]=themes.flatMap(([name,image,element,gimmick,rule,description],group)=>Array.from({length:4},(_,tier)=>({id:`echo-${group+1}-${tier+1}`,name:`${name}・${['残響','深層','逆転','未明'][tier]}`,image,element,gimmick,tier,level:35+tier*15,unlock:42+tier*28,description,rule})));
export type TrialRule='weapon'|'armor'|'relic'|'roles'|'branch'|'skills';
export type ForgeTrial={id:string;name:string;level:number;unlock:number;rule:TrialRule;threshold:number;description:string;};
const trials:[TrialRule,string][]=[['weapon','刃の記録'],['armor','盾の記録'],['relic','星儀の記録'],['roles','役割の織物'],['branch','別人生の灯'],['skills','技の継承']];
export const TRIALS:ForgeTrial[]=trials.flatMap(([rule,name],group)=>Array.from({length:5},(_,tier)=>{const threshold=rule==='roles'?Math.min(5,3+Math.floor(tier/2)):rule==='branch'?tier+1:rule==='skills'?tier+2:4+tier*4;return {id:`forge-${group+1}-${tier+1}`,name:`${name} ${tier+1}`,level:15+tier*12,unlock:14+tier*14,rule,threshold,description:rule==='roles'?`編成に${threshold}種類以上の役割を含める。`:rule==='branch'?`別人生ノード${threshold}以上の継承者を編成。`:rule==='skills'?`スキルLv.${threshold}以上の継承者を編成。`:`編成中の${rule==='weapon'?'武器':rule==='armor'?'守具':'遺物'}を+${threshold}以上に強化。`};}));
export const boss=(id:string)=>BOSSES.find(b=>b.id===id);
export const trial=(id:string)=>TRIALS.find(t=>t.id===id);
export const TITLES=[{id:'echo-initiate',name:'残響に触れた者',count:1},{id:'echo-walker',name:'未明の巡礼者',count:12},{id:'echo-master',name:'二十四の夜明け',count:24}];

export function trialReady(s:GameState,id:string):boolean{const t=trial(id);if(!t||s.cleared.length<t.unlock)return false;const team=s.party.map(id=>s.units.find(u=>u.id===id)).filter((u):u is OwnedUnit=>Boolean(u));if(t.rule==='roles')return new Set(team.map(u=>unit(u.id).role)).size>=t.threshold;if(t.rule==='branch')return team.some(u=>u.branch!==0&&u.nodes>=t.threshold);if(t.rule==='skills')return team.some(u=>u.skill>=t.threshold);const kind=t.rule==='weapon'?'weapon':t.rule==='armor'?'armor':'relic';return s.equipment.some(e=>e.kind===kind&&e.plus>=t.threshold&&Boolean(e.owner)&&s.party.includes(e.owner!));}
