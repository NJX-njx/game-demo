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
    static saveCurrentGame(slotId = 1) {
        const saveData = {
            player: player.constructor.getSaveData(),
            layer: mapManager.currentLayer,
            room: mapManager.currentRoom,
            timestamp: new Date().toISOString()
        };
        let currentPlayer = null;
        try { currentPlayer = JSON.parse(localStorage.getItem("present_data")); } catch (_) { currentPlayer = null; }
        if (!currentPlayer || typeof currentPlayer !== 'object') {
            currentPlayer = { saveSlots: [] };
        }
        currentPlayer.saveSlots = currentPlayer.saveSlots || [];
        currentPlayer.saveSlots[slotId - 1] = saveData;
        localStorage.setItem("present_data", JSON.stringify(currentPlayer));
        return saveData;
    }

    static async loadGame(slotId = 1) {
        let currentPlayer = null;
        try { currentPlayer = JSON.parse(localStorage.getItem("present_data")); } catch (_) { currentPlayer = null; }
        if (!currentPlayer?.saveSlots?.[slotId - 1]) return false;

        const saveData = currentPlayer.saveSlots[slotId - 1];
        await mapManager.loadRoom(saveData.layer, saveData.room);
        try {
            if (saveData.player?.position) {
                const pos = saveData.player.position;
                player.setPosition(new Vector(pos.x, pos.y));
            }
            if (saveData.player?.state) {
                player.state = saveData.player.state;
            }
        } catch (_) { }
        return true;
    }

    constructor() {
        if (Game.instance) return Game.instance;
        Game.instance = this;

        // 获取画布
        this.canvas = document.getElementById('canvas');
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
        this.canvas.addEventListener('dragstart', e => e.preventDefault());
        this.ctx = this.canvas.getContext('2d');
        this.leftCanvas = document.getElementById('left-ui');
        this.rightCanvas = document.getElementById('right-ui');
        this.leftCtx = this.leftCanvas.getContext('2d');
        this.rightCtx = this.rightCanvas.getContext('2d');

        // 新增：存储玩家血量百分比（0~1）
        this.currentHpPercent = 1; // 初始满血

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
        await new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });

        // 初始化退出按钮
        const exitBtn = document.getElementById('exit-btn');
        if (exitBtn) {
            exitBtn.replaceWith(exitBtn.cloneNode(true));
            const newExitBtn = document.getElementById('exit-btn');
            newExitBtn.addEventListener('click', (e) => {
                console.log('Exit button clicked');
                try { if (document.pointerLockElement) document.exitPointerLock(); } catch (_) { }
                this.stop();
            });
            newExitBtn.style.pointerEvents = 'auto';
        } else {
            console.error('Exit button not found!');
        }

        await textureManager.load();
        await soundManager.load();

        // 加载存档
        const selectedSlotRaw = localStorage.getItem('selected_slot');
        const selectedSlot = Math.max(1, parseInt(selectedSlotRaw || '1', 10) || 1);
        this.currentSlotId = selectedSlot;
        let loaded = false;
        try { loaded = await Game.loadGame(selectedSlot); } catch (_) { loaded = false; }
        if (!loaded) {
            await mapManager.loadRoom(0, 3);
        }

        // 初始化玩家位置
        if (!loaded) {
            const spawn = mapManager.getPlayerSpawn();
            player.setPosition(new Vector(spawn.x, spawn.y));
        }

        // 关键修改：监听玩家血量变化事件，更新currentHpPercent
        bus.on({
            event: Events.player.hpPercent,
            handler: (hpPercent) => {
                this.currentHpPercent = Math.max(0, Math.min(1, hpPercent));
            },
            priority: 0
        });

        // 游戏主循环事件
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
            event: Events.game.tick,
            handler: () => {
                // 主画布绘制
                const ctx = this.ctx;
                ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                mapManager.draw(ctx);
                projectilesManager.draw(ctx);
                this.enemies.forEach(enemy => enemy.draw(ctx));
                player.draw(ctx);

                // 左侧UI绘制（竖版血条在这里）
                const l_ctx = this.leftCtx;
                l_ctx.clearRect(0, 0, this.leftCanvas.width, this.leftCanvas.height);
                this.drawVerticalHpBar(l_ctx); // 绘制竖版血条

                // 右侧UI绘制
                const r_ctx = this.rightCtx;
                r_ctx.clearRect(0, 0, this.rightCanvas.width, this.rightCanvas.height);
                itemManager.draw(r_ctx);
            },
            priority: -1
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
        // 测试物品
        itemManager.tryAcquire(Items.xq休憩);
        itemManager.tryAcquire(Items.yy友谊);
        itemManager.tryAcquire(Items.ls朗诵);
        window.itemManager = itemManager;
    }

    // 修正后的竖版血条绘制方法（从上往下扣血）
    drawVerticalHpBar(ctx) {
        const config = {
            x: 35,          // 水平位置（左侧UI居中）
            y: 50,          // 血条顶部Y坐标
            width: 10,      // 血条宽度
            totalHeight: 600, // 总高度（从y=50到y=650）
            bgColor: '#ff3333', // 背景色（空血）
            fgColor: '#33ff33', // 前景色（当前血量）
            borderColor: '#000000' // 边框
        };

        // 1. 绘制背景（红色，完整高度）
        ctx.fillStyle = config.bgColor;
        ctx.fillRect(config.x, config.y, config.width, config.totalHeight);

        // 2. 绘制边框
        ctx.strokeStyle = config.borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(config.x, config.y, config.width, config.totalHeight);

        // 3. 绘制当前血量（绿色，从上往下缩短）
        const currentHeight = config.totalHeight * this.currentHpPercent;
        // 关键修正：前景条的Y坐标 = 背景顶部 + (总高度 - 当前高度)
        // 这样血量减少时，绿色部分从顶部开始缩短
        const fgY = config.y + (config.totalHeight - currentHeight);
        ctx.fillStyle = config.fgColor;
        ctx.fillRect(config.x, fgY, config.width, currentHeight);
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
        }
        this.lastTime = currentTime - (deltaTime % this.targetFrameTime);
        this.rafId = requestAnimationFrame(this.loop);
    }

    pause() {
        this.isPaused = true;
    }

    continue() {
        this.isPaused = false;
    }

    stop() {
        this.isStop = true;
        try { if (this.rafId) cancelAnimationFrame(this.rafId); } catch (_) { }
        try { if (document.pointerLockElement) document.exitPointerLock(); } catch (_) { }
        const slotToSave = this.currentSlotId && this.currentSlotId > 0 ? this.currentSlotId : 1;
        Game.saveCurrentGame(slotToSave);
    }
}

export const game = new Game();
