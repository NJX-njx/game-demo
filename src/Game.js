import { inputManager } from "./System/Input/InputManager";
import { textureManager } from "./Manager/TextureManager";
import { soundManager } from "./Manager/SoundManager";
import { eventBus as bus, EventTypes as Events } from "./Manager/EventBus";
import { mapManager } from "./Manager/MapManager";
import { projectilesManager } from "./System/Attack/ProjectilesManager";
import { attributeManager } from "./Manager/AttributeManager";
import { player } from "./Entities/Player";
import { itemManager } from "./System/Item/ItemManager";
import { ItemConfigs as Items } from "./System/Item/ItemConfigs";
import { uiManager } from "./System/UI/UIManager";
import { interactionManager } from "./Manager/InteractionManager";
import { saveManager } from "./Manager/SaveManager";

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
        this.isStopUpdate = false;

        this.lastTime = 0;
        const maxGameFrameRate = 60;
        this.FrameTime = 1000 / maxGameFrameRate;
        // 帧率统计数据
        this.stats = {
            frameCount: 0,
            tickCount: 0,
            tickTimeAccum: 0,
            frameTimeAccum: 0,
            lastStatsSampleTime: performance.now()
        };
        this.loop = this.loop.bind(this);
    }

    get enemies() { return mapManager.enemies; }

    async init() {
        await textureManager.load();
        await soundManager.load();

        // 监听玩家血量变化事件，更新currentHpPercent
        bus.on({
            event: Events.player.hpPercent,
            handler: (hpPercent) => {
                this.currentHpPercent = Math.max(0, Math.min(1, hpPercent));
            },
            priority: 0
        });

        // 游戏主循环事件
        {
            // 物品管理器更新（如物品冷却、持续效果）
            bus.on({
                event: Events.game.tick,
                handler: ({ deltaTime }) => itemManager.update(deltaTime),
                priority: 1
            });

            // 属性管理器更新（如属性衰减、buff计时）
            bus.on({
                event: Events.game.tick,
                handler: ({ deltaTime }) => attributeManager.update(deltaTime),
                priority: 0.9
            });

            // 地图交互更新
            bus.on({
                event: Events.game.tick,
                handler: ({ deltaTime }) => {
                    interactionManager.update(deltaTime);
                },
                priority: 0.8
            });

            // 玩家更新（移动、攻击等）
            bus.on({
                event: Events.game.tick,
                handler: ({ deltaTime }) => player.update(deltaTime),
                priority: 0.5
            });

            // 敌人更新（AI、移动、攻击）
            bus.on({
                event: Events.game.tick,
                handler: ({ deltaTime }) => this.enemies.forEach(enemy => enemy.update(deltaTime)),
                priority: 0.3
            });

            // 子弹管理器更新（子弹飞行、碰撞检测）
            bus.on({
                event: Events.game.tick,
                handler: ({ deltaTime }) => projectilesManager.update(deltaTime),
                priority: 0.1
            });
        }

        bus.on({
            event: Events.player.die,
            handler: () => this.stop()
        });

        bus.on({
            event: Events.dialog.start,
            handler: () => {
                this.stopUpdate();
            },
            priority: 1
        });

        bus.on({
            event: Events.dialog.end,
            handler: () => {
                this.resumeUpdate();
            },
            priority: -1
        });

        // 读取选中槽位并尝试加载存档
        const selectedSlotRaw = localStorage.getItem('selected_slot');
        const selectedSlot = Math.max(1, parseInt(selectedSlotRaw || '1', 10) || 1);
        this.currentSlotId = selectedSlot;
        let loaded = false;
        try { loaded = await Game.loadGame(selectedSlot); } catch (_) { loaded = false; }
        if (!loaded) {
            await mapManager.loadRoom(0, 1);
        }

        //TODO:测试用
        mapManager.loadRoom(0, 1);
        itemManager.tryAcquire(Items.xq休憩);
        itemManager.tryAcquire(Items.yy友谊);
        itemManager.tryAcquire(Items.ls朗诵);
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
        ctx.save();
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
        ctx.restore();
    }

    start() {
        this.lastTime = performance.now();
        this.accumulator = 0;
        requestAnimationFrame(this.loop);
    }

    loop(currentTime) {
        let frameTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // accumulate frame interval for MSPF calculation
        this.stats.frameTimeAccum += frameTime;

        this.accumulator = (this.accumulator || 0) + frameTime;

        while (this.accumulator >= this.FrameTime) {
            const tickStart = performance.now();
            inputManager.update();

            if (inputManager.isFirstDown("Esc")) {
                if (!this.popUI()) {
                    this.pause();
                }
            }

            if (inputManager.isFirstDown("T")) {
                if (uiManager.currentScreen && uiManager.currentScreen.name === "talentTree") {
                    this.popUI();
                } else {
                    uiManager.switchScreen("talentTree");
                }
            }

            if (game.enemies.length == 0) bus.emit(Events.game.battle.end);

            if (!this.isStopUpdate) {
                bus.emit(Events.game.tick, { deltaTime: this.FrameTime });
                this.stats.tickCount++;
            }
            const tickEnd = performance.now();
            this.stats.tickTimeAccum += (tickEnd - tickStart);
            this.accumulator -= this.FrameTime;
        }

        this.draw();
        this.stats.frameCount++;

        // 每十秒计算一次帧率等数据
        const now = performance.now();
        const elapsed = now - this.stats.lastStatsSampleTime;
        const calcTime = 10000;
        if (elapsed >= calcTime) {
            const seconds = elapsed / 1000;
            const fps = this.stats.frameCount / seconds;
            const tps = this.stats.tickCount / seconds;
            const mspt = this.stats.tickCount > 0 ? (this.stats.tickTimeAccum / this.stats.tickCount) : 0;
            const mspf = this.stats.frameCount > 0 ? (this.stats.frameTimeAccum / this.stats.frameCount) : 0;
            console.log(`FPS: ${fps.toFixed(1)}, TPS: ${tps.toFixed(1)}, MSPT: ${mspt.toFixed(2)}ms, MSPF: ${mspf.toFixed(2)}ms`);
            // reset
            this.stats.frameCount = 0;
            this.stats.tickCount = 0;
            this.stats.tickTimeAccum = 0;
            this.stats.frameTimeAccum = 0;
            this.stats.lastStatsSampleTime = now;
        }

        requestAnimationFrame(this.loop);
    }

    stopUpdate() {
        this.isStopUpdate = true;
    }

    resumeUpdate() {
        this.isPaused = false;
        this.isStopUpdate = false;
    }

    pause() {
        if (this.isPaused) return;
        this.isPaused = true;
        this.stopUpdate();
        uiManager.switchScreen("pauseMenu");
    }

    resume() {
        if (!this.isPaused) return;
        this.isPaused = false;
        this.resumeUpdate();
    }

    switchPause() {
        if (this.isPaused)
            this.resume();
        else
            this.pause();
    }

    popUI() {
        // 优先让 UI 回退一层（若有界面打开）
        if (uiManager.isUIOpen()) {
            uiManager.goBack();
            // 回退后若没有 UI 再切换暂停
            if (!uiManager.isUIOpen())
                this.resumeUpdate();
            return true;
        }
        return false;
    }

    stop() {
        if (this.isStop) return;
        this.isStop = true;
        this.stopUpdate();
    }

    saveGame() {
        const slotToSave = this.currentSlotId && this.currentSlotId > 0 ? this.currentSlotId : 1;
        saveManager.save(slotToSave);
    }

    async loadGame(slotId = 1) {
        return await saveManager.load(slotId);
    }
}

export const game = new Game();