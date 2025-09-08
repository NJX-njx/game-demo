import { attributeManager as AM, AttributeTypes as Attrs } from "../../Manager/AttributeManager";
import { player } from "../../Entities/Player";
import { eventBus as bus, EventTypes as Events } from "../../Manager/EventBus";
import { Cooldown } from "../../Utils/Cooldown";
import { itemManager } from "./ItemManager";

export const ItemTags = {
    NO_EXCHANGE: "noExcgange",  //不可交换
    NO_DROP: "noDrop",          //不可丢弃
    NO_RANDOM: "noRandom",      //不随机掉落
    SPECIAL_EXCHANGE: "specialExchange", //特殊交换

    UNIQUE_GLOBAL: "uniqueGlobal",  // 全局唯一，本局只能获得一个
    UNIQUE_SINGLE: "uniqueSingle",  // 同时只能持有一个（默认情况，可以省略）
    MULTIPLE: "multiple"          // 可同时获得多个
}

export const ItemTypes = {
    ENDING: "end",
    NORMAL: "normal"
}

export const ItemConfigs = {
    yy友谊: {
        id: "友谊",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.NO_EXCHANGE, ItemTags.NO_DROP, ItemTags.NO_RANDOM],
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
                        player.takeHeal(player.state.hp_max * 0.01);
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
            {   // 通关时：隐藏结局//TODO:
                event: Events.game.finish,
                handler: (ctx) => {
                    ctx.unlockEnding?.("hidden_path_friendship", { desc: "使探索开启不同的方向" });
                },
                maxCalls: 1
            }
        ],
        onAcquire(item) {//TODO:
            // // 获得时：触发剧情
            // bus.emit("STORY_TRIGGER", { storyId: "find_key", item });
        },
        state: {
            healTimer: new Cooldown(1000)
        }
    },
    bc悲怆: {
        id: "悲怆",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.NO_EXCHANGE, ItemTags.NO_DROP, ItemTags.NO_RANDOM],
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
            {   // 通关时：触发成就“替我感受来世的温暖”
                event: Events.game.finish,
                handler: (ctx) => {//TODO:
                },
                maxCalls: 1
            }
        ],
        onAcquire(item) {//TODO:
            // 获得时：
            // 触发剧情
        }
    },
    sn思念: {
        id: "思念",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.NO_RANDOM],
        effects: {
            [Attrs.player.HP]: 0.2
        },
        hooks: (item) => [
            {   //造成伤害时，随机触发一种：造成的伤害提升15%；下次受到的伤害降低30%；恢复1%生命值
                event: Events.player.dealDamage,
                handler: (payload) => {
                    switch (Math.floor(Math.random() * 3)) {
                        case 0:
                            return { ...payload, baseDamage: payload.baseDamage * 1.15 };
                            break;
                        case 1:
                            bus.on({
                                event: Events.player.takeDamage,
                                handler: (payload) => { return { ...payload, baseDamage: payload * 0.7 } },
                                maxCalls: 1,
                                source: item._instanceId
                            });
                            break;
                        case 2:
                            player.takeHeal(player.state.hp_max * 0.01);
                            break;
                    }
                }
            }
        ],
        onAcquire(item) {//TODO:
            // 获得时：触发剧情
        }
    },
    ds胆识: { //TODO: 交换时必定获得“决心”
        id: "胆识",
        level: 0,
        type: ItemTypes.ENDING,
        tags: [ItemTags.NO_DROP, ItemTags.NO_RANDOM, ItemTags.SPECIAL_EXCHANGE],
        effects: {
            [Attrs.enemy.DMG_DEC]: -15,
            [Attrs.boss.HP]: 0.45
        },
        hooks: (item) => [
            {   // 通关时：触发隐藏结局（描述：使探索开启不同的方向）
                event: Events.game.finish,
                handler: (ctx) => {//TODO:
                },
                maxCalls: 1
            }
        ]
    },
    js决心: {
        id: "决心",
        level: 0,
        type: ItemTypes.ENDING,
        tags: [ItemTags.NO_DROP, ItemTags.NO_EXCHANGE, ItemTags.NO_RANDOM],
        effects: {
            [Attrs.enemy.DMG_DEC]: -10,
            [Attrs.player.ATK]: 0.35,
            [Attrs.player.HP]: -0.2
        },
        hooks: (item) => [
            // {//TODO:触发闪避反击和弹反时：受到的伤害提高60%（DMG%），持续5秒
            // },
            {   // 通关时：触发隐藏结局（描述：使探索开启不同的方向）
                event: Events.game.finish,
                handler: (ctx) => {//TODO:
                },
                maxCalls: 1
            }
        ],
        onAcquire(item) {
            //TODO: 获得10灵魂碎片
            player.state.hp = player.state.hp_max
        }
    },
    yy犹疑: {//TODO:交换时必定获得“观望”
        id: "犹疑",
        level: 0,
        type: ItemTypes.ENDING,
        tags: [ItemTags.NO_DROP, ItemTags.NO_RANDOM, ItemTags.SPECIAL_EXCHANGE],
        effects: {
            [Attrs.player.SPD]: -0.4,
            [Attrs.player.ATK]: -0.2
        }
    },
    gw观望: {
        id: "观望",
        level: 0,
        type: ItemTypes.ENDING,
        tags: [ItemTags.NO_DROP, ItemTags.NO_EXCHANGE, ItemTags.NO_RANDOM],
        effects: {
            // TODO: 突进充能速度加快20%/冷却缩减15% —— 需要定义新的属性，如 DASH_CHARGE, DASH_COOLDOWN
        }
    },
    hq好奇: { // TODO:交换时必定获得“珍惜”
        id: "好奇",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.NO_DROP, ItemTags.NO_EXCHANGE, ItemTags.UNIQUE_GLOBAL, ItemTags.SPECIAL_EXCHANGE],
        effects: {
            [Attrs.player.TAKE_DMG]: 0.3
        },
        hooks: (item) => [
            {   // 在进入下一个商店前，不可丢弃，不可交换
                event: Events.game.enter.shop,
                handler: () => {
                    item.removeTag(ItemTags.NO_DROP);
                    item.removeTag(ItemTags.NO_EXCHANGE);
                }
            }
        ],
        onAcquire(item) {
            // TODO: 获得10灵魂碎片
        }
    },
    zx珍惜: {// TODO: 交换时必定获得“朗诵”
        id: "珍惜",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.NO_EXCHANGE, ItemTags.UNIQUE_GLOBAL, ItemTags.SPECIAL_EXCHANGE, ItemTags.NO_RANDOM],
        effects: {},
        hooks: (item) => [
            {   // 在进入下一个商店前，不可交换
                event: Events.game.enter.shop,
                handler: () => {
                    item.removeTag(ItemTags.NO_EXCHANGE);
                }
            }
        ],
        onAcquire(item) {
            // TODO: 获得15灵魂碎片
        }
    },
    ls朗诵: {
        id: "朗诵",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.NO_RANDOM],
        onAcquire(item) {
            // TODO: 额外获得2个背包格
        }
    },
    xq休憩: {
        id: "休憩",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.MULTIPLE],
        hooks: (item) => [
            {
                event: Events.item.use,
                handler: ({ usedItem }) => {
                    if (usedItem === item) {
                        player.takeHeal(player.state.hp_max * 0.4);
                    }
                }
            }
        ]
    },
    jy惊讶: {// TODO:下次进入商店时：恶魔处额外展示2个物品
        id: "惊讶",
        level: 1,
        type: ItemTypes.NORMAL,
    },
    dg祷告: {// TODO:交换时必定获得“虔诚”
        id: "祷告",
        level: 1,
        type: ItemTypes.NORMAL,
        tags: [ItemTags.SPECIAL_EXCHANGE],
        effects: {
            [Attrs.player.LOS]: -0.3
        },
    },

}

// ------------------------
// 交换逻辑（示例）
// ------------------------
export function handleExchange(fromId, ctx) {
    const map = {
        guts: "resolve",
        hesitate: "watch",
        curious: "cherish",
        cherish: "recite",
        pray: "piety", // 祷告 -> 虔诚（未在本文件实现，留给第2批）
    };
    const toId = map[fromId];
    if (toId) ctx.exchangeTo?.(toId);
}
