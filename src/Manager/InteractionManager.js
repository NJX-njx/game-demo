import { game } from "../Game";
import { dialogManager } from "./DialogManager";
import { mapManager } from "./MapManager";

class InteractionManager {
    static instance;
    constructor() {
        if (InteractionManager.instance) return InteractionManager.instance;
        InteractionManager.instance = this;
    }

    /**
     * 处理交互点触发事件
     * @param {Object} interaction - 交互事件数据
     * @param {string} payload.type - 交互点类型
     * @param {string} payload.event - 事件名称
     * @param {Object} payload.data - 交互点数据
     */
    async handleInteraction(interaction) {
        const type = interaction.type, event = interaction.event, data = interaction;
        console.log('🎮 交互点触发:', interaction);

        try {
            switch (type) {
                case 'next_room':
                case 'exit':
                    await this.handleRoomTransition(event, data);
                    break;
                case 'plot':
                case 'teach':
                case 'fire':
                case 'sword':
                    this.handlePlotEvent(event, data);
                    break;
                case 'npc':
                case 'angel':
                    this.handleNPCEvent(event, data);
                    break;
                case 'chest':
                    this.handleChestEvent(event, data);
                    break;
                case 'hidden':
                    this.handleHiddenRoomEvent(event, data);
                    break;
                default:
                    console.log('未处理的交互类型:', type, event);
            }
        } catch (error) {
            console.error('处理交互事件时出错:', error);
        }
    }

    /**
     * 处理房间切换
     * @param {string} event - 事件名称
     * @param {Object} data - 交互点数据
     */
    async handleRoomTransition(event, data) {
        console.log('🚪 房间切换触发:', event, data);

        // 检查使用条件
        const hasEnemies = game.enemies.length > 0;
        const requiresBattleEnd = data.can_be_used_when === 'battle_end' || hasEnemies;

        console.log('🔍 初始检查:', {
            hasEnemies: hasEnemies,
            enemiesCount: game.enemies.length,
            requiresBattleEnd: requiresBattleEnd,
            explicitCondition: data.can_be_used_when === 'battle_end'
        });

        if (requiresBattleEnd) {
            // 检查是否还有敌人存活
            const aliveEnemies = game.enemies.filter(enemy => enemy.state && enemy.state.hp > 0);
            console.log('🔍 检查敌人状态:', {
                totalEnemies: game.enemies.length,
                aliveEnemies: aliveEnemies.length,
                enemyHPs: game.enemies.map(e => e.state ? e.state.hp : 'no state'),
                requiresBattleEnd: requiresBattleEnd,
                hasEnemies: hasEnemies,
                explicitCondition: data.can_be_used_when === 'battle_end'
            });

            if (aliveEnemies.length > 0) {
                console.log('⚠️ 还有敌人存活，无法切换房间');
                // TODO: 这里可以显示UI提示给玩家
                return;
            }
        }

        // 执行房间切换
        await mapManager.nextRoom();

        // 保存当前游戏状态
        game.saveGame();
    }

    /**
     * 处理剧情事件
     * @param {string} event - 事件名称
     * @param {Object} data - 交互点数据
     */
    handlePlotEvent(event, data) {
        console.log('剧情事件触发:', event, data);
        dialogManager.startDialog(data.dialogs)
    }

    /**
     * 处理NPC事件
     * @param {string} event - 事件名称
     * @param {Object} data - 交互点数据
     */
    handleNPCEvent(event, data) {
        console.log('NPC事件触发:', event, data);
        // TODO: 实现NPC对话系统
    }

    /**
     * 处理宝箱事件
     * @param {string} event - 事件名称
     * @param {Object} data - 交互点数据
     */
    handleChestEvent(event, data) {
        console.log('宝箱事件触发:', event, data);
        // TODO: 实现宝箱系统
    }

    /**
     * 处理隐藏房间事件
     * @param {string} event - 事件名称
     * @param {Object} data - 交互点数据
     */
    handleHiddenRoomEvent(event, data) {
        console.log('隐藏房间事件触发:', event, data);
        // TODO: 实现隐藏房间功能
    }
}

export const interactionManager = new InteractionManager();