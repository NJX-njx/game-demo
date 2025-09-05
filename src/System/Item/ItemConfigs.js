import { attributeManager as AM, AttributeTypes as Attrs } from "../../Manager/AttributeManager";
import { player } from "../../Entities/Player";
import { eventBus as bus, EventTypes as Events } from "../../Manager/EventBus";
import { Cooldown } from "../../Utils/Cooldown";
import { itemManager } from "./ItemManager";

export const ItemTags = {
    NO_EXCHANGE: "noExcgange",  //不可交换
    NO_DROP: "noDrop",          //不可丢弃
    NO_RANDOM: "noRandom",      //不随机掉落
}

export const ItemTypes = {
    ENDING: "end",
    NORMAL: "normal"
}

export const ItemConfigs = {
    // 【1】友谊（1级）
    yy友谊: {
        id: "友谊",
        name: "友谊",
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
                handler: (flag) => {
                    player.state.hp = player.state.hp_max;
                    // 标记战后移除并授予“悲怆”
                    bus.on({
                        event: Events.game.battle.end,
                        handler: () => {
                            itemManager.removeItem(item);
                            // ctx.addItem("sorrow");
                        },
                        maxCalls: 1
                    })
                    return false;
                },
                maxCalls: 1
            },
            {   // 通关时：隐藏结局
                event: Events.game.finish,
                handler: (ctx) => {
                    ctx.unlockEnding?.("hidden_path_friendship", { desc: "使探索开启不同的方向" });
                },
                maxCalls: 1
            }
        ],
        onAcquire(item) {
            // // 获得时：触发剧情
            // bus.emit("STORY_TRIGGER", { storyId: "find_key", item });
        },
        state: {
            healTimer: new Cooldown(1000)
        }
    }
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
