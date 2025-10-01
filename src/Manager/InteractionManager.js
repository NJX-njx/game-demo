import { player } from "../Entities/Player";
import { game } from "../Game";
import { dialogManager } from "./DialogManager";
import { mapManager } from "./MapManager";
import { textureManager } from "./TextureManager";
import { inputManager } from "../System/Input/InputManager";
import { Hitbox } from "../Utils/Hitbox";
import { Vector } from "../Utils/Vector";

export class Event {
    constructor(config) {
        // next_room（手动）
        // plot（手动 / 自动）
        // teach（自动）
        // attack_unlock（自动）
        // hidden_room（自动）
        // angel（手动）
        // demon（手动）
        // chest（手动）
        // chest_boss（手动）
        // chest_end（手动）
        this.event = config.event || 'none'; // 事件名称

        // "next_room", "plot", "teach" : "id"
        // "chest" : "item"
        // "npc", "hidden_room", "angel", "demon", "chest_boss", "chest_end"
        this.payout = config.payout || {}; // 事件数据

    }
}

// Interaction类，继承自Hitbox
export class Interaction extends Hitbox {
    constructor(position, size, extra = {}) {
        super(new Vector(position.x, position.y), new Vector(size.x, size.y));
        for (const key in extra) {
            if (key !== 'position' && key !== 'size') {
                this[key] = extra[key];
            }
        }

        /** @type{Event[]} 事件列表 */
        this.events = Array.isArray(extra.events) ? extra.events.map(e => new Event(e)) : [];
        this.type = new Set(this.events.map(e => e.event));
        this.tags = Array.isArray(extra.tags) ? extra.tags.slice() : [];
        this.cond = Array.isArray(extra.cond) ? extra.cond.slice() : [];
        this.autoTrigger = this.tags.includes('autoTrigger');
        this.hidden = this.tags.includes('hidden');
        this.triggered = false; // 是否已触发
    }

    /**
     * 绘制交互点提示（只显示传送点）
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        // 可选调试：打开绘制交互区域边框
        const showDebugBox = true;

        ctx.save();

        // 如果交互是隐藏画纯黑覆盖
        if (this.tags.includes('hidden')) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.position.x, this.position.y, this.size.x, this.size.y);

            ctx.restore();
            return;
        }

        // 对于可触发的交互（传送、宝箱、天使、恶魔等），优先根据 tags 绘制贴图
        // 优先级数组：按数组顺序匹配 tags 中的第一个项作为贴图/标签来源
        const drawTypesWithTexture = ['next_room', 'chest', 'chest_boss', 'chest_end', 'angel', 'demon'];
        const triggerable = interactionManager.checkConds(this.cond);
        const matchingTag = drawTypesWithTexture.find(t => this.tags.includes(t));
        if (matchingTag && triggerable) {
            // 优先使用交互自带的 texture 字段，否则用匹配到的 tag 名称去 TextureManager 查找
            let tex = textureManager.getTexture('interactions', matchingTag);

            if (tex) {
                try {
                    // 绘制图片到交互区域（拉伸至 size 大小）
                    ctx.drawImage(tex, this.position.x, this.position.y, this.size.x, this.size.y);
                } catch (e) {
                    // 一些环境 texture 可能是 ImageBitmap/HTMLImageElement，总之兜底为块状绘制
                    ctx.fillStyle = '#66ccff';
                    ctx.fillRect(this.position.x, this.position.y, this.size.x, this.size.y);
                    console.warn('交互点贴图绘制失败，改为块状绘制', e);
                }
            } else {
                // 无贴图或不可触发时使用颜色块并显示文字提示
                ctx.fillStyle = triggerable ? '#00aa00' : '#555555';
                ctx.fillRect(this.position.x, this.position.y, this.size.x, this.size.y);

                // 绘制文字说明
                ctx.fillStyle = triggerable ? '#ffffff' : '#cccccc';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                const labelType = matchingTag;
                const label = labelType === 'next_room' ? (triggerable ? '传送点 (需击败所有敌人)' : '传送点 (按E键传送)') : labelType;
                ctx.fillText(label, this.position.x + this.size.x / 2, this.position.y + this.size.y / 2);
                console.log('交互点缺少贴图，绘制文字提示:', label);
            }

            ctx.restore();
            return;
        }

        // 其它类型暂不绘制特殊内容，但如果开启调试框则绘制边框
        if (showDebugBox) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#ffcc00';
            ctx.strokeRect(this.position.x, this.position.y, this.size.x, this.size.y);
        }

        ctx.restore();
    }
}

class InteractionManager {
    static instance;
    constructor() {
        if (InteractionManager.instance) return InteractionManager.instance;
        InteractionManager.instance = this;
        this.conds = {
            'battle_end': false
        }
    }

    /**
     * 每帧更新：检测玩家与交互点重叠并触发
     * - autoTrigger: 首次进入范围立即触发一次
     * - 手动交互: 按下 E 键且重叠时触发
     */
    update(deltaTime) {
        this.updateConditions();
        try {
            // 遍历 interactions
            for (let inter of mapManager.getInteractions()) {
                // 检查玩家是否与交互点重叠及交互点是否已触发过
                if (inter.triggered || !player.hitbox.checkHit(inter) || !this.checkConds(inter.cond)) continue;

                if (inter.autoTrigger || inputManager.isKeyDown('E')) {// 自动触发或手动交互：E 键
                    inter.triggered = true;
                    console.log('🎮 交互点触发:', inter);
                    this.handleInteraction(inter);
                    break; // 每帧只触发一个交互点
                }
            }
        } catch (err) {
            console.error('InteractionManager.update error:', err);
        }
    }

    updateConditions() {
        const aliveEnemies = game.enemies.filter(enemy => enemy.state && enemy.state.hp > 0);
        this.conds['battle_end'] = aliveEnemies.length === 0;
    }

    checkConds(conds) {
        for (const cond of conds) {
            switch (cond) {
                case 'battle_end':
                    if (!this.conds['battle_end']) return false;
                    break;
                default:
                    console.warn('未知的交互条件:', cond);
            }
        }
        return true;
    }

    /**
     * 处理交互点触发事件
     * @param {Interaction} interaction - 交互事件数据
     */
    async handleInteraction(interaction) {
        try {
            const events = interaction.events;

            for (const ev of events) {
                const evName = ev.event;
                const evData = Object.assign({}, interaction, ev.payout || {});

                switch (ev.event) {
                    case 'next_room':
                        await this.handleNextRoom(ev);
                        break;
                    case 'plot':
                    case 'teach':
                    case 'attack_unlock':
                        this.handlePlotEvent(evName, evData);
                        break;
                    case 'npc':
                    case 'angel':
                    case 'demon':
                        this.handleNPCEvent(evName, evData);
                        break;
                    case 'chest':
                    case 'chest_boss':
                    case 'chest_end':
                        this.handleChestEvent(evName, evData);
                        break;
                    case 'hidden_room':
                        this.handleHiddenRoomEvent(ev, interaction);
                        break;
                    default:
                        console.log('未处理的交互事件:', evName, evData);
                }
            }
        } catch (error) {
            console.error('处理交互事件时出错,interaction:', interaction, 'error:', error);
        }
    }

    /**
     * 处理房间切换
     * @param {Event} event - 事件
     */
    async handleNextRoom(event) {
        console.log('🚪 房间切换触发:', event);

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
        // dialogManager.startDialog(data.dialogs)
        // TODO: 实现剧情事件逻辑
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
     * @param {Event} event - 事件
     * @param {Interaction} inter - 交互点实例
     */
    handleHiddenRoomEvent(event, inter) {
        console.log('隐藏房间事件触发:', event, inter);
        inter.hidden = false; // 取消隐藏
        inter.tags = inter.tags.filter(tag => tag !== 'hidden');
    }
}

export const interactionManager = new InteractionManager();