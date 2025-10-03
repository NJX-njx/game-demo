import { attributeManager as AM, AttributeTypes as Attrs } from "../../Manager/AttributeManager";
import { player } from "../../Entities/Player";
import { eventBus as bus, EventTypes as Events } from "../../Manager/EventBus";
import { Cooldown } from "../../Utils/Cooldown";
import { itemManager } from "./ItemManager";

export const ItemTags = {
    NO_EXCHANGE: "noExchange",       //不可交换
    NO_DROP: "noDrop",               //不可丢弃
    NO_RANDOM: "noRandom",           //不随机掉落
    FIXED_EXCHANGE: "fixedExchange", //固定交换结果，须同时指定exchangeToName

    UNIQUE_GLOBAL: "uniqueGlobal",   // 全局唯一，本局只能获得一个
    UNIQUE_SINGLE: "uniqueSingle",   // 同时只能持有一个
    MULTIPLE: "multiple"             // 可同时获得多个
}

export const ItemTypes = {
    ENDING: "end",
    NORMAL: "normal"
}

export const ItemConfigs = {
    yy友谊: { // 【1】【1级】“友谊” 生命+25%（HP%），攻击+25%（DMG%），BOSS攻击+25%（ATK%），BOSS生命+30%（HP%）， 当生命低于25%时：每秒回复1%生命；受到致命伤害时：立即回复所有生命，战斗结束后失去，获得“悲怆”；通关时：隐藏结局
        name: "友谊",
        description: "【1】【1级】友谊：生命+25%、攻击+25%、BOSS攻击+25%、BOSS生命+30%。生命低于25%时每秒回复1%生命；受到致命伤害时立即回复所有生命，战斗结束后失去并获得‘悲怆’。",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_GLOBAL, ItemTags.NO_EXCHANGE, ItemTags.NO_DROP, ItemTags.NO_RANDOM],
        effects: {
            [Attrs.player.HP]: +0.25,
            [Attrs.player.DMG]: +0.25,
            [Attrs.boss.ATK]: +0.25,
            [Attrs.boss.HP]: +0.3
        },
        hooks: (item) => [
            {
                event: Events.game.tick,
                handler: ({ deltaTime }) => item.state.healTimer.tick(deltaTime),
                priority: 1
            },
            {   // 条件：生命<25% => 每秒恢复1%
                event: Events.player.hpPercent,
                handler: (hpPercent) => {
                    if (hpPercent < 0.25 && item.state.healTimer.ready()) {
                        item.state.healTimer.start();
                        player.takeHeal(player.state.hp_max * 0.01, item.id);
                    }
                }
            },
            {   // 条件：受到致命伤 => 立即回复所有生命；战斗结束后失去，获得“悲怆”
                event: Events.player.fatelDmg,
                handler: () => {
                    player.state.hp = player.state.hp_max;
                    // 标记战后移除并授予“悲怆”
                    bus.on({
                        event: Events.game.battle.end,
                        handler: () => {
                            itemManager.remove(item);
                            itemManager.tryAcquire(ItemConfigs.bc悲怆);
                        },
                        maxCalls: 1
                    })
                    return true;
                },
                maxCalls: 1
            },
            // {   // TODO:通关时：隐藏结局
            //     // event: Events.game.finish,
            //     // handler: (ctx) => {
            //     //     ctx.unlockEnding?.("hidden_path_friendship", { desc: "使探索开启不同的方向" });
            //     // },
            //     // maxCalls: 1
            // }
        ],
        onAcquire(item) {//TODO:获得时：触发剧情
        },
        state: {
            healTimer: new Cooldown(1000)
        }
    },

    bc悲怆: { // 【2】【1级】“悲怆” 生命-60%（HP%），击败敌人时：生命恢复8%，生命上限提高8%；叠满10层时：战斗结束后，失去该物品，获得“思念”；携带该物品通关时：触发成就“替我感受来世的温暖”
        name: "悲怆",
        description: "【2】【1级】悲怆：击败敌人时，生命恢复8%，生命上限提高8%。叠满10层时，战斗结束后，失去该物品，获得“思念”。",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_GLOBAL, ItemTags.NO_EXCHANGE, ItemTags.NO_DROP, ItemTags.NO_RANDOM],
        effects: {
            [Attrs.player.HP]: -0.6
        },
        hooks: (item) => [
            {   // 条件：击败敌人时 => 生命恢复8%，生命上限提高8%；叠满10层时，战斗结束后，失去该物品，获得“思念”
                event: Events.enemy.die,
                handler: () => {
                    AM.addAttr(Attrs.player.HP, 0.08, item.id);
                    if (AM.getAttrStackCount(Attrs.player.HP, item.id) == 10) {
                        bus.on({
                            event: Events.game.battle.end,
                            handler: () => {
                                itemManager.remove(item);
                                itemManager.tryAcquire(ItemConfigs.sn思念);
                            },
                            maxCalls: 1
                        });
                    }
                }
            },
            {   // TODO:通关时：触发成就“替我感受来世的温暖”
                event: Events.game.finish,
                handler: (ctx) => {
                },
                maxCalls: 1
            }
        ],
        onAcquire(item) {//TODO:获得时：触发剧情
        }
    },

    sn思念: { // 【3】【1级】“思念” 生命+20%（HP%），造成伤害时，随机触发一种：造成的伤害提升15%；下次受到的伤害降低30%；恢复1%生命；携带该物品通关时：触发成就“替我感受来世的温暖”
        name: "思念",
        description: "【3】【1级】思念：生命+20%。造成伤害时随机触发：伤害提升15%、下次受到的伤害降低30%、恢复1%生命。",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_GLOBAL, ItemTags.NO_RANDOM],
        effects: {
            [Attrs.player.HP]: 0.2
        },
        hooks: (item) => [
            {
                event: Events.player.dealDamage,
                handler: (payload) => {
                    switch (Math.floor(Math.random() * 3)) {
                        case 0:
                            return { ...payload, baseDamage: payload.baseDamage * 1.15 };
                        case 1:
                            bus.on({
                                event: Events.player.takeDamage,
                                handler: (payload) => { return { ...payload, baseDamage: payload * 0.7 } },
                                maxCalls: 1,
                                source: item.id
                            });
                            break;
                        case 2:
                            player.takeHeal(player.state.hp_max * 0.01, item.id);
                            break;
                    }
                }
            }
        ],
        onAcquire(item) {//TODO:获得时：触发剧情
        }
    },

    ds胆识: { // 【4】【0级】“胆识” 敌人伤害降低15，BOSS生命提高45%（HP%）， 交换时获得“决心”；通关时：隐藏结局
        name: "胆识",
        description: "【4】【0级】胆识：敌人伤害降低15，BOSS生命提高45%。交换时获得‘决心’。使探索开启不同的方向。",
        level: 0,
        type: ItemTypes.ENDING,
        tags: [ItemTags.UNIQUE_GLOBAL, ItemTags.NO_DROP, ItemTags.NO_RANDOM, ItemTags.FIXED_EXCHANGE],
        exchangeToName: "决心",
        effects: {
            [Attrs.enemy.DMG_DEC]: -15,
            [Attrs.boss.HP]: 0.45
        },
        hooks: (item) => [
            {   // TODO:通关时：触发隐藏结局（描述：使探索开启不同的方向）
                event: Events.game.finish,
                handler: (ctx) => {
                },
                maxCalls: 1
            }
        ]
    },

    js决心: { // 【5】【0级】“决心” 敌人伤害降低10，攻击+35%（ATK%），生命-20%（HP%），交换时获得“胆识”；触发闪避反击和弹反时：受到的伤害提高60%（DMG%），持续5秒；获得时：获得10灵魂碎片，立即回复所有生命；通关时：隐藏结局；
        name: "决心",
        description: "【5】【0级】决心：攻击+35%，生命-20%。触发闪避反击/弹反时受到伤害提高60%，持续5秒。获得时恢复满血并获得10灵魂碎片。使探索开启不同的方向。",
        level: 0,
        type: ItemTypes.ENDING,
        tags: [ItemTags.UNIQUE_GLOBAL, ItemTags.NO_DROP, ItemTags.NO_EXCHANGE, ItemTags.NO_RANDOM],
        effects: {
            [Attrs.enemy.DMG_DEC]: -10,
            [Attrs.player.ATK]: 0.35,
            [Attrs.player.HP]: -0.2
        },
        hooks: (item) => [
            {   //触发闪避反击和弹反时：受到的伤害提高60%（DMG%），持续5秒
                event: Events.player.parry,
                handler: (payload) => {
                    AM.addAttr(Attrs.player.TAKE_DMG, 0.6, item.id, 5000, 1);
                }
            },
            {
                event: Events.player.dodge_attack,
                handler: (payload) => {
                    AM.addAttr(Attrs.player.TAKE_DMG, 0.6, item.id, 5000, 1);
                }
            },
            {   // TODO:通关时：触发隐藏结局（描述：使探索开启不同的方向）
                event: Events.game.finish,
                handler: (ctx) => {
                },
                maxCalls: 1
            }
        ],
        onAcquire(item) {
            //TODO: 获得10灵魂碎片
            player.state.hp = player.state.hp_max
        }
    },

    yy犹疑: { // 【6】【0级】“犹疑” 移动速度-40%（SPD%），攻击-20%（ATK%），交换时获得“观望”
        name: "犹疑",
        description: "【6】【0级】犹疑：移动速度-40%，攻击-20%。交换时获得‘观望’。使探索开启不同的方向。",
        level: 0,
        type: ItemTypes.ENDING,
        tags: [ItemTags.UNIQUE_GLOBAL, ItemTags.NO_DROP, ItemTags.NO_RANDOM, ItemTags.FIXED_EXCHANGE],
        exchangeToName: "观望",
        effects: {
            [Attrs.player.SPD]: -0.4,
            [Attrs.player.ATK]: -0.2
        }
    },

    gw观望: { // 【7】【0级】“观望” 突进的充能速度加快15%
        name: "观望",
        description: "【7】【0级】观望：突进充能速度加快15%。使探索开启不同的方向。",
        level: 0,
        type: ItemTypes.ENDING,
        tags: [ItemTags.UNIQUE_GLOBAL, ItemTags.NO_DROP, ItemTags.NO_EXCHANGE, ItemTags.NO_RANDOM],
        effects: {
            [Attrs.player.DASH_CHARGE]: 0.15
        }
    },

    hq好奇: { // 【8】【1级】“好奇” 受到的伤害提高30%（TAKE_DMG%），交换时获得“珍惜”；获得时：获得10灵魂碎片
        name: "好奇",
        description: "【8】【1级】好奇：获得时，获得10灵魂碎片。受到的伤害提高30%。交换时获得‘珍惜’。进入下一个房间前不可交换。",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_GLOBAL, ItemTags.NO_EXCHANGE, ItemTags.FIXED_EXCHANGE],
        exchangeToName: "珍惜",
        effects: {
            [Attrs.player.TAKE_DMG]: 0.3
        },
        hooks: (item) => [
            {   // 在进入下一个房间前，不可交换
                event: Events.game.enter.next_room,
                handler: () => {
                    item.removeTag(ItemTags.NO_EXCHANGE);
                }
            }
        ],
        onAcquire(item) {
            // TODO: 获得10灵魂碎片
        }
    },

    zx珍惜: { // 【9】【1级】“珍惜” 交换时获得“朗诵”；获得时：获得15灵魂碎片
        name: "珍惜",
        description: "【9】【1级】珍惜：获得时，获得15灵魂碎片。交换时获得‘朗诵’。进入下一个房间前不可交换。",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_GLOBAL, ItemTags.NO_EXCHANGE, ItemTags.NO_RANDOM, ItemTags.FIXED_EXCHANGE],
        exchangeToName: "朗诵",
        hooks: (item) => [
            {   // 在进入下一个房间前，不可交换
                event: Events.game.enter.next_room,
                handler: () => {
                    item.removeTag(ItemTags.NO_EXCHANGE);
                }
            }
        ],
        onAcquire(item) {
            // TODO: 获得15灵魂碎片
        }
    },

    ls朗诵: { // 【10】【1级】“朗诵” 获得2个额外格子（可容纳3级及以下道具）
        name: "朗诵",
        description: "【10】【1级】朗诵：获得2个额外背包格（可容纳3级及以下道具）。",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_GLOBAL, ItemTags.NO_RANDOM],
        onActivate(item) {
            itemManager.addSlots(2, { maxLevel: 3, type: ItemTypes.NORMAL }, item.id);
        },
        onDeactivate(item) {
            itemManager.removeSlotsBySource(item.id);
        },
        canRemove: (item) => {
            // 只有当扩展格子全空时才允许移除
            const extraSlots = itemManager.slots.filter(s => s._source === item.id);
            return extraSlots.every(s => s.item == null || s.item === item);
        }
    },

    xq休憩: { // 【11】【1级】“休憩” 使用时：回复40%生命，消耗道具
        name: "休憩",
        description: "【11】【1级】休憩：使用时回复40%生命并消耗该道具。该道具可重复获得。",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.MULTIPLE],
        hooks: (item) => [
            {
                event: Events.item.use,
                handler: ({ usedItem }) => {
                    if (usedItem === item) {
                        player.takeHeal(player.state.hp_max * 0.4, item.id);
                        itemManager.remove(item);
                    }
                }
            }
        ]
    },

    jy惊讶: { // 【12】【1级】“惊讶” 与恶魔交互时：额外增加两次交换次数
        name: "惊讶",
        description: "【12】【1级】惊讶：与恶魔交互时额外增加两次交换次数。",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE]
    },

    dg祷告: { // 【13】【1级】“祷告” BOSS的生命上限降低25%； 交换时获得“虔诚”
        name: "祷告",
        description: "【13】【1级】祷告：BOSS生命上限降低25%。交换时获得‘虔诚’。进入下一个房间前不可交换。",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE, ItemTags.FIXED_EXCHANGE],
        exchangeToName: "虔诚",
        effects: {
            [Attrs.boss.HP]: -0.25
        },
        hooks: (item) => [
            {   // 在进入下一个房间前，不可交换
                event: Events.game.enter.next_room,
                handler: () => {
                    item.removeTag(ItemTags.NO_EXCHANGE);
                }
            }
        ]
    },

    qy祈愿: { // 【14】【1级】“祈愿” 近战攻击击败敌人时：受到的伤害降低25%，持续10秒；并立即回复8%生命
        name: "祈愿",
        description: "【14】【1级】祈愿：近战击败敌人时，受到伤害降低25%，持续10秒，并立即回复8%生命。",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        effects: {},
        hooks: (item) => [
            {
                event: Events.enemy.die,
                handler: (payload) => {
                    const { attackType, attacker } = payload;
                    if (attacker === player && attackType === 'melee') {
                        AM.addAttr(Attrs.player.TAKE_DMG, -0.25, item.id, 10000);
                        player.takeHeal(player.state.hp_max * 0.08, item.id);
                    }
                }
            }
        ]
    },

    gm光芒: { // 【15】【1级】“光芒” 远程攻击造成的伤害提高25%（extra）
        name: "光芒",
        description: "【15】【1级】光芒：远程攻击造成的伤害提高25%。",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        effects: {
            [Attrs.player.RangedDmg]: 0.25
        }
    },

    gz酣醉: { // 【16】【1级】“酣醉” 受到伤害时，30%概率视为被闪避；若触发，则下一次攻击伤害降低100%
        name: "酣醉",
        description: "【16】【1级】酣醉：受到伤害时有30%概率视为闪避；若触发，则下一次攻击伤害降低100%。",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        effects: {},
        hooks: (item) => [
            {
                event: Events.player.takeDamage,
                handler: (payload) => {
                    if (Math.random() < 0.3) {
                        AM.addAttr(Attrs.player.DMG, -1.0, item.id, null, 1);
                        bus.on({
                            event: Events.player.dealDamage,
                            handler: (payload) => {
                                AM.removeAttrBySource(Attrs.player.DMG, item.id);
                            },
                            maxCalls: 1,
                            source: item.id
                        });
                        return { ...payload, baseDamage: 0 };
                    }
                }
            }
        ]
    },

    my梦呓: { // 【17】【1级】“梦呓” 突进消耗完最后一段突进段数后，附加特殊状态：下一次突进向相反的方向突进，但突进距离增加，无敌帧延长，当次闪避反击造成的伤害提高80%
        name: "梦呓",
        description: "【17】【1级】梦呓：消耗完最后一段突进后，下一次突进将向相反的方向进行。但增加距离且延长无敌帧，闪避反击造成的伤害提高80%。",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        effects: {},
        hooks: (item) => [ // TODO: 条件触发，耗尽最后一段突进段数后，附加特殊状态：下一次突进向相反的方向突进，但突进距离增加，无敌帧延长，当次闪避反击造成
            { // 监听冲刺消耗完最后一段时的事件（假设存在 MAP 或 player 的事件，这里用 game.tick 作为占位并暴露接口）
                event: Events.game.tick,
                handler: ({ deltaTime }) => {
                    // 为兼容性：如果 player 有 state.dashLastConsumed 标识，则触发效果
                    if (player.dash.dashCount == 0) {
                        // 给予下一次反向突进
                        player.state.dashReversed = true;
                        // 延长无敌，突进距离增加
                        // 并且当次闪避反击伤害提高80%
                    }
                }
            }
        ]
    },

    bl暴力: { // 【18】【1级】“暴力” 受到的伤害提高40%（DMG%）弹反造成的伤害提高120%（extra）
        name: "暴力",
        description: "【18】【1级】暴力：受到的伤害提高40%；弹反造成的伤害提高120%。",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        effects: {
            [Attrs.player.TAKE_DMG]: 0.4
        },
        hooks: (item) => [
            // { // TODO: 弹反造成的伤害提高120%（extra）
            //     event: Events.player.dealDamage,
            //     handler: (payload) => {
            //         // 如果 payload 标识是弹反（假设 payload.extraType === 'parry'）则放大伤害
            //         if (payload && payload.extraType === 'parry') {
            //             return { ...payload, baseDamage: payload.baseDamage * 2.2 };
            //         }
            //     }
            // }
        ]
    },

    wz畏缩: { // 【19】【1级】“畏缩” 敌人伤害降低10，移动速度-25%（SPD%），攻击-25%（ATK%）；当生命低于50%时：效果翻倍
        name: "畏缩",
        description: "【19】【1级】畏缩：敌人伤害降低10，自身的移动速度-25%，攻击-25%。生命低于一半时效果翻倍。",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        effects: {
            [Attrs.enemy.DMG_DEC]: 10,
            [Attrs.player.SPD]: -0.25,
            [Attrs.player.ATK]: -0.25
        },
        hooks: (item) => [
            {
                event: Events.player.hpPercent,
                handler: (hpPercent) => {
                    if (hpPercent < 0.5) {
                        AM.addAttr(Attrs.player.DMG, -10, item.id + '_hpPercent', null, 1);
                        AM.addAttr(Attrs.player.SPD, -0.25, item.id + '_hpPercent', null, 1);
                        AM.addAttr(Attrs.player.ATK, -0.25, item.id + '_hpPercent', null, 1);
                    }
                    else {
                        AM.removeAllAttrBySource(item.id + '_hpPercent');
                    }
                }
            }
        ],
        onDeactivate(item) {
            AM.removeAllAttrBySource(item.id + '_hpPercent');
        }
    },

    gx共情: { // 【20】【2级】“共情” 近战攻击的攻击范围扩大
        name: "共情",
        description: "【20】【2级】共情：近战攻击判定范围扩大。",
        level: 2,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        // TODO: 近战攻击范围扩大
        // effects: {
        //     // 近战攻击范围扩大 —— 没有专门属性时，尝试用一个自定义属性键（如果系统未识别，这只是占位）
        //     // 这里使用玩家攻击力相关属性不变，改为通过 hooks 在造成近战伤害时修改 hitbox 或 baseDamage 的范围/检测
        // },
        // hooks: (item) => [
        //     { // 在 player 发起近战攻击造成伤害时，扩大判定范围。监听 player.dealDamage 并检测为近战
        //         event: Events.player.dealDamage,
        //         handler: (payload) => {
        //             if (!payload) return;
        //             if (payload.attackType === 'melee') {
        //                 // 标记 payload 表示范围扩大，供攻击处理方检查
        //                 return { ...payload, meleeRangeExtra: 1.0 }; // 扩大 100% 范围
        //             }
        //         }
        //     }
        // ]
    },

    qc虔诚: { // 【21】【2级】“虔诚” BOSS的生命上限降低40%
        name: "虔诚",
        description: "【21】【2级】虔诚：BOSS生命上限降低40%。",
        level: 2,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        effects: {
            [Attrs.boss.HP]: -0.4
        }
    },

    fn愤怒: { // 【22】【2级】“愤怒” 触发弹反时，2秒内，远程攻击前摇-300，后摇-400
        name: "愤怒",
        description: "【22】【2级】愤怒：触发弹反时，2秒内远程攻击前摇减少300，后摇减少400。",
        level: 2,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.player.parry,
                handler: () => {
                    AM.addAttr(Attrs.player.RangedStartupTime, -300, item.id, 2000, 1);
                    AM.addAttr(Attrs.player.RangedRecoveryTime, -400, item.id, 2000, 1);
                }
            }
        ]
    },

    gl鼓励: { // 【23】【2级】“鼓励” 触发闪避反击时，2秒内，近战攻击造成的伤害提高150%
        name: "鼓励",
        description: "【23】【2级】鼓励：触发闪避反击时，2秒内近战伤害提高150%。",
        level: 2,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.player.dodge_attack,
                handler: () => {
                    AM.addAttr(Attrs.player.MeleeDmg, 1.5, item.id, 2000, 1);
                }
            }
        ]
    },

    qs求生: { // 【24】【2级】“求生” 受到伤害后，3秒内，受到的伤害降低70%（DMG%）
        name: "求生",
        description: "【24】【2级】求生：受到伤害后，3秒内受到的伤害降低70%。",
        level: 2,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.player.afterTakeDamage,
                handler: () => {
                    AM.addAttr(Attrs.player.TAKE_DMG, -0.7, item.id, 3000, 1);
                }
            }
        ]
    },

    cm沉默: { // 【25】【2级】“沉默” 生命上限+40%，攻击力-20%。可重复获取。
        name: "沉默",
        description: "【25】【2级】沉默：生命上限+40%，攻击力-20%。可重复获得。",
        level: 2,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.MULTIPLE, ItemTags.FIXED_EXCHANGE],
        exchangeToName: "卫护",
        effects: {
            [Attrs.player.HP]: 0.4,
            [Attrs.player.ATK]: -0.2
        }
    },

    wh卫护: { // 【26】【2级】“卫护” 生命上限-15%，攻击力+30%。可重复获取。持有多于一件时，攻击力额外+18%。
        name: "卫护",
        description: "【26】【2级】卫护：生命上限-15%，攻击力+30%。可重复获得；持有多件时攻击力额外+18%。",
        level: 2,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.MULTIPLE, ItemTags.FIXED_EXCHANGE],
        exchangeToName: "沉默",
        effects: {
            [Attrs.player.HP]: -0.15,
            [Attrs.player.ATK]: 0.3
        },
        onActivate(item) {
            if (itemManager.countItem("卫护") > 1) {
                AM.addAttr(Attrs.player.ATK, 0.18, '卫护_multi', null, 1);
            }
        },
        onDeactivate(item) {
            if (itemManager.countItem("卫护") <= 1)
                AM.removeAllAttrBySource('卫护_multi');
        }
    },

    hj呼救: { // 【27】【2级】“呼救” 每10秒仅一次，受到伤害后，若生命值比例低于40%，恢复12%生命。
        name: "呼救",
        description: "【27】【2级】呼救：每10秒一次，受伤后若生命低于40%则恢复12%生命。",
        level: 2,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.player.afterTakeDamage,
                handler: () => {
                    if (player.state.hp / player.state.hp_max < 0.4) {
                        player.takeHeal(player.state.hp_max * 0.12, item.id);
                    }
                }
            }
        ]
    },

    al爱恋: { // 【28】【2级】“爱恋” 随机获得以下效果之一：攻击力+45%；生命上限+30%；受到的伤害降低20固定值（DMG），但不低于原本的10%。该效果在进入新的房间时刷新。同时携带“友谊”时，可同时获取2个效果。此时通关游戏将完成成就“来世的我们”
        name: "爱恋",
        description: "【28】【2级】爱恋：随机获得以下效果之一：攻击力+45%、生命上限+30%、受到的伤害降低20；进入新房间时刷新；携带‘友谊’时可同时获得两个效果。",
        level: 2,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.game.enter.next_room,
                handler: () => {
                    AM.removeAllAttrBySource(item.id);
                    // 随机选择一个效果。携带“友谊”时改为可重复的2个
                    const effects = [
                        { attr: Attrs.player.ATK, value: 0.45 },
                        { attr: Attrs.player.HP, value: 0.3 },
                        { attr: Attrs.enemy.DMG_DEC, value: 20 }
                    ];
                    const effectCount = itemManager.countItem("友谊") ? 2 : 1;
                    for (let i = 0; i < effectCount; i++) {
                        const effect = effects[Math.floor(Math.random() * effects.length)];
                        AM.addAttr(effect.attr, effect.value, item.id, null, 1);
                    }
                }
            },
            {   // TODO:同时携带“友谊”通关时：触发成就“来世的我们”
                event: Events.game.finish,
                handler: (ctx) => {
                },
                maxCalls: 1
            }
        ]
    },

    gj告解: { // 【29】【2级】“告解” 仅3次，打开常规宝箱时，获得的物品改为二选一。次数耗尽时丢弃之。
        name: "告解",
        description: "【29】【2级】告解：仅3次，打开普通宝箱时物品改为二选一；次数耗尽后丢弃。",
        level: 2,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.game.open_chest,
                handler: () => {
                    item.state.charges--;
                    if (item.state.charges <= 0) {
                        itemManager.remove(item);
                    }
                }
            }
        ],
        state: {
            charges: 3
        }
    },

    am安眠: { // 【30】【2级】“安眠” 进入新的房间时，恢复25%生命值。生命值高于70%时，造成的伤害提高20%（DMG%）
        name: "安眠",
        description: "【30】【2级】安眠：进入新的房间时恢复25%生命；生命高于70%时造成伤害提高20%。",
        level: 2,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.game.enter.next_room,
                handler: () => {
                    player.takeHeal(player.state.hp_max * 0.25, item.id);
                }
            },
            {
                event: Events.player.hpPercent,
                handler: (percent) => {
                    if (percent > 0.7) {
                        AM.addAttr(Attrs.player.DMG, 0.2, item.id);
                    }
                    else {
                        AM.removeAttrBySource(Attrs.player.DMG, item.id);
                    }
                }
            }
        ]
    },

    kp看破: { // 【31】【2级】“看破” 生命值低于80%时，基于当前生命值比例，造成的伤害提高（DMG%）。每低1%生命值，伤害提高1.5%。
        name: "看破",
        description: "【31】【2级】看破：生命低于80%时按比例提高伤害，每降低1%生命提高1.5%伤害。",
        level: 2,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.player.hpPercent,
                handler: (percent) => {
                    if (percent < 0.8) {
                        const increase = (0.8 - percent) * 1.5;
                        AM.addAttr(Attrs.player.DMG, increase, item.id, null, 1);
                    }
                    else {
                        AM.removeAttrBySource(Attrs.player.DMG, item.id);
                    }
                }
            }
        ]
    },

    zn执念: { // 【32】【2级】“执念” 仅一次，主动使用时，立即眩晕全场敌人10秒，并使我方造成的伤害提高80%（DMG%）。使用后丢弃之。
        name: "执念",
        description: "【32】【2级】执念：一次性使用，立刻眩晕全场敌人10秒并提高我方伤害80%，使用后丢弃。",
        level: 2,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.item.use,
                handler: ({ usedItem }) => {
                    if (usedItem === item) {
                        // TODO: 触发全场眩晕和受伤增加
                        // AM.addAttr(Attrs.player.DMG, 0.8, item.id, 10000, 1);
                        itemManager.remove(item);
                    }
                }
            }
        ]
    },

    jj焦急: { // 【33】【2级】“焦急” 每秒流失1%生命值。攻击命中时，立即恢复3%生命值。
        name: "焦急",
        description: "【33】【2级】焦急：每秒流失1%生命；攻击命中时恢复3%生命。",
        level: 2,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.game.tick,
                handler: () => {
                    if (item.state.jjTimer.ready()) {
                        item.state.jjTimer.start();
                        player.takeLifeLoss(player.state.hp_max * 0.01, item.id);
                    }
                }
            },
            {
                event: Events.player.dealDamage,
                handler: () => {
                    player.takeHeal(player.state.hp_max * 0.03, item.id);
                }
            }
        ],
        state: {
            jjTimer: new Cooldown(1000)
        }
    },

    qx清醒: { // 【34】【3级】“清醒” 生命上限+150%。生命值高于40%时，受到的治疗效果降低70%（Heal%），生命值高于70%时，受到的治疗效果降低90%（Heal%）。
        name: "清醒",
        description: "【34】【3级】清醒：生命上限+150%。生命大于40%时治疗效果降低70%，大于70%时降低90%。",
        level: 3,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        effects: {
            [Attrs.player.HP]: 1.5
        },
        hooks: (item) => [
            {
                event: Events.player.hpPercent,
                handler: (percent) => {
                    if (percent > 0.7) {
                        AM.addAttr(Attrs.player.HEAL, -0.9, item.id + "hpPercent", null, 1);
                    }
                    else if (percent > 0.4) {
                        AM.addAttr(Attrs.player.HEAL, -0.7, item.id + "hpPercent", null, 1);
                    }
                    else {
                        AM.removeAttrBySource(Attrs.player.HEAL, item.id + "hpPercent");
                    }
                }
            }
        ],
        onDeactivate(item) {
            AM.removeAllAttrBySource(item.id + "hpPercent");
        }
    },

    ks宽恕: { // 【35】【3级】“宽恕” 触发闪避反击时，5秒内，攻击力提高40%（ATK%），该效果可叠加3层，持续时间刷新时，刷新全部层数的时间。
        name: "宽恕",
        description: "【35】【3级】宽恕：触发闪避反击时5秒内攻击力提高40%，可叠加3层，可刷新持续时间。",
        level: 3,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.player.dodge_attack,
                handler: () => {
                    AM.addAttr(Attrs.player.ATK, 0.4, item.id, 5000, 3);
                    AM.refreshAttrDuration(Attrs.player.ATK, item.id);
                }
            }
        ]
    },

    xc雪耻: { // 【36】【3级】“雪耻” 攻击命中当前生命值低于我方已流失生命值150%的敌人时，立即斩杀之，并恢复自身3%生命值。
        name: "雪耻",
        description: "【36】【3级】雪耻：攻击命中当前生命值低于我方已流失生命值150%的敌人时，立即斩杀之，并恢复自身3%生命值。",
        level: 3,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.enemy.takeDamage,
                handler: (payload) => {
                    if (payload.attacker !== player) return;
                    if (payload.victim.state.hp < (player.state.hp_max - player.state.hp) * 1.5) {
                        payload.victim.handleDeath();
                        player.takeHeal(player.state.hp_max * 0.03, item.id);
                    }
                }
            }
        ]
    },

    dl对垒: { // 【37】【3级】“对垒” 每30秒仅一次，受到伤害时，若生命值低于30%，视为将其弹反，并造成双倍伤害（extra）。
        name: "对垒",
        description: "【37】【3级】对垒：每30秒一次，受伤时若生命低于30%则视为弹反并造成双倍伤害。",
        level: 3,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.player.takeDamage,
                handler: (payload) => {
                    if (item.state.dlTimer.ready() && player.state.hp / player.state.hp_max < 0.3) {
                        item.state.dlTimer.start();
                        AM.addAttr(Attrs.player.MeleeDmg, 1.0, item.id, null, 1); // 造成双倍伤害
                        player.block.performParry(); // 视为弹反
                        return { ...payload, baseDamage: 0 }; // 视为未受伤害
                    }
                }
            }
        ],
        state: {
            dlTimer: new Cooldown(30000)
        }
    },

    yd引渡: { // 【38】【3级】“引渡” 对生命值比例高于自身的敌人造成的伤害提高60%。
        name: "引渡",
        description: "【38】【3级】引渡：对生命比例高于自身的敌人造成的伤害提高60%。",
        level: 3,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.player.dealDamage,
                handler: (payload) => {
                    const { baseDamage, target } = payload;
                    if (target.state.hp / target.state.hp_max > player.state.hp / player.state.hp_max) {
                        return { ...payload, baseDamage: baseDamage * 1.6 };
                    }
                }
            }
        ]
    },

    cb慈悲: { // 【39】【3级】“慈悲” 攻击命中生命值低于24%的敌人时，立即斩杀之，且下次造成的伤害提高100%（extra）。
        name: "慈悲",
        description: "【39】【3级】慈悲：攻击命中生命值低于24%的敌人时，立即斩杀之，并使下一次造成伤害提高100%。",
        level: 3,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.enemy.takeDamage,
                handler: (payload) => {
                    if (payload.victim.state.hp / payload.victim.state.hp_max < 0.24) {
                        payload.victim.handleDeath();
                        bus.on({
                            event: Events.player.dealDamage,
                            handler: (payload) => { return { ...payload, baseDamage: payload.baseDamage * 2.0 } },
                            priority: -1,
                            maxCalls: 1,
                            source: item.id
                        });
                    }
                }
            }
        ]
    },

    gc歌唱: { // 【40】【3级】“歌唱” 每20秒仅一次，主动使用时，突进的充能时间缩减50%，持续4秒。
        name: "歌唱",
        description: "【40】【3级】歌唱：每20秒一次，主动使用可使突进充能缩短50%，持续4秒。",
        level: 3,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.item.use,
                handler: ({ usedItem }) => {
                    if (usedItem === item && item.state.gcTimer.ready()) {
                        item.state.gcTimer.start();
                        AM.addAttr(Attrs.player.DASH_CHARGE, 0.5, item.id, 4000);
                    }
                }
            }
        ],
        state: {
            gcTimer: new Cooldown(20000)
        }
    },

    xy信仰: { // 【41】【3级】“信仰” 每有一个物品空位，生命值+20%，攻击力+15%。
        name: "信仰",
        description: "【41】【3级】信仰：每有一个空背包格，生命值+20%、攻击力+15%。",
        level: 3,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.game.tick,
                handler: () => {
                    AM.removeAllAttrBySource(item.id);
                    const emptySlots = itemManager.slots.filter(s => s.item == null).length;
                    AM.addAttr(Attrs.player.HP, emptySlots * 0.2, item.id);
                    AM.addAttr(Attrs.player.ATK, emptySlots * 0.15, item.id);
                }
            }
        ]
    },

    lt利他: { // 【42】【3级】“利他” 每20秒仅一次，主动使用时：在自身所在位置放置一个最多存在4秒的替身。在替身被攻击前，自身获得无敌、霸体、不可选中。
        name: "利他",
        description: "【42】【3级】利他：每20秒一次，主动使用在当前位置放置存在最多4秒的替身；替身在被攻击前自身获得无敌和霸体。",
        level: 3,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.item.use,
                handler: ({ usedItem }) => {
                    if (usedItem === item && item.state.ltTimer.ready()) {
                        item.state.ltTimer.start();
                        player.createDecoy(4000);
                    }
                }
            }
        ],
        state: {
            ltTimer: new Cooldown(20000)
        }
    },

    bl辩论: { // 【43】【3级】“辩论” 携带该物品时，弹反判定大幅延长，且造成的伤害提高50%（extra）
        name: "辩论",
        description: "【43】【3级】辩论：弹反判定大幅延长，且造成的伤害提高50%。",
        level: 3,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        effects: { //TODO: 弹反判定大幅延长
            // [Attrs.player.DAMAGE_REFLECT]: 0.5
        },
        hooks: (item) => [// TODO: 造成的伤害提高50%
            //     {   
            //         event: Events.player.parry,
            //         handler: (payload) => {
            //         }
            //     }
        ]
    },

    ww无畏: { // 【44】【3级】“无畏” 连续造成5次伤害而不受击后，攻击力+20%（ATK%）；每额外造成一次伤害，攻击力再+20%（ATK%），最多叠加至120%。
        name: "无畏",
        description: "【44】【3级】无畏：连续造成5次伤害而不受击后，攻击力+20%；每额外造成一次伤害，攻击力再+20%，最多叠加至120%。",
        level: 3,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.UNIQUE_SINGLE],
        hooks: (item) => [
            {
                event: Events.player.dealDamage,
                handler: () => {
                    item.state.hitCount++;
                    if (item.state.hitCount >= 5) {
                        AM.addAttr(Attrs.player.ATK, 0.2, item.id, null, 6);
                    }
                }
            },
            {
                event: Events.player.takeDamage,
                handler: () => {
                    item.state.hitCount = 0;
                    AM.removeAttrBySource(Attrs.player.ATK, item.id);
                }
            }
        ],
        state: {
            hitCount: 0
        }
    },
}
