import { inputManager } from "./Manager/InputManager";
import { textureManager } from "./Manager/TextureManager";
import { soundManager } from "./Manager/SoundManager";
import { eventBus as bus, EventTypes as Events} from "./Manager/EventBus";
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
        // 读取或初始化 present_data
        let currentPlayer = null;
        try { currentPlayer = JSON.parse(localStorage.getItem("present_data")); } catch(_) { currentPlayer = null; }
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
        try { currentPlayer = JSON.parse(localStorage.getItem("present_data")); } catch(_) { currentPlayer = null; }
        if(!currentPlayer?.saveSlots?.[slotId - 1]) return false;

        const saveData = currentPlayer.saveSlots[slotId - 1];
        // 先加载地图，再恢复玩家位置/状态（注意将位置还原为 Vector）
        await mapManager.loadRoom(saveData.layer, saveData.room);
        try {
            if (saveData.player?.position) {
                const pos = saveData.player.position;
                player.setPosition(new Vector(pos.x, pos.y));
            }
            if (saveData.player?.state) {
                player.state = saveData.player.state;
            }
        } catch (_) {
            // 容错：若旧版本数据结构不一致，则只使用地图加载结果
        }
        return true;
    }
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
        // 确保DOM完全加载后再绑定事件
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
            // 先移除可能存在的旧监听器
            exitBtn.replaceWith(exitBtn.cloneNode(true));
            const newExitBtn = document.getElementById('exit-btn');
            
            newExitBtn.addEventListener('click', (e) => {
                // 不阻止默认跳转，让超链接自行导航
                console.log('Exit button clicked - event:', e);
                try { if (document.pointerLockElement) document.exitPointerLock(); } catch (_) {}
                this.stop();
            });
            
            // 测试按钮是否可点击
            newExitBtn.style.pointerEvents = 'auto';
            console.log('Exit button initialized:', newExitBtn);
        } else {
            console.error('Exit button not found!');
        }
        await textureManager.load();
        await soundManager.load();

        // 读取选中槽位并尝试加载存档
        const selectedSlotRaw = localStorage.getItem('selected_slot');
        const selectedSlot = Math.max(1, parseInt(selectedSlotRaw || '1', 10) || 1);
        this.currentSlotId = selectedSlot;
        let loaded = false;
        try { loaded = await Game.loadGame(selectedSlot); } catch (_) { loaded = false; }
        if (!loaded) {
            await mapManager.loadRoom(0, 3);
        }

        // 初始化玩家：只有在未从存档加载时才使用默认出生点
        if (!loaded) {
            const spawn = mapManager.getPlayerSpawn();
            player.setPosition(new Vector(spawn.x, spawn.y));
        }

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
        //TODO:测试用
        itemManager.tryAcquire(Items.xq休憩);
        itemManager.tryAcquire(Items.yy友谊);
        itemManager.tryAcquire(Items.ls朗诵);
        window.itemManager = itemManager;
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
        // 记录 rafId，便于 stop 时取消
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
        try { if (this.rafId) cancelAnimationFrame(this.rafId); } catch (_) {}
        try { if (document.pointerLockElement) document.exitPointerLock(); } catch (_) {}
        const slotToSave = this.currentSlotId && this.currentSlotId > 0 ? this.currentSlotId : 1;
        Game.saveCurrentGame(slotToSave); // 游戏退出时自动保存到当前槽位
    }
}

export const game = new Game();