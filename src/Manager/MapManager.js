import { Hitbox } from "../Utils/Hitbox";
import { Vector } from "../Utils/Vector";
import { textureManager } from "./TextureManager";
import { dataManager } from "./DataManager";
import { eventBus as bus, EventTypes as Events } from "./EventBus";
import { inputManager } from "../System/Input/InputManager";
// Block类，继承自Hitbox
class Block extends Hitbox {
    constructor(position, size, type) {
        super(new Vector(position.x, position.y), new Vector(size.x, size.y));
        this.type = type;
    }
}

// Interaction类，继承自Hitbox
class Interaction extends Hitbox {
    constructor(position, size, type, autoTrigger, extra = {}) {
        super(new Vector(position.x, position.y), new Vector(size.x, size.y));
        this.type = type;
        this.autoTrigger = !!autoTrigger;
        
        // 安全地合并额外属性，避免覆盖position和size
        for (const key in extra) {
            if (key !== 'position' && key !== 'size') {
                this[key] = extra[key];
            }
        }
        
        // 生成唯一ID用于跟踪已触发的交互
        this.__id = Math.random().toString(36).substr(2, 9);
    }
}

class MapManager {
    constructor() {
        if (MapManager.instance)
            return MapManager.instance;
        MapManager.instance = this;
        this.backgrounds = [];
        this.blocks = [];
        this.textures = [];
        this.interactions = [];
        this.mapHitBox = new Hitbox(new Vector(0, 0), new Vector(1280, 720));
        this._triggeredInteractionIds = new Set();
        this._completedEvents = new Set(); // 记录已完成的事件
    }

    /**
     * 加载指定层和房间的地图数据
     * @param {number|string} layer 层编号或名称
     * @param {number|string} room 房间编号或名称
     */
    async loadRoom(layer, room) {
        const url = `assets/stages/layer${layer}/room${room}.json`;
        try {
            const data = await dataManager.loadJSON(url);
            this.rawMapData = JSON.parse(JSON.stringify(data)); // 深拷贝一份原始地图数据
            // 记录当前层与房间，供存档使用
            this.currentLayer = typeof layer === 'string' ? parseInt(layer, 10) : layer;
            this.currentRoom = typeof room === 'string' ? parseInt(room, 10) : room;
            this.playerSpawn = data.playerSpawn ? { ...data.playerSpawn } : null;
            this.enemySpawns = Array.isArray(data.enemySpawns) ? data.enemySpawns.map(e => ({ ...e })) : [];
            this.backgrounds = (data.backgrounds || []).map(obj => ({ ...obj }));
            // 生成方块碰撞盒
            this.blocks = (data.blocks || []).map(obj => new Block(obj.position, obj.size, obj.type));
            this.textures = (data.textures || []).map(obj => ({ ...obj }));
            // 生成交互点碰撞盒，自动触发的排前面
            const allInteractions = (data.interactions || []).map(obj => new Interaction(obj.position, obj.size, obj.type, obj.autoTrigger, obj));
            this.interactions = [
                ...allInteractions.filter(i => i.autoTrigger),
                ...allInteractions.filter(i => !i.autoTrigger)
            ];
            this._triggeredInteractionIds.clear();
            
            // 调试信息：显示加载的交互点
            console.log('🗺️ 加载交互点:', this.interactions.map(i => ({
                type: i.type,
                position: i.position,
                size: i.size,
                autoTrigger: i.autoTrigger,
                can_be_used_when: i.can_be_used_when,
                positionType: typeof i.position,
                sizeType: typeof i.size,
                hasAddVector: typeof i.position?.addVector
            })));
        } catch (e) {
            console.error('MapManager.loadRoom error:', e);
        }
    }

    /** 获取玩家出生点 */
    getPlayerSpawn() { return this.playerSpawn; }
    /** 获取敌人生成信息 */
    getEnemySpawns() { return this.enemySpawns || []; }
    /** 获取所有方块的碰撞盒数组 */
    getBlockHitboxes() { return this.blocks || []; }
    /** 获取所有交互点的碰撞盒数组 */
    getInteractionHitboxes() { return this.interactions || []; }

    /**
     * 每帧更新：检测玩家与交互点重叠并触发
     * - autoTrigger: 首次进入范围立即触发一次
     * - 手动交互: 按下 E 键且重叠时触发
     */
    update(deltaTime, player) {
        try {
            if (!player || !this.interactions || this.interactions.length === 0) return;
            const playerHitbox = player.hitbox || player.getHitbox?.();
            if (!playerHitbox) return;

            // 遍历 interactions
            for (let i = 0; i < this.interactions.length; i++) {
                const inter = this.interactions[i];
                if (!inter) continue;
                
                // 检查玩家是否与交互点重叠
                const overlapping = playerHitbox.checkHit(inter);
                const already = this._triggeredInteractionIds.has(inter.__id);
                
                if (overlapping) {
                    // 调试信息：显示重叠检测
                    if (inter.type === 'next_room' || inter.type === 'exit') {
                        console.log('🎯 玩家在传送点区域:', {
                            type: inter.type,
                            playerPos: playerHitbox.position,
                            interactionPos: inter.position,
                            overlapping: overlapping
                        });
                    }
                    
                    if (inter.autoTrigger && !already) {
                        this._triggeredInteractionIds.add(inter.__id);
                        bus.emit(Events.interaction.trigger, { type: inter.type, event: inter.event, data: inter });
                        continue;
                    }
                    // 手动交互：E 键
                    if (!inter.autoTrigger) {
                        const eKeyDown = inputManager.isKeyDown('E');
                        if (eKeyDown) {
                            console.log('🔑 E键按下，触发交互:', inter.type, inter.event);
                            bus.emit(Events.interaction.trigger, { type: inter.type, event: inter.event, data: inter });
                        }
                    }
                }
            }
        } catch (err) {
            console.error('MapManager.update error:', err);
        }
    }

    /**
     * 渲染地图，显示顺序：背景-方块-贴图
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        // 绘制背景
        for (const bg of this.backgrounds) {
            this.drawItem(ctx, bg, 'background');
        }
        // 绘制方块
        for (const block of this.blocks) {
            this.drawItem(ctx, block, 'block');
        }
        // 绘制贴图
        for (const tex of this.textures) {
            this.drawItem(ctx, tex, 'texture');
        }
        // 绘制交互点提示
        for (const inter of this.interactions) {
            this.drawInteraction(ctx, inter);
        }
    }

    /**
     * 绘制单个元素（背景/方块/贴图）
     */
    drawItem(ctx, item, type) {
        ctx.save();
        // 优先用 TextureManager 获取贴图
        let texture = null;
        // 贴图命名建议：如 backgrounds/xxx, blocks/xxx, textures/xxx
        let key = type + 's';
        texture = textureManager.getTexture(key, item.type);
        if (texture) {
            ctx.drawImage(texture, item.position.x, item.position.y, item.size.x, item.size.y);
        } else {
            // 没有贴图时用不同颜色区分
            if (type === 'background') {
                ctx.fillStyle = '#e0e0e0';
            } else if (type === 'block') {
                ctx.fillStyle = '#654321';
            } else if (type === 'texture') {
                ctx.fillStyle = '#8888ff';
            } else {
                ctx.fillStyle = '#cccccc';
            }
            ctx.fillRect(item.position.x, item.position.y, item.size.x, item.size.y);
        }
        ctx.restore();
    }

    /**
     * 绘制交互点提示（只显示传送点）
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} inter - 交互点数据
     */
    drawInteraction(ctx, inter) {
        // 只绘制传送点
        if (inter.type !== 'next_room' && inter.type !== 'exit') {
            return;
        }

        ctx.save();
        
        // 绘制交互点边框
        ctx.lineWidth = 2;
        
        // 检查当前房间是否有敌人
        const hasEnemies = this.enemySpawns && this.enemySpawns.length > 0;
        const requiresBattleEnd = inter.can_be_used_when === 'battle_end' || hasEnemies;
        
        // 根据条件显示不同颜色
        if (requiresBattleEnd) {
            ctx.strokeStyle = '#ffaa00'; // 橙色边框
        } else {
            ctx.strokeStyle = '#00ff00'; // 绿色边框
        }
        
        ctx.strokeRect(inter.position.x, inter.position.y, inter.size.x, inter.size.y);
        
        // 绘制文字背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(inter.position.x, inter.position.y - 25, inter.size.x, 20);
        
        // 绘制文字
        let text = '';
        let textColor = '#ffffff';
        
        if (requiresBattleEnd) {
            text = '传送点 (需击败所有敌人)';
            textColor = '#ffaa00';
        } else {
            text = '传送点 (按E键传送)';
            textColor = '#00ff00';
        }
        
        ctx.fillStyle = textColor;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            text, 
            inter.position.x + inter.size.x / 2, 
            inter.position.y - 10
        );
        
        ctx.restore();
    }

    /**
     * 获取当前地图状态
     * @returns {Object} 包含地图状态的对象
     */
    getMapState() {
        return {
            triggeredInteractions: Array.from(this._triggeredInteractionIds),
            completedEvents: Array.from(this._completedEvents),
            currentLayer: this.currentLayer,
            currentRoom: this.currentRoom
        };
    }

    /**
     * 恢复地图状态
     * @param {Object} state 地图状态对象
     */
    restoreMapState(state) {
        if (state.triggeredInteractions) {
            this._triggeredInteractionIds = new Set(state.triggeredInteractions);
        }
        if (state.completedEvents) {
            this._completedEvents = new Set(state.completedEvents);
        }
    }

    /**
     * 标记事件为已完成
     * @param {string} eventId 事件ID
     */
    completeEvent(eventId) {
        this._completedEvents.add(eventId);
    }

    /**
     * 检查事件是否已完成
     * @param {string} eventId 事件ID
     * @returns {boolean}
     */
    isEventCompleted(eventId) {
        return this._completedEvents.has(eventId);
    }
}

export const mapManager = new MapManager();