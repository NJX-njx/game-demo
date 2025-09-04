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
class Game {
    constructor() {
        if (Game.instance)
            return Game.instance;
        Game.instance = this;
        // 获取画布
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');

        this.isStop = false;
        this.isPaused = false;

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
        await mapManager.loadRoom(1, 1);

        // 初始化玩家
        const spawn = mapManager.getPlayerSpawn();
        player.setPosition(new Vector(spawn.x, spawn.y));

        bus.on(EventTypes.game.tick, ({ deltaTime }) => {
            inputManager.update();
            attributeManager.update(deltaTime);
            player.update(deltaTime);
            this.enemies.forEach(enemy => enemy.update(deltaTime));
            projectilesManager.update(deltaTime);
        });
        bus.on(EventTypes.game.tick, () => {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            // 绘制地图
            mapManager.draw(ctx);
            player.draw(ctx);
            this.enemies.forEach(enemy => enemy.draw(ctx));
            projectilesManager.draw(ctx);
        }, { priority: -1 });
        bus.on(EventTypes.player.die, () => this.stop());

        // 初始化敌人
        const enemySpawns = mapManager.getEnemySpawns();
        this.enemies = [];
        if (Array.isArray(enemySpawns)) {
            for (const e of enemySpawns) {
                this.enemies.push(new Enemy(e.type, new Vector(e.x, e.y)));
            }
        }
    }

    start(prev = 0) {
        this.loop(0);
    }

    loop(currentTime) {
        const deltaTime = currentTime - this.lastTime;

        if (!this.isPaused && !this.isStop && deltaTime >= this.targetFrameTime) {
            bus.emit(EventTypes.game.tick, { deltaTime: deltaTime });
        }
        this.lastTime = currentTime - (deltaTime % this.targetFrameTime);
        requestAnimationFrame(this.loop);
    }

    pause() {
        this.isPaused = true;
    }

    continue() {
        this.isPaused = false;
    }

    stop() {
        this.isStop = true;
    }
}

export const game = new Game();