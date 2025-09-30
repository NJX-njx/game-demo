import { Hitbox } from "../Utils/Hitbox";
import { Vector } from "../Utils/Vector";
import { textureManager } from "./TextureManager";
import { dataManager } from "./DataManager";
import { eventBus as bus, EventTypes as Events } from "./EventBus";
import { inputManager } from "../System/Input/InputManager";
import { player } from "../Entities/Player";
import { spawnEnemy } from "../Entities/Enemys/Enemy";

// Block类，继承自Hitbox
class Block extends Hitbox {
    constructor(position, size, type) {
        super(new Vector(position.x, position.y), new Vector(size.x, size.y));
        this.type = type;
    }
}

// Interaction类，继承自Hitbox
class Interaction extends Hitbox {
    constructor(position, size, extra = {}) {
        super(new Vector(position.x, position.y), new Vector(size.x, size.y));
        for (const key in extra) {
            if (key !== 'position' && key !== 'size') {
                this[key] = extra[key];
            }
        }
        this.type = extra.type;
        this.autoTrigger = !!extra.autoTrigger;
        this.triggered = false; // 是否已触发
    }
}

const layerRooms = { 0: 4, 1: 1 };

class MapManager {
    constructor() {
        if (MapManager.instance)
            return MapManager.instance;
        MapManager.instance = this;
        this.currentLayer = 0;
        this.currentRoom = 1;
        this.backgrounds = [];
        /** @type {Block[]} */
        this.blocks = [];
        this.textures = [];
        /** @type {Interaction[]} */
        this.interactions = [];

        this.enemies = [];
    }

    /**
     * 加载指定层和房间的地图数据
     * @param {number} layer 层编号或名称
     * @param {number} room 房间编号或名称
     */
    async loadRoom(layer, room) {
        const url = `assets/stages/layer${layer}/room${room}.json`;
        try {
            console.log(`🗺️ 开始加载房间layer${layer}/room${room}`);

            const data = await dataManager.loadJSON(url);
            this.currentLayer = layer;
            this.currentRoom = room;
            const playerSpawn = data.playerSpawn ? { ...data.playerSpawn } : { x: 0, y: 0 };
            const enemySpawns = (data.enemySpawns || []).map(obj => ({ ...obj }));
            this.backgrounds = (data.backgrounds || []).map(obj => ({ ...obj }));
            this.blocks = (data.blocks || []).map(obj => new Block(obj.position, obj.size, obj.type));
            this.textures = (data.textures || []).map(obj => ({ ...obj }));
            const allInteractions = (data.interactions || []).map(obj => new Interaction(obj.position, obj.size, obj));
            // 自动触发的排前面
            this.interactions = [
                ...allInteractions.filter(i => i.autoTrigger),
                ...allInteractions.filter(i => !i.autoTrigger)
            ];

            player.setPosition(new Vector(playerSpawn.x, playerSpawn.y));

            this.enemies = [];
            for (const e of enemySpawns) {
                this.enemies.push(spawnEnemy(e.type, new Vector(e.x, e.y), new Vector(50, 50)));
            }

            // 调试信息：显示加载的交互点
            console.log('🗺️ 加载交互点:', this.interactions);
            console.log('👹 加载敌人:', this.enemies);

            console.log(`✅ 成功切换到layer${layer}/room${room}`);
        } catch (e) {
            console.error(`加载房间layer${layer}/room${room}失败，error:${e}`);
        }
    }

    async nextRoom() {
        let nextLayer = this.currentLayer;
        let nextRoom = this.currentRoom + 1;
        if (nextRoom > layerRooms[this.currentLayer]) {
            nextLayer += 1;
            nextRoom = 1;
        }
        if (!layerRooms[nextLayer]) {
            console.log('🏆 已到达最后一层，无法继续前进');
            return;
        }
        this.loadRoom(nextLayer, nextRoom);
    }

    /** 获取所有方块的碰撞盒数组 */
    getBlockHitboxes() { return this.blocks; }
    /** 获取所有交互点的碰撞盒数组 */
    getInteractionHitboxes() { return this.interactions; }

    /**
     * 每帧更新：检测玩家与交互点重叠并触发
     * - autoTrigger: 首次进入范围立即触发一次
     * - 手动交互: 按下 E 键且重叠时触发
     */
    update(deltaTime) {
        try {
            // 遍历 interactions
            for (let inter of this.interactions) {
                // 检查玩家是否与交互点重叠及交互点是否已触发过
                if (!player.hitbox.checkHit(inter) || inter.triggered) continue;

                if (inter.autoTrigger || inputManager.isKeyDown('E')) {// 自动触发或手动交互：E 键
                    inter.triggered = true;
                    bus.emit(Events.interaction.trigger, { interaction: inter });
                    break; // 每帧只触发一个交互点
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
        let texture = textureManager.getTexture(type + 's', item.type);
        if (texture) {
            ctx.drawImage(texture, item.position.x, item.position.y, item.size.x, item.size.y);
        } else {
            // 没有贴图时用不同颜色区分
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
     * @returns {MapManager} 包含地图状态的对象
     */
    getMapState() {
        return MapManager.instance;
    }

    /**
     * 恢复地图状态
     * @param {MapManager} instance 地图状态对象
     */
    restoreMapState(instance) {
        if (instance && instance instanceof MapManager) {
            MapManager.instance = instance;
        }
    }
}

export const mapManager = new MapManager();