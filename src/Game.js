import { inputManager } from "./Manager/InputManager";
import { textureManager } from "./Manager/TextureManager";
import { soundManager } from "./Manager/SoundManager";
import { eventBus as bus, EventTypes as Events } from "./Manager/EventBus";
import { mapManager } from "./Manager/MapManager";
import { projectilesManager } from "./System/Attack/ProjectilesManager";
import { attributeManager } from "./Manager/AttributeManager";
import { player } from "./Entities/Player";
import { Enemy } from "./Entities/Enemy";
import { Vector } from "./Utils/Vector";
import { itemManager } from "./System/Item/ItemManager";
import { ItemConfigs as Items } from "./System/Item/ItemConfigs";
class Game {
    constructor() {
        if (Game.instance)
            return Game.instance;
        Game.instance = this;
        // 获取画布
        this.canvas = document.getElementById('canvas');
        // 禁用右键菜单和拖拽（禁不掉浏览器的右键手势）
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
        this.canvas.addEventListener('dragstart', e => e.preventDefault());
        this.ctx = this.canvas.getContext('2d');
        this.leftCanvas = document.getElementById('left-ui');
        this.rightCanvas = document.getElementById('right-ui');
        this.leftCtx = this.leftCanvas.getContext('2d');
        this.rightCtx = this.rightCanvas.getContext('2d');

        this.isStop = false;
        this.isPaused = true;

        this.lastTime = 0;
        const maxGameFrameRate = 60;
        this.targetFrameTime = 1000 / maxGameFrameRate;
        this.loop = this.loop.bind(this);

        this.statistics = {
            portal: 0,
            bullet: 0,
            restart: 0,
            jump: 0,
            jumpTime: 0,
        };
    }

    async init() {
        await textureManager.load();
        await soundManager.load();
        await mapManager.loadRoom(0, 3);

        // 初始化玩家
        const spawn = mapManager.getPlayerSpawn();
        player.setPosition(new Vector(spawn.x, spawn.y));

        bus.on({
            event: Events.game.tick,
            handler: ({ deltaTime }) => itemManager.update(deltaTime),
            priority: 1
        });
        bus.on({
            event: Events.game.tick,
            handler: ({ deltaTime }) => attributeManager.update(deltaTime),
            priority: 0.7
        });
        bus.on({
            event: Events.game.tick,
            handler: ({ deltaTime }) => player.update(deltaTime),
            priority: 0.5
        });
        bus.on({
            event: Events.game.tick,
            handler: ({ deltaTime }) => this.enemies.forEach(enemy => enemy.update(deltaTime)),
            priority: 0.3
        });
        bus.on({
            event: Events.game.tick,
            handler: ({ deltaTime }) => projectilesManager.update(deltaTime),
            priority: 0.1
        });

        bus.on({
            event: Events.player.die,
            handler: () => this.stop()
        });

        // 初始化敌人
        const enemySpawns = mapManager.getEnemySpawns();
        this.enemies = [];
        if (Array.isArray(enemySpawns)) {
            for (const e of enemySpawns) {
                this.enemies.push(new Enemy(e.type, new Vector(e.x, e.y)));
            }
        }
        //TODO:测试用
        itemManager.tryAcquire(Items.xq休憩);
        itemManager.tryAcquire(Items.yy友谊);
        itemManager.tryAcquire(Items.ls朗诵);
        window.itemManager = itemManager;
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        mapManager.draw(ctx); // 绘制地图
        projectilesManager.draw(ctx); // 绘制子弹
        this.enemies.forEach(enemy => enemy.draw(ctx)); //绘制敌人
        player.draw(ctx); //绘制玩家
        const l_ctx = this.leftCtx;
        l_ctx.clearRect(0, 0, this.leftCanvas.width, this.leftCanvas.height);
        const r_ctx = this.rightCtx;
        r_ctx.clearRect(0, 0, this.rightCanvas.width, this.rightCanvas.height);
        itemManager.draw(r_ctx);
    }

    start(prev = 0) {
        this.loop(0);
    }

    loop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        if (deltaTime >= this.targetFrameTime) {
            inputManager.update();
            if (game.enemies.length == 0)
                bus.emit(Events.game.battle.end);
            if (!this.isPaused && !this.isStop) bus.emit(Events.game.tick, { deltaTime: deltaTime });
            this.draw();
        }
        this.lastTime = currentTime - (deltaTime % this.targetFrameTime);
        requestAnimationFrame(this.loop);
    }

    pause() {
        this.isPaused = true;
        const menu = document.getElementById('pause-menu');
        if (menu) menu.style.display = 'flex';
    }

    continue() {
        this.isPaused = false;
        const menu = document.getElementById('pause-menu');
        if (menu) menu.style.display = 'none';
    }

    stop() {
        this.isStop = true;
    }
}

export const game = new Game();