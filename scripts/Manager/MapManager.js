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
        Object.assign(this, extra);
    }
}

class Layer {
    constructor() {
        /** @type {Tile[]} */
        this.tiles = [];
        /** @type {number} */
        this.opacity = 1;
    }
    draw(typename) {
        for (let i of this.tiles) {
            i.draw(typename);
        }
    }
}

class MapManager {
    constructor() {
        this.backgrounds = [];
        this.blocks = [];
        this.textures = [];
        this.interactions = [];
        this.mapHitBox = new Hitbox(new Vector(0, 0), new Vector(1280, 720));
    }

    /**
     * 加载指定层和房间的地图数据
     * @param {number|string} layer 层编号或名称
     * @param {number|string} room 房间编号或名称
     */
    async loadRoom(layer, room) {
        const url = `assets/stages/layer${layer}/room${room}.js`;
        try {
            const data = await window.$game.dataManager.loadJSON(url);
            this.rawMapData = JSON.parse(JSON.stringify(data)); // 深拷贝一份原始地图数据
            this.playerSpawn = data.playerSpawn ? { ...data.playerSpawn } : null;
            this.enemySpawns = Array.isArray(data.enemySpawns) ? data.enemySpawns.map(e => ({ ...e })) : [];
            this.backgrounds = (data.backgrounds || []).map(obj => ({ ...obj }));
            this.blocks = (data.blocks || []).map(obj => new Block(obj.position, obj.size, obj.type));
            this.textures = (data.textures || []).map(obj => ({ ...obj }));
            // 交互点：先自动触发后手动触发
            const allInteractions = (data.interactions || []).map(obj => new Interaction(obj.position, obj.size, obj.type, obj.autoTrigger, obj));
            this.interactions = [
                ...allInteractions.filter(i => i.autoTrigger),
                ...allInteractions.filter(i => !i.autoTrigger)
            ];
            // 生成方块碰撞盒
            this.blockHitboxes = this.blocks.map(b => new Hitbox(
                new Vector(b.position.x, b.position.y),
                new Vector(b.size.x, b.size.y)
            ));
            // 生成交互点碰撞盒，自动触发的排前面
            const autoInteractions = this.interactions.filter(i => i.autoTrigger);
            const manualInteractions = this.interactions.filter(i => !i.autoTrigger);
            this.interactionHitboxes = [
                ...autoInteractions.map(i => new Hitbox(
                    new Vector(i.position.x, i.position.y),
                    new Vector(i.size.x, i.size.y)
                )),
                ...manualInteractions.map(i => new Hitbox(
                    new Vector(i.position.x, i.position.y),
                    new Vector(i.size.x, i.size.y)
                ))
            ];
        } catch (e) {
            console.error('MapManager.loadRoom error:', e);
        }
    }

    /**
     * 获取玩家出生点
     */
    getPlayerSpawn() {
        return this.playerSpawn;
    }

    /**
     * 获取敌人生成信息
     */
    getEnemySpawns() {
        return this.enemySpawns || [];
    }

    /**
     * 获取所有方块的碰撞盒数组
     */
    getBlockHitboxes() {
        return this.blocks || [];
    }

    /**
     * 获取所有交互点的碰撞盒数组
     */
    getInteractionHitboxes() {
        return this.interactions || [];
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
        // 可选：绘制交互点提示
        // for (const inter of this.interactions) {
        //     this.drawInteraction(ctx, inter);
        // }
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
        texture = window.$game.textureManager.getTexture(key, item.type);
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

    // 可扩展：绘制交互点
    // drawInteraction(ctx, inter) {
    //     ctx.save();
    //     ctx.strokeStyle = '#ff0000';
    //     ctx.strokeRect(inter.position.x, inter.position.y, inter.size.x, inter.size.y);
    //     ctx.restore();
    // }
}
