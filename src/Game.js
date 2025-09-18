import { inputManager } from "./System/Input/InputManager";
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
import { uiManager } from "./System/UI/UIManager";
import { dialogManager } from "./Manager/DialogManager";

class Game {
    constructor() {
        if (Game.instance) return Game.instance;
        Game.instance = this;

        // 获取画布
        this.canvas_game = document.getElementById('game-canvas');
        this.canvas_ui = document.getElementById('ui-canvas');
        // 禁用右键菜单和拖拽（禁不掉浏览器的右键手势）
        this.canvas_ui.addEventListener('contextmenu', e => e.preventDefault());
        this.canvas_ui.addEventListener('dragstart', e => e.preventDefault());
        this.ctx_game = this.canvas_game.getContext('2d');
        this.ctx_ui = this.canvas_ui.getContext('2d');

        // 存储玩家血量百分比（0~1）
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
        await textureManager.load();
        await soundManager.load();

        // 读取选中槽位并尝试加载存档
        const selectedSlotRaw = localStorage.getItem('selected_slot');
        const selectedSlot = Math.max(1, parseInt(selectedSlotRaw || '1', 10) || 1);
        this.currentSlotId = selectedSlot;
        let loaded = false;
        try { loaded = await Game.loadGame(selectedSlot); } catch (_) { loaded = false; }
        if (!loaded) {
            await mapManager.loadRoom(0, 4);
        }

        // 初始化玩家：只有在未从存档加载时才使用默认出生点
        if (!loaded) {
            const spawn = mapManager.getPlayerSpawn();
            player.setPosition(new Vector(spawn.x, spawn.y));
        }

        // 监听玩家血量变化事件，更新currentHpPercent
        bus.on({
            event: Events.player.hpPercent,
            handler: (hpPercent) => {
                this.currentHpPercent = Math.max(0, Math.min(1, hpPercent));
            },
            priority: 0
        });

        // 游戏主循环事件
        // 先更新地图交互（优先级略高于玩家/敌人）
        bus.on({
            event: Events.game.tick,
            handler: ({ deltaTime }) => mapManager.update(deltaTime, player),
            priority: 0.8
        });

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
        // 测试用
        itemManager.tryAcquire(Items.xq休憩);
        itemManager.tryAcquire(Items.yy友谊);
        itemManager.tryAcquire(Items.ls朗诵);
        window.itemManager = itemManager;
    }

    draw() {
        const ctx_game = this.ctx_game;
        ctx_game.clearRect(0, 0, this.canvas_game.width, this.canvas_game.height);
        const ctx_ui = this.ctx_ui;
        ctx_ui.clearRect(0, 0, this.canvas_ui.width, this.canvas_ui.height);

        mapManager.draw(ctx_game); // 绘制地图
        projectilesManager.draw(ctx_game); // 绘制子弹
        this.enemies.forEach(enemy => enemy.draw(ctx_game)); //绘制敌人
        player.draw(ctx_game); //绘制玩家

        uiManager.draw(ctx_ui);
        this.drawVerticalHpBar(ctx_ui);
    }

    // 调整后的竖版血条绘制方法（含下移+垂直对齐文字显示）
    drawVerticalHpBar(ctx) {
        const config = {
            x: 35,          // 调整水平位置，给文字留出空间
            y: 200,         // 血条顶部Y坐标（进一步下移，给文字留出空间）
            width: 30,      // 血条宽度
            totalHeight: 500, // 血条总高度（略微缩短，避免超出画布）
            bgColor: '#ff3333',
            fgColor: '#33ff33',
            borderColor: '#000000',
            textColor: '#ffffff',
            fontSize: '14px Arial',
            textRightAlign: 50, // 文字右对齐的基准线X坐标
        };

        // 获取玩家数据
        const playerHp = Math.round(player.state.hp);
        const playerHpMax = Math.round(player.state.hp_max);
        const playerAtk = Math.round(player.state.attack.atk);

        // 绘制文字（右对齐，垂直排列）
        ctx.font = config.fontSize;
        ctx.fillStyle = config.textColor;
        ctx.textAlign = 'center'; // 文字右对齐，实现垂直对齐效果

        // 血量标签
        ctx.fillText('血量：', config.textRightAlign, 60);
        // 血量数值（在标签正下方，距离15px）
        ctx.fillText(`${playerHp}/${playerHpMax}`, config.textRightAlign, 80);

        // 攻击力标签（在血量数值下方，距离30px）
        ctx.fillText('攻击力：', config.textRightAlign, 110);
        // 攻击力数值（在标签正下方，距离15px）
        ctx.fillText(`${playerAtk}`, config.textRightAlign, 130);

        // 绘制血条
        ctx.fillStyle = config.bgColor;
        ctx.fillRect(config.x, config.y, config.width, config.totalHeight);

        ctx.strokeStyle = config.borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(config.x, config.y, config.width, config.totalHeight);

        const currentHeight = config.totalHeight * this.currentHpPercent;
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

            if (inputManager.isFirstDown("Esc")) {
                // 对话时不允许暂停游戏
                if (!dialogManager.isActive) {
                    this.switchPause();
                }
            }

            if (game.enemies.length == 0)
                bus.emit(Events.game.battle.end);

            // 对话活跃时，即使游戏暂停也触发tick（仅让DialogManager响应）
            if ((!this.isPaused && !this.isStop) || dialogManager.isActive) {
                bus.emit(Events.game.tick, { deltaTime: deltaTime });
            }

            this.draw();
        }
        this.lastTime = currentTime - (deltaTime % this.targetFrameTime);
        requestAnimationFrame(this.loop);
    }

    pause() {
        this.isPaused = true;
        uiManager.switchScreen("pauseMenu");
    }

    resume() {
        this.isPaused = false;
        uiManager.switchScreen();
    }

    switchPause() {
        if (this.isPaused)
            this.resume();
        else
            this.pause();
    }

    stop() {
        this.isStop = true;
    }

    save() {
        const slotToSave = this.currentSlotId && this.currentSlotId > 0 ? this.currentSlotId : 1;
        this.saveCurrentGame(slotToSave); // 游戏退出时自动保存到当前槽位
    }

    saveCurrentGame(slotId = 1) {
        const saveData = {
            player: player.constructor.getSaveData(),
            layer: mapManager.currentLayer,
            room: mapManager.currentRoom,
            timestamp: new Date().toISOString()
        };
        // 读取或初始化 present_data
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

    async loadGame(slotId = 1) {
        let currentPlayer = null;
        try { currentPlayer = JSON.parse(localStorage.getItem("present_data")); } catch (_) { currentPlayer = null; }
        if (!currentPlayer?.saveSlots?.[slotId - 1]) return false;

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
}

export const game = new Game();
