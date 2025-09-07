// Game.js
import { inputManager } from "./Manager/InputManager";
import { textureManager } from "./Manager/TextureManager";
import { soundManager } from "./Manager/SoundManager";
import { eventBus as bus, EventTypes } from "./Manager/EventBus";
import { mapManager } from "./Manager/MapManager";
import { projectilesManager } from "./System/Attack/ProjectilesManager";
import { attributeManager } from "./Manager/AttributeManager";
import { player } from "./Entities/Player";
import { Enemy } from "./Entities/Enemy";
import { Vector } from "./Utils/Vector";
import { dialogManager } from "./DialogManager";

class Game {
    static instance;
    
    constructor() {
        if (Game.instance) return Game.instance;
        Game.instance = this;

        // 画布初始化
        this.canvas = document.getElementById('canvas');
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
        this.canvas.addEventListener('dragstart', e => e.preventDefault());
        this.ctx = this.canvas.getContext('2d');

        // 游戏状态
        this.isStop = false;
        this.isPaused = false;
        this.lastTime = 0;
        const maxGameFrameRate = 60;
        this.targetFrameTime = 1000 / maxGameFrameRate;
        this.loop = this.loop.bind(this);

        // 暴露鼠标管理器
        this.mouseManager = inputManager.mouse;

        // 开场对话内容
        this.openingDialogs = [
            { text: '【向导】欢迎来到深渊回归！', url: 'guide_1' },
            { text: '【向导】按Ctrl/空格/左键可快进对话，按住Ctrl能加速。', url: 'guide_2' },
            { text: '【向导】前方有大量敌人，你需要熟练使用攻击和闪避！', url: 'guide_3' },
            { text: '【向导】准备好了吗？冒险即将开始！', url: 'guide_4' },
        ];

        // 统计数据
        this.statistics = {
            portal: 0,
            bullet: 0,
            restart: 0,
            jump: 0,
            jumpTime: 0,
        };
    }

    // 游戏初始化
    async init() {
        await textureManager.load();
        await soundManager.load();
        await mapManager.loadRoom(0, 1);

        // 初始化玩家
        const spawn = mapManager.getPlayerSpawn();
        player.setPosition(new Vector(spawn.x, spawn.y));

        // 绑定游戏事件
        bus.on({
            event: EventTypes.game.tick,
            handler: ({ deltaTime }) => attributeManager.update(deltaTime),
            priority: 0.7
        });
        
        bus.on({
            event: EventTypes.game.tick,
            handler: ({ deltaTime }) => player.update(deltaTime),
            priority: 0.5
        });
        
        bus.on({
            event: EventTypes.game.tick,
            handler: ({ deltaTime }) => this.enemies.forEach(enemy => enemy.update(deltaTime)),
            priority: 0.3
        });
        
        bus.on({
            event: EventTypes.game.tick,
            handler: ({ deltaTime }) => projectilesManager.update(deltaTime),
            priority: 0.1
        });
        
        bus.on({
            event: EventTypes.game.tick,
            handler: () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                mapManager.draw(this.ctx);
                projectilesManager.draw(this.ctx);
                this.enemies.forEach(enemy => enemy.draw(this.ctx));
                player.draw(this.ctx);
                this.mouseManager.draw(this.ctx);
            },
            priority: -1
        });

        // 玩家死亡事件
        bus.on({
            event: EventTypes.player.die,
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
    }

    // 启动游戏（先显示对话，再开始游戏循环）
    async start() {
        await this.init();
        // 启动开场对话，完成后开始游戏循环
        dialogManager.startDialog(this.openingDialogs, () => {
            this.lastTime = performance.now();
            requestAnimationFrame(this.loop);
        });
    }

    // 游戏主循环
    loop(currentTime) {
        if (this.isStop) return;

        const deltaTime = currentTime - this.lastTime;
        if (deltaTime >= this.targetFrameTime) {
            inputManager.update();
            if (!this.isPaused) {
                bus.emit(EventTypes.game.tick, { deltaTime: deltaTime / 1000 });
            }
            this.lastTime = currentTime - (deltaTime % this.targetFrameTime);
        }

        requestAnimationFrame(this.loop);
    }

    // 暂停游戏
    pause() {
        this.isPaused = true;
    }

    // 继续游戏
    continue() {
        this.isPaused = false;
    }

    // 停止游戏
    stop() {
        this.isStop = true;
    }
}

export const game = new Game();
