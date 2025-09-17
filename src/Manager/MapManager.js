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
        
        // 2. 合并extra数据（可能包含普通对象的position）
        Object.assign(this, extra);
        
        // 3. 关键修复：重新强制设置position和size为Vector实例（覆盖普通对象）
        this.position = position;
        this.size = size;
        
        // 4. 唯一ID
        this.__id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
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
            if (!player) return;
            const interactionHitboxes = this.getInteractionHitboxes();
            if (!Array.isArray(interactionHitboxes) || interactionHitboxes.length === 0) return;

            // 调试：调用验证方法，看是否有非Vector的position
            this.checkVectorType();

            const playerHitbox = player.hitbox || player.getHitbox?.();
            if (!playerHitbox) return;

            for (let i = 0; i < interactionHitboxes.length; i++) {
                const inter = interactionHitboxes[i];
                const hb = inter; // Interaction是Hitbox实例
                if (!hb) continue;

                // 此时hb.position应该是Vector实例，可正常调用addVector
                const overlapping = playerHitbox.checkHit(hb);
                const alreadyTriggered = this._triggeredInteractionIds.has(inter.__id);

                if (overlapping) {
                    if (inter.autoTrigger && !alreadyTriggered) {
                        console.log(`[触发事件] 发射interaction.trigger，type=${inter.type}`);
                        this._triggeredInteractionIds.add(inter.__id);
                        bus.emit(Events.interaction.trigger, { 
                            type: inter.type, 
                            event: inter.event, 
                            data: inter 
                        });
                        continue;
                    }
                    if (!inter.autoTrigger && inputManager.isKeyDown('KeyE')) {
                        bus.emit(Events.interaction.trigger, { 
                            type: inter.type, 
                            event: inter.event, 
                            data: inter 
                        });
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
}

export const mapManager = new MapManager();