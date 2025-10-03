import { player } from "../../Entities/Player";
import { game } from "../../Game";
import { attributeManager as AM, AttributeTypes as Attrs } from "../../Manager/AttributeManager";
import { eventBus as bus, EventTypes as Events } from "../../Manager/EventBus";
import { Cooldown } from "../../Utils/Cooldown";
import { Duration } from "../../Utils/Duration";
import { talentManager } from "./TalentManager";

/**
 * 天赋配置示例
 * key 为导出对象的属性名
 */
export const TalentConfigs = {
    gt归途: { // 解锁突进、格挡
        name: "归途",
        description: "“门已开启，路在脚下。唯有前行，方得解脱。”\n解锁突进、格挡。",
        maxLevel: 1,
        costs: [1],
        onActivate: (talent, level) => {
            player.state.unlock.dash = true;
            player.state.unlock.block = true;
        }
    },

    nxdk你须抵抗: { // 解锁远程攻击
        name: "你须抵抗",
        description: "“务必抵抗心魔，心魔就必然逃离。”\n解锁远程攻击。",
        prerequisites: [{ name: '归途', level: 1 }],
        maxLevel: 1,
        costs: [1],
        onActivate: (talent, level) => {
            player.state.unlock.ranged = true;
        }
    },

    nxfj你须反击: { // 解锁闪避反击
        name: "你须反击",
        description: "“举起你的武器，和祂交锋。没有规则，生存即是真理。”\n解锁闪避反击。",
        prerequisites: [{ name: '归途', level: 1 }],
        maxLevel: 1,
        costs: [1],
        onActivate: (talent, level) => {
            player.state.unlock.dodge_attack = true;
        }
    },



    nxzx你须追寻: { // 突进段数+1，但段数耗尽后首段的恢复时间延长100%
        name: "你须追寻",
        description: "“步伐不止，追寻不息。纵使踉跄，亦不驻足。”\n突进段数+1，但段数耗尽后首段的恢复时间延长100%。",
        prerequisites: [{ name: '归途', level: 1 }],
        maxLevel: 1,
        costs: [1],
        hooks: (talent, level) => [
            {   //监听突进，延长首段恢复时间
                event: Events.player.dash,
                handler: () => {
                    if (player.dash.dashCount === 0 && !talentManager.hasTalentLevel('善思', 1)) {
                        player.dash.dashCooldown.setTimeLeft(player.dash.dashCooldown.cd * 2);
                    }
                }
            }
        ],
        onActivate: (talent, level) => {
            player.dash.dashMaxCount += 1;
        },
    },

    nxpj你须破解: { // 解锁弹反
        name: "你须破解",
        description: "“尽管前进，它会为你斩去路上的荆棘。”\n解锁弹反。",
        prerequisites: [{ name: '归途', level: 1 }],
        maxLevel: 1,
        costs: [1],
        onActivate: (talent) => {
            player.state.unlock.parry = true;
        }
    },

    nxmc你须明察: { // 受击后1秒内无法再次受击
        name: "你须明察",
        description: "“穿过迷雾，洞察祂的真身，明鉴祂的意图。”\n受击后1秒内无法再次受击。",
        prerequisites: [{ name: '归途', level: 1 }],
        maxLevel: 1,
        costs: [1],
        hooks: (talent, level) => [
            {   //受击后短暂免疫
                event: Events.player.afterTakeDamage,
                handler: () => {
                    player.invinDuration.start(1000);
                }
            }
        ]
    },

    zm直面: { // 远程武器弹射次数+1
        name: "直面",
        description: "“与祂面对面，质问祂，击败祂。”\n远程武器可以被墙壁反弹1次。",
        prerequisites: [{ name: '你须抵抗', level: 1 }],
        maxLevel: 1,
        costs: [5]
    },

    fq奋起: { // 近战攻击范围扩大
        name: "奋起",
        description: "“不要让威胁靠近。”\n近战攻击范围扩大。",
        prerequisites: [{ name: '你须抵抗', level: 1 }],
        maxLevel: 1,
        costs: [5]
    },

    fs放松: { // 触发闪避时：恢复1.5%生命。闪避反击时：额外再恢复1.5%生命。
        name: "放松",
        description: "“它说，即使在困境，也要苦中作乐。”\n触发闪避时：恢复1.5%生命。\n闪避反击时：额外再恢复1.5%生命。",
        prerequisites: [{ name: '你须反击', level: 1 }],
        excludes: ['愉悦'],
        maxLevel: 1,
        costs: [5],
        hooks: (talent, level) => [
            {   //闪避恢复生命
                event: Events.player.dodge,
                handler: () => {
                    player.takeHeal(player.state.hp_max * 0.015, talent.name);
                }
            },
            {   //闪避反击恢复生命
                event: Events.player.dodge_attack,
                handler: () => {
                    player.takeHeal(player.state.hp_max * 0.015, talent.name);
                }
            }
        ]
    },

    yy愉悦: { // 闪避反击的基础倍率由2提高至3
        name: "愉悦",
        description: "“一步步前进，你会为你的成功而感受到快意。”\n闪避反击的基础倍率由2提高至3。",
        prerequisites: [{ name: '你须反击', level: 1 }],
        excludes: ['放松'],
        maxLevel: 1,
        costs: [5]
    },

    ss善思: { // 消除“你须追寻”的冷却延长效果
        name: "善思",
        description: "“它说，以巧思代蛮力，路径便不再艰涩。”\n消除“你须追寻”的冷却延长效果。",
        prerequisites: [{ name: '你须追寻', level: 1 }],
        excludes: ['机敏'],
        maxLevel: 1,
        costs: [5]
    },

    jm机敏: { // 突进无敌帧延长0.1秒，突进距离略微延长
        name: "机敏",
        description: "“你要使你的头脑灵光，使你的肉体灵敏，连心魔都无法企及。”\n突进的无敌帧延长0.1秒，突进距离略微延长。",
        prerequisites: [{ name: '你须追寻', level: 1 }],
        excludes: ['善思'],
        maxLevel: 1,
        costs: [5],
        effects: (level) => {
            return {
                [Attrs.player.DASH_DURATION]: 100
            }
        }
    },

    ch聪慧: { // 弹反后额外获得0.3秒无敌
        name: "聪慧",
        description: "“最佳的防御，源于预判与从容。”\n弹反后额外再获得0.3秒的无敌。",
        prerequisites: [{ name: '你须破解', level: 1 }],
        excludes: ['热烈'],
        maxLevel: 1,
        costs: [5],
        hooks: (talent, level) => [
            {   //弹反后获得短暂无敌
                event: Events.player.parry,
                handler: (payload) => {
                    if (player.invinDuration.remaining() > 300) return;
                    player.invinDuration.start(300);
                }
            }
        ]
    },

    rl热烈: { // 弹反远程攻击时对周围敌人造成伤害
        name: "热烈",
        description: "“你的心要火热，你的心要诚挚，连无情的命运都会垂青于你。”\n弹反远程攻击时对周围敌人造成伤害。",
        prerequisites: [{ name: '你须破解', level: 1 }],
        excludes: ['聪慧'],
        maxLevel: 1,
        costs: [5]
    },

    wq顽强: { // 触发弹反时立即刷新所有突进段数
        name: "顽强",
        description: "“她不会倒下，她希望寻得家园，因而她再一次站起。”\n条件触发，弹反时立即刷新所有突进段数。",
        prerequisites: [{ name: '你须破解', level: 1 }],
        excludes: ['冷静'],
        maxLevel: 1,
        costs: [5],
        hooks: (talent, level) => [
            {   //弹反时刷新突进段数
                event: Events.player.parry,
                handler: (payload) => {
                    player.dash.refreshDashCount();
                }
            }
        ]
    },

    lj冷静: { // 格挡无视伤害的方向
        name: "冷静",
        description: "“让思绪平静，让想法生长。”\n格挡无视伤害的方向。",
        prerequisites: [{ name: '你须破解', level: 1 }],
        excludes: ['顽强'],
        maxLevel: 1,
        costs: [5],
    },

    lz理智: { // 造成的伤害提高15%
        name: "理智",
        description: "“望过那些疯狂，望过那些绝望，也莫要被情绪冲昏头脑。”\n造成的伤害提高15%。",
        prerequisites: [{ name: '你须明察', level: 1 }],
        excludes: ['隐忍'],
        maxLevel: 1,
        costs: [5],
        effects: (level) => {
            return {
                [Attrs.player.DMG]: 0.15
            }
        }
    },

    yr隐忍: { // 受到的伤害降低15%
        name: "隐忍",
        description: "“在低谷时被羞辱，仍能不动声色，这亦是一种复仇的智慧。”\n受到的伤害降低15%。",
        prerequisites: [{ name: '你须明察', level: 1 }],
        excludes: ['理智'],
        maxLevel: 1,
        costs: [5],
        effects: (level) => {
            return {
                [Attrs.player.TAKE_DMG]: -0.15
            }
        }
    },

    yg勇敢: { // 每级攻击力+10%
        name: "勇敢",
        description: "“明知恐惧，却仍选择向前。”\n每级攻击力提高10%。",
        prerequisites: [{ name: '直面', level: 1 }, { name: '奋起', level: 1 }],
        maxLevel: 4,
        costs: [2, 2, 2, 2],
        effects: (level) => {
            return {
                [Attrs.player.ATK]: 0.1 * level
            }
        }
    },

    jq急切: { // 每级移动速度+10%
        name: "急切",
        description: "“祂说，一切的罪恶都会到来审判。但你无暇去等，便自己去争取。”\n每级移动速度提高10%。",
        prerequisites: [{ name: '放松', level: 1 }, { name: '愉悦', level: 1 }, { name: '机敏', level: 1 }, { name: '善思', level: 1 }],
        maxLevel: 4,
        costs: [2, 2, 2, 2],
        effects: (level) => {
            return {
                [Attrs.player.SPD]: 0.1 * level
            }
        }
    },

    kp渴盼: { // 每级生命上限+10%
        name: "渴盼",
        description: "“对‘生’的渴望，本身便是力量之源。”\n每级生命上限提高10%。",
        prerequisites: [{ name: '聪慧', level: 1 }, { name: '热烈', level: 1 }, { name: '顽强', level: 1 }, { name: '冷静', level: 1 }],
        maxLevel: 4,
        costs: [2, 2, 2, 2],
        effects: (level) => {
            return {
                [Attrs.player.HP]: 0.1 * level
            }
        }
    },

    jb戒备: { // 每级格挡系数-0.05（格挡时受到的伤害进一步降低）
        name: "戒备",
        description: "“曾经的伤痕，让我更懂得如何保护自己。”\n格挡时受到的伤害进一步降低。",
        prerequisites: [{ name: '理智', level: 1 }, { name: '隐忍', level: 1 }],
        maxLevel: 4,
        costs: [2, 2, 2, 2],
        effects: (level) => {
            return {
                [Attrs.player.BlockDamageReduction]: -0.05 * level
            }
        }
    },

    ns凝神: { // 远程武器弹射次数+1，子弹速度加快300%
        name: "凝神",
        description: "“她屏住呼吸，目光就像要贯穿面前的敌人。”\n远程武器的弹射次数额外+1，子弹速度加快300%。",
        prerequisites: [{ name: '直面', level: 1 }],
        maxLevel: 1,
        costs: [3]
    },

    zf振奋: { // 近战武器命中敌人时：近战攻击造成的伤害提高10%，持续10秒，最多叠加5层，持续时间独立计算
        name: "振奋",
        description: "“她拾起精神，再一次宣告自己的存在与成长。”\n近战武器命中敌人时：近战攻击造成的伤害提高10%，持续10秒，最多叠加5层。",
        prerequisites: [{ name: '奋起', level: 1 }],
        maxLevel: 1,
        costs: [3],
        hooks: (talent, level) => [
            {   //近战命中时增加伤害层数
                event: Events.player.dealDamage,
                handler: (payload) => {
                    const { attackType, attacker } = payload;
                    if (attacker === player && attackType === 'melee') {
                        AM.addAttr(Attrs.player.DMG, 0.1, talent.name, 10000, 5);
                    }
                }
            }
        ]
    },

    xl心流: { // 远程攻击改为二连发，但造成的伤害降低20%
        name: "心流",
        description: "“随着心中的思绪起舞，如同流水般的顺滑”\n远程攻击改为二连发，但造成的伤害降低20%。",
        prerequisites: [{ name: '凝神', level: 1 }],
        excludes: ['专注'],
        maxLevel: 1,
        costs: [4],
        effects: (level) => {
            return {
                [Attrs.player.RangedDmg]: -0.2
            }
        },
        hooks: (talent, level) => [
            // {   //TODO:远程二连发
            //     event: Events.player.ranged_attack,
            //     handler: (payload) => {
            //         const { attackType, attacker } = payload;
            //         if (attacker === player && attackType === 'ranged') {
            //             setTimeout(() => {
            //                 bus.emit(Events.player.ranged_attack, payload);
            //             }, 100);
            //         }
            //     }
            // }
        ]
    },

    zz专注: { // 远程攻击的前摇增大（+500），造成的伤害提高150%且可以穿透
        name: "专注",
        description: "“汇聚所有于一点，以求石破天惊。”\n远程攻击的前摇增大（+500），造成的伤害提高150%且可以穿透。",
        prerequisites: [{ name: '凝神', level: 1 }],
        excludes: ['心流'],
        maxLevel: 1,
        costs: [4],
        effects: (level) => {
            return {
                [Attrs.player.RangedStartupTime]: 500
            }
        },
        hooks: (talent, level) => [
            {   //远程攻击伤害提高
                event: Events.player.dealDamage,
                handler: (payload) => {
                    const { attackType, attacker } = payload;
                    if (attacker === player && attackType === 'ranged') {
                        return { ...payload, baseDamage: payload.baseDamage * 2.5 };
                    }
                },
                priority: -1
            }
        ]
    },

    ja骄傲: { // 近战击败敌人后攻击力+60%，持续5秒，最多叠加2次
        name: "骄傲",
        description: "“胜利的滋味，让我确信自身价值无可比拟。”\n近战击败敌人后攻击力+60%，持续5秒，最多叠加2次。",
        prerequisites: [{ name: '振奋', level: 1 }],
        excludes: ['满足'],
        maxLevel: 1,
        costs: [4],
        hooks: (talent, level) => [
            {   //近战击败敌人后增加攻击力层数
                event: Events.enemy.die,
                handler: (payload) => {
                    const { attackType, Attacker } = payload;
                    if (Attacker === player && attackType === 'melee') {
                        AM.addAttr(Attrs.player.ATK, 0.6, talent.name, 5000, 2);
                    }
                }
            }
        ]
    },

    mz满足: { // 近战击败敌人时恢复5%生命
        name: "满足",
        description: "“他说，你应该无缺无憾，让自己意随心动。”\n近战击败敌人时恢复5%生命。",
        prerequisites: [{ name: '振奋', level: 1 }],
        excludes: ['骄傲'],
        maxLevel: 1,
        costs: [4],
        hooks: (talent, level) => [
            {   //近战击败敌人时恢复生命
                event: Events.enemy.die,
                handler: (payload) => {
                    const { attackType, Attacker } = payload;
                    if (Attacker === player && attackType === 'melee') {
                        player.takeHeal(player.state.hp_max * 0.05, talent.name);
                    }
                }
            }
        ]
    },

    xs闲适: { // 闪避反击时恢复所有突进段数
        name: "闲适",
        description: "“他说，你应该无缺无憾，让自己心随意动”\n闪避反击时恢复所有突进段数。",
        prerequisites: [{ name: '放松', level: 1 }, { name: '愉悦', level: 1 }],
        excludes: ['坚定'],
        maxLevel: 1,
        costs: [5],
        hooks: (talent, level) => [
            {   //闪避反击时恢复所有突进段数
                event: Events.player.dodge_attack,
                handler: () => {
                    player.dash.refreshDashCount();
                }
            }
        ]
    },

    jd坚定: { // 受到超过自身生命上限25%的伤害时，免除之，每个房间只触发一次
        name: "坚定",
        description: "“他说，你应该坚固自己，不至于以卵击石。”\n受到超过自身生命上限25%的伤害时，免除之，每个房间只触发一次。",
        prerequisites: [{ name: '放松', level: 1 }, { name: '愉悦', level: 1 }],
        excludes: ['闲适'],
        maxLevel: 1,
        costs: [5],
        hooks: (talent, level) => [
            {   //受击时检查是否免疫
                event: Events.player.takeDamage,
                handler: (payload) => {
                    if (payload.baseDamage >= player.state.hp_max * 0.25 && talent.state.talent_activated == false) {
                        talent.state.talent_activated = true;
                        return { ...payload, baseDamage: 0 }; // 视为未受伤害
                    }
                },

            },
            {
                event: Events.game.enter.next_room,
                handler: () => {
                    talent.state.talent_activated = false;
                }
            }
        ]
    },

    yx一心: { // 突进的冷却时间进一步缩短25%
        name: "一心",
        description: "“心念纯粹，则步履不停，前路自显。”\n突进的冷却时间进一步缩短25%。",
        prerequisites: [{ name: '善思', level: 1 }, { name: '机敏', level: 1 }],
        excludes: ['安宁'],
        maxLevel: 1,
        costs: [5],
        effects: (level) => {
            return {
                [Attrs.player.DASH_CHARGE]: 0.25
            }
        }
    },

    an安宁: { // 进入房间后受到的前2次伤害将被免除
        name: "安宁",
        description: "你当为自己而活，因而问心无愧。”\n进入房间后受到的前2次伤害将被免除。",
        prerequisites: [{ name: '善思', level: 1 }, { name: '机敏', level: 1 }],
        excludes: ['一心'],
        maxLevel: 1,
        costs: [5],
        hooks: (talent, level) => [
            {   //受击时检查是否免疫
                event: Events.player.takeDamage,
                handler: (payload) => {
                    if (talent.state.damage_immune_count > 0) {
                        talent.state.damage_immune_count -= 1;
                        return { ...payload, baseDamage: 0 }; // 视为未受伤害
                    }
                },
            },
            {
                event: Events.game.enter.next_room,
                handler: () => {
                    talent.state.damage_immune_count = 2;
                }
            }

        ]
    },

    ch憧憬: { // 弹反后10秒内受到的伤害降低40%
        name: "憧憬",
        description: "“她也曾想象独自一人身处繁花锦簇。”\n弹反后10秒内受到的伤害降低40%。",
        prerequisites: [{ name: '渴盼', level: 1 }],
        excludes: ['向往'],
        maxLevel: 1,
        costs: [5],
        hooks: (talent, level) => [
            {   //弹反后获得减伤效果
                event: Events.player.parry,
                handler: (payload) => {
                    AM.addAttr(Attrs.player.TAKE_DMG, -0.4, talent.name, 10000);
                }
            }
        ]
    },

    xw向往: { // 弹反时恢复3%生命值
        name: "向往",
        description: "“她亦盼望，期待最爱的格桑花从天边绽放遍野，掩盖曾经的苦痛。”\n弹反时恢复3%生命值。",
        prerequisites: [{ name: '渴盼', level: 1 }],
        excludes: ['憧憬'],
        maxLevel: 1,
        costs: [5],
        hooks: (talent, level) => [
            {//弹反后恢复生命
                event: Events.player.parry,
                handler: (payload) => {
                    player.takeHeal(player.state.hp_max * 0.03, talent.name);
                }
            }
        ]
    },

    zl自律: { // 弹反后1.5秒内受击将视为再次弹反（每5秒最多触发3次）
        name: "自律",
        description: "“闻鸡起舞，早起晚归，正如曾经的每一个岁月，但目的已然不同。”\n条件触发，弹反后1.5秒内受击将视为再次弹反（每5秒最多触发3次）。",
        prerequisites: [{ name: '渴盼', level: 1 }],
        excludes: ['不屈'],
        maxLevel: 1,
        costs: [5],
        hooks: (talent, level) => [
            {
                event: Events.game.tick,
                handler: ({ deltaTime }) => {
                    talent.state.parry_timer.tick(deltaTime);
                },
                priority: 1
            },
            {   //弹反后获得短暂的“再次弹反”状态
                event: Events.player.parry,
                handler: (payload) => {//无论是否就绪，都刷新状态计时
                    talent.state.parry_timer.start();
                }
            },
            {   //受击时检查是否处于“再次弹反”状态，如果是且计数器小于3，则触发弹反，弹反计数器+1
                event: Events.player.takeDamage,
                handler: (payload) => {
                    // 只有在弹反窗口内（parry_timer 未就绪）且计数未达上限时触发
                    if (talent.state.parry_timer.finished()) return;
                    if (AM.getAttrStackCount(Attrs.other.talent, talent.name) >= 3) return;
                    AM.addAttr(Attrs.other.talent, 1, talent.name, 5000, 3); // 增加弹反计数，持续5秒

                    const { baseDamage, attackType, attacker, projectile } = payload;
                    player.block.performParry({ attackType, damage: baseDamage, attacker, projectile });

                    // 将本次受击视为弹反：视为未受到该次伤害
                    return { ...payload, baseDamage: 0 };
                }
            }
        ],
        state: {
            parry_timer: new Duration(1500),
        }
    },


    bq不屈: { // 受到致命伤害时取消之（每30秒最多触发1次）
        name: "不屈",
        description: "“只要意志不灭，便无人能真正将我击倒。”\n条件触发，每30秒仅1次，受到致命伤时取消之。",
        prerequisites: [{ name: '渴盼', level: 1 }],
        excludes: ['自律'],
        maxLevel: 1,
        costs: [5],
        hooks: (talent, level) => [
            {
                event: Events.game.tick,
                handler: ({ deltaTime }) => {
                    talent.state.zlTimer.tick(deltaTime);
                },
                priority: 1
            },
            {   //受击时检查是否致命
                event: Events.player.fatelDmg,
                handler: (payload) => {
                    const { hpBefore } = payload;
                    if (talent.state.zlTimer.ready()) {
                        talent.state.zlTimer.start();
                        player.state.hp = hpBefore;
                        return true;
                    }
                },
            }
        ],
        state: {
            zlTimer: new Cooldown(30000)
        }
    },

    gq关切: { // 攻击命中敌人时，若自身的生命值低于36%，则恢复3%的生命值。
        name: "关切",
        description: "“它将视野拂过女孩心中的漫山遍野，眼里充满了慈爱与关心”\n攻击命中敌人时，若自身的生命值低于36%，则恢复3%的生命值",
        prerequisites: [{ name: '戒备', level: 1 }],
        excludes: ['浪漫'],
        maxLevel: 1,
        costs: [5],
        hooks: (talent, level) => [
            {   //攻击命中敌人时检查生命值并恢复
                event: Events.player.dealDamage,
                handler: (payload) => {
                    if (player.state.hp / player.state.hp_max < 0.36) {
                        player.takeHeal(player.state.hp_max * 0.03, talent.name);
                    }
                }
            }
        ]
    },

    lm浪漫: { // 生命值低于40%时恢复30%生命，30秒仅触发1次
        name: "浪漫",
        description: "“唯有此物，至死不渝”\n30秒仅一次，生命值低于40%时恢复30%生命。",
        prerequisites: [{ name: '戒备', level: 1 }],
        excludes: ['关切'],
        maxLevel: 1,
        costs: [5],
        hooks: (talent, level) => [
            {   //每帧检查冷却
                event: Events.game.tick,
                handler: ({ deltaTime }) => {
                    talent.state.cooldown.tick(deltaTime);
                }
            },
            {   //检查触发恢复
                event: Events.player.hpPercent,
                handler: (hpPercent) => {
                    if (hpPercent < 0.4 && talent.state.cooldown.ready()) {
                        talent.state.cooldown.start();
                        player.takeHeal(player.state.hp_max * 0.3, talent.name);
                    }
                },
            }
        ],
        onActivate: (talent, level) => {
            talent.state.cooldown = new Cooldown(30000);
        }
    },

    wyzx我应自信: { // 条件触发，生命值不满时攻击力+30%，生命值低于60%时效果翻倍
        name: "我应自信",
        description: "“我无需完美无缺。我的存在，我的抗争，本身便是价值。力量源于我对自我的认可，而非他人的评判。”\n生命值不满时攻击力+30%，生命值低于60%时效果翻倍。\n解除与自己相连全部节点的排斥关系。",
        prerequisites: [{ name: '专注', level: 1 }, { name: '心流', level: 1 }, { name: '骄傲', level: 1 }, { name: '满足', level: 1 }],
        maxLevel: 1,
        costs: [8],
        unlock_excludes: ["专注", "心流", "骄傲", "满足"],
        hooks: (talent, level) => [
            {   //每帧检查生命值并更新攻击力加成
                event: Events.player.hpPercent,
                handler: (hpPercent) => {
                    if (hpPercent < 0.6) {
                        AM.addAttr(Attrs.player.ATK, 0.6, talent.name, null, 1);
                    } else if (hpPercent < 1) {
                        AM.addAttr(Attrs.player.ATK, 0.3, talent.name, null, 1);
                    } else {
                        AM.removeAttrBySource(Attrs.player.ATK, talent.name);
                    }
                }
            }
        ]
    },

    wyza我应自爱: { // 突进段数+1，突进时对路径上的首个碰撞到的敌人造成近战普攻伤害
        name: "我应自爱",
        description: "“我的每一步，皆是为自己而踏。我的剑与盾，只为守护我所珍视的一切——包括我自己。”\n突进段数+1，突进时对路径上的首个碰撞到的敌人造成近战普攻伤害。\n解除与自己相连全部节点的排斥关系。",
        prerequisites: [{ name: '闲适', level: 1 }, { name: '坚定', level: 1 }, { name: '安宁', level: 1 }, { name: '一心', level: 1 }],
        maxLevel: 1,
        costs: [8],
        unlock_excludes: ["闲适", "坚定", "安宁", "一心", "放松", "愉悦", "机敏", "善思"],
        onActivate: (talent, level) => {
            player.dash.dashMaxCount += 1;
            talent.state.hitThisDash = false;
            talent.state.lastPosition = null;
        },
        hooks: (talent, level) => [
            {
                event: Events.player.dash,
                handler: () => {
                    talent.state.hitThisDash = false;
                    state.lastPosition = player.hitbox.position.copy();
                }
            },
            {   //突进时对路径上的首个碰撞到的敌人造成近战普攻伤害
                event: Events.game.tick,
                handler: () => {
                    if (!player.dash.isDashing) return;
                    const state = talent.state;
                    const currentPos = player.hitbox.position.copy();
                    if (!state.lastPosition) state.lastPosition = currentPos.copy();

                    if (!state.hitThisDash) {
                        for (const enemy of game.enemies) {
                            if (hitbox.checkMovingHit(enemy.hurtBox, state.lastPosition, currentPos)) {
                                const meleeAttack = player.attack.melee;
                                meleeAttack.applyDamage(enemy, meleeAttack.damage);
                                state.hitThisDash = true;
                                break;
                            }
                        }
                    }

                    state.lastPosition = currentPos.copy();
                }
            }
        ]
    },

    wyzq我应自强: { // 触发格挡、闪避或弹反后攻击力+80%，最多叠加2层，下一次造成伤害1秒后清除
        name: "我应自强",
        description: "“我不再等待救赎。我的力量，我于逆境中挥出的每一击，都在塑造一个更强大的我。”\n格挡、闪避或弹反后攻击力+80%，最多叠加2层，下一次普攻后1秒内清除。\n解除与自己相连全部节点的排斥关系。",
        prerequisites: [{ name: '向往', level: 1 }, { name: '憧憬', level: 1 }, { name: '不屈', level: 1 }, { name: '自律', level: 1 }],
        maxLevel: 1,
        costs: [8],
        unlock_excludes: ["向往", "憧憬", "不屈", "自律", "聪慧", "热烈", "顽强", "冷静"],
        hooks: (talent, level) => [
            {   //格挡时增加攻击力层数
                event: Events.player.block,
                handler: () => {
                    AM.addAttr(Attrs.player.ATK, 0.8, talent.name, null, 2);
                }
            },
            {   //闪避时增加攻击力层数
                event: Events.player.dodge,
                handler: () => {
                    AM.addAttr(Attrs.player.ATK, 0.8, talent.name, null, 2);
                }
            },
            {   //弹反时增加攻击力层数
                event: Events.player.parry,
                handler: () => {
                    AM.addAttr(Attrs.player.ATK, 0.8, talent.name, null, 2);
                }
            },
            {   //造成伤害后启动清除计时器（仅在未启动时开始）
                event: Events.player.dealDamage,
                handler: () => {
                    if (!talent.state.atk_clear_timer.ready()) return; // 已经在倒计时中
                    talent.state.atk_clear_timer.start();
                    talent.state.atk_clear_timer_started = true;
                }
            },
            {   //清除攻击力加成（由定时器完成）
                event: Events.game.tick,
                handler: ({ deltaTime }) => {
                    if (!talent.state.atk_clear_timer_started) return;
                    talent.state.atk_clear_timer.tick(deltaTime);
                    if (talent.state.atk_clear_timer.ready()) {
                        AM.removeAttrBySource(Attrs.player.ATK, talent.name);
                        talent.state.atk_clear_timer_started = false;
                    }
                }
            }
        ],
        state: {
            atk_clear_timer: new Cooldown(1000),
            atk_clear_timer_started: false
        }
    },

    wyzz我应自尊: { // 对生命值高于50%的敌人造成的伤害提高30%
        name: "我应自尊",
        description: "“我的锋芒，当指向那些傲慢的压迫。我值得被任何人尊重，包括我自己。”\n对生命值高于50%的敌人造成的伤害提高30%。\n解除与自己相连全部节点的排斥关系。",
        prerequisites: [{ name: '关切', level: 1 }, { name: '浪漫', level: 1 }],
        maxLevel: 1,
        costs: [8],
        unlock_excludes: ["关切", "浪漫", "理智", "隐忍"],
        hooks: (talent, level) => [
            {   //对生命值高于50%的敌人造成的伤害提高30%
                event: Events.player.dealDamage,
                handler: (payload) => {
                    const { target } = payload;
                    if (target.state.hp / target.state.hp_max > 0.5) {
                        return { ...payload, baseDamage: payload.baseDamage * 1.3 };
                    }
                }
            }
        ]
    },

};

export default TalentConfigs;
