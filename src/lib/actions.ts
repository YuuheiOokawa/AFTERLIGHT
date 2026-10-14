import {z} from 'zod';
const ids=z.array(z.string().min(1).max(80)).min(1).max(100);const id=z.string().min(1).max(80);
const base={expectedVersion:z.number().int().nonnegative()};
const action=<T extends z.ZodRawShape>(shape:T)=>z.object({...base,...shape}).strict();
export const ActionSchema=z.discriminatedUnion('kind',[
 action({kind:z.literal('battle.start'),mode:z.enum(['story','tower','corridor','arena','boss','trial']),questId:id,opponent:z.string().uuid().optional(),supportPlayer:z.string().uuid().optional()}),
 action({kind:z.literal('battle.act'),battleId:z.string().uuid(),seq:z.number().int().positive(),actor:id,target:id,type:z.enum(['attack','skill','guard'])}),
 action({kind:z.literal('battle.support'),battleId:z.string().uuid(),seq:z.number().int().positive(),target:id}),
 action({kind:z.literal('story.read'),sceneId:id}),
 action({kind:z.literal('equip.echoCraft'),itemKind:z.enum(['weapon','armor','relic'])}),
 action({kind:z.literal('battle.guard'),battleId:z.string().uuid(),seq:z.number().int().positive()}),
 action({kind:z.literal('battle.retreat')}),
 action({kind:z.literal('quest.sweep'),questId:id,count:z.number().int().min(1).max(20)}),
 action({kind:z.literal('unit.enhance'),ids,delta:z.number().int().min(1).max(20)}),
 action({kind:z.literal('unit.awaken'),id}),action({kind:z.literal('unit.skill'),id}),
 action({kind:z.literal('unit.branch'),id,branch:z.union([z.literal(1),z.literal(2)])}),
 action({kind:z.literal('unit.exchange'),id}),
 action({kind:z.literal('party.save'),ids:z.array(id).length(5),slot:z.number().int().min(0).max(2)}),
 action({kind:z.literal('party.load'),slot:z.number().int().min(0).max(2)}),
 action({kind:z.literal('support.set'),id}),
 action({kind:z.literal('equip.enhance'),ids,delta:z.number().int().min(1).max(20)}),
 action({kind:z.literal('equip.set'),id,owner:z.string().max(80).nullable()}),
 action({kind:z.literal('equip.lock'),id,locked:z.boolean()}),
 action({kind:z.literal('equip.craft'),itemKind:z.enum(['weapon','armor','relic'])}),
 action({kind:z.literal('equip.reforge'),id,trait:z.enum(['atk','hp','def'])}),
 action({kind:z.literal('equip.recycle'),ids}),
 action({kind:z.literal('gacha.draw'),count:z.union([z.literal(1),z.literal(10)])}),
 action({kind:z.literal('daily.claim')}),action({kind:z.literal('achievement.claim'),id}),
 action({kind:z.literal('story.choose'),chapter:z.number().int().min(1).max(12),choice:z.union([z.literal(0),z.literal(1)])}),
 action({kind:z.literal('friend.request'),code:z.string().regex(/^\d{9}$/)}),
 action({kind:z.literal('friend.accept'),requestId:z.string().uuid()}),
 action({kind:z.literal('friend.remove'),target:z.string().uuid()}),
 action({kind:z.literal('friend.block'),target:z.string().uuid()}),action({kind:z.literal('friend.unblock'),target:z.string().uuid()}),
 action({kind:z.literal('guild.create'),name:z.string().trim().min(2).max(24)}),
 action({kind:z.literal('guild.join'),guildId:z.string().uuid()}),action({kind:z.literal('guild.leave')}),
 action({kind:z.literal('guild.contribute'),amount:z.union([z.literal(10),z.literal(50)])}),
 action({kind:z.literal('guild.stamp'),stamp:z.number().int().min(0).max(5)}),action({kind:z.literal('guild.claim')})
]);
export type Action=z.infer<typeof ActionSchema>;
