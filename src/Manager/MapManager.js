import { Hitbox } from "../Utils/Hitbox";
import { Vector } from "../Utils/Vector";
import { textureManager } from "./TextureManager";
import { dataManager } from "./DataManager";
import { eventBus as bus, EventTypes as Events } from "./EventBus";
import { inputManager } from "../System/Input/InputManager";

// Block类，继承自Hitbox
class Block extends Hitbox {
    constructor(position, size, type) {
        super(position, size); // position和size是Vector实例
        this.type = type;
    }
}

// Interaction类，继承自Hitbox（关键修复：避免position被覆盖）
class Interaction extends Hitbox {
    constructor(position, size, type, autoTrigger, extra = {}) {
        super(position, size); // 1. 先传Vector实例给父类
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

    async loadRoom(layer, room) {
        const url = `assets/stages/layer${layer}/room${room}.json`;
        try {
            const data = await dataManager.loadJSON(url);
            this.rawMapData = JSON.parse(JSON.stringify(data));
            this.currentLayer = typeof layer === 'string' ? parseInt(layer, 10) : layer;
            this.currentRoom = typeof room === 'string' ? parseInt(room, 10) : room;
            this.playerSpawn = data.playerSpawn ? { ...data.playerSpawn } : null;
            this.enemySpawns = Array.isArray(data.enemySpawns) ? data.enemySpawns.map(e => ({ ...e })) : [];
            this.backgrounds = (data.backgrounds || []).map(obj => ({ ...obj }));

            // 修复1：Block的position/size转为Vector
            this.blocks = (data.blocks || []).map(obj => {
                const pos = new Vector(obj.position.x, obj.position.y);
                const size = new Vector(obj.size.x, obj.size.y);
                return new Block(pos, size, obj.type);
            });
            
            this.textures = (data.textures || []).map(obj => ({ ...obj }));
            
            // 修复2：Interaction的position/size转为Vector（配合Interaction类的修复）
            const allInteractions = (data.interactions || []).map(obj => {
                if (obj.type === 'dialog') {
                    obj.dialogs = obj.dialogs || [];
                }
                const pos = new Vector(obj.position.x, obj.position.y);
                const size = new Vector(obj.size.x, obj.size.y);
                return new Interaction(pos, size, obj.type, obj.autoTrigger, obj);
            });
            
            this.interactions = [
                ...allInteractions.filter(i => i.autoTrigger),
                ...allInteractions.filter(i => !i.autoTrigger)
            ];
            
            console.log("加载的交互点总数:", this.interactions.length);
            this.interactions.forEach((inter, idx) => {
                console.log(`交互点${idx + 1}: type=${inter.type}, position类型=${inter.position.constructor.name}`); // 验证：应该输出"Vector"
            });
            
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

    // 工具方法（验证position类型，方便调试）
    checkVectorType() {
        this.interactions.forEach((inter, idx) => {
            if (inter.position.constructor.name !== 'Vector') {
                console.error(`交互点${idx}的position不是Vector！类型是：`, inter.position.constructor.name);
            }
        });
    }

    getPlayerSpawn() { return this.playerSpawn; }
    getEnemySpawns() { return this.enemySpawns || []; }
    getBlockHitboxes() { return this.blocks || []; }
    getInteractionHitboxes() { return this.interactions || []; }

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
                        bus.emit(Events.interaction.trigger, { 
                            type: inter.type, 
                            event: inter.event, 
                            data: inter 
                        });
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
            console.error('错误堆栈:', err.stack);
        }
    }

    draw(ctx) {
        for (const bg of this.backgrounds) {
            this.drawItem(ctx, bg, 'background');
        }
        for (const block of this.blocks) {
            this.drawItem(ctx, block, 'block');
        }
        for (const tex of this.textures) {
            this.drawItem(ctx, tex, 'texture');
        }

        // 绘制交互点提示
        for (const inter of this.interactions) {
            this.drawInteraction(ctx, inter);
        }

    }

    drawItem(ctx, item, type) {
        ctx.save();
        let texture = null;
        let key = type + 's';
        texture = textureManager.getTexture(key, item.type);
        if (texture) {
            ctx.drawImage(texture, item.position.x, item.position.y, item.size.x, item.size.y);
        } else {
            if (type === 'background') ctx.fillStyle = '#e0e0e0';
            else if (type === 'block') ctx.fillStyle = '#654321';
            else if (type === 'texture') ctx.fillStyle = '#8888ff';
            else ctx.fillStyle = '#cccccc';
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