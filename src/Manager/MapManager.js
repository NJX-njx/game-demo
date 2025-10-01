import { Hitbox } from "../Utils/Hitbox";
import { Vector } from "../Utils/Vector";
import { textureManager } from "./TextureManager";
import { dataManager } from "./DataManager";
import { player } from "../Entities/Player";
import { spawnEnemy } from "../Entities/Enemys/Enemy";
import { Interaction } from "./InteractionManager";

// Block类，继承自Hitbox
class Block extends Hitbox {
    constructor(position, size, type) {
        super(new Vector(position.x, position.y), new Vector(size.x, size.y));
        this.type = type;
    }
}

const layerRooms = { 0: 4, 1: 8, 2: 8, 3: 8, 4: 8, 5: 10, 6: 3 };

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
        try {
            const url = `assets/stages/Chapter${layer}/Lv${layer}-${room}.json`;
            console.log(`🗺️ 开始加载房间: ${url}`)

            const data = await dataManager.loadJSON(url);
            this.currentLayer = layer;
            this.currentRoom = room;
            const playerSpawn = data.playerSpawn ? { ...data.playerSpawn } : { x: 0, y: 0 };
            const enemySpawns = (data.enemySpawns || []).map(obj => ({ ...obj }));
            this.backgrounds = (data.backgrounds || []).map(obj => ({ ...obj }));
            this.blocks = (data.blocks || []).map(obj => new Block(obj.position, obj.size, obj.type));
            this.textures = (data.textures || []).map(obj => ({ ...obj }));
            this.interactions = (data.interactions || []).map(obj => new Interaction(obj.position, obj.size, obj));

            // 检查所引用的贴图是否存在，尽早在加载阶段警告缺失的资源
            const checkTexture = (kind, item, source) => {
                const texture = textureManager.getTexture(kind, item.type);
                if (!texture) {
                    console.warn(`缺少贴图: kind='${kind}' id='${item.type}' (source=${source})`, item);
                }
            };

            for (const bg of this.backgrounds) checkTexture('backgrounds', bg, 'backgrounds');
            for (const block of this.blocks) checkTexture('blocks', block, 'blocks');
            for (const tex of this.textures) checkTexture('textures', tex, 'textures');

            player.setPosition(new Vector(playerSpawn.x, playerSpawn.y));

            this.enemies = [];
            this.enemySpawns = enemySpawns;
            for (const e of enemySpawns) {
                this.enemies.push(spawnEnemy(e.type, new Vector(e.x, e.y), new Vector(50, 50)));
            }

            // 调试信息：显示加载的交互点
            console.log('🗺️ 加载交互点:', this.interactions);
            console.log('👹 加载敌人:', this.enemies);

            console.log(`✅ 成功切换到 ${url}`);
        } catch (e) {
            console.error(`加载房间失败: ${url}，error:`, e);
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
    getInteractions() { return this.interactions; }

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
            inter.draw(ctx);
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
}

export const mapManager = new MapManager();