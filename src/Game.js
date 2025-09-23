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
            console.log('🎮 游戏初始化完成，当前房间: layer0/room3');

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
            handler: ({ deltaTime }) => {
                if (!dialogManager.isActive) { // 对话活跃时跳过
                    mapManager.update(deltaTime, player);
                }
            },
            priority: 0.8
        });

        // 2. 物品管理器更新：对话时暂停（如物品冷却、持续效果）
        bus.on({
            event: Events.game.tick,
            handler: ({ deltaTime }) => {
                if (!dialogManager.isActive) { // 对话活跃时跳过
                    itemManager.update(deltaTime);
                }
            },
            priority: 1
        });

        // 3. 属性管理器更新：对话时暂停（如属性衰减、buff计时）
        bus.on({
            event: Events.game.tick,
            handler: ({ deltaTime }) => {
                if (!dialogManager.isActive) { // 对话活跃时跳过
                    attributeManager.update(deltaTime);
                }
            },
            priority: 0.7
        });

        // 4. 玩家更新：对话时暂停（移动、攻击等）
        bus.on({
            event: Events.game.tick,
            handler: ({ deltaTime }) => {
                if (!dialogManager.isActive) { // 对话活跃时跳过
                    player.update(deltaTime);
                }
            },
            priority: 0.5
        });

        // 5. 敌人更新：对话时暂停（AI、移动、攻击）
        bus.on({
            event: Events.game.tick,
            handler: ({ deltaTime }) => {
                if (!dialogManager.isActive) { // 对话活跃时跳过
                    this.enemies.forEach(enemy => enemy.update(deltaTime));
                }
            },
            priority: 0.3
        });

        // 6. 子弹管理器更新：对话时暂停（子弹飞行、碰撞检测）
        bus.on({
            event: Events.game.tick,
            handler: ({ deltaTime }) => {
                if (!dialogManager.isActive) { // 对话活跃时跳过
                    projectilesManager.update(deltaTime);
                }
            },
            priority: 0.1
        });

        bus.on({
            event: Events.player.die,
            handler: () => {
                this.stop();
                window.location.href = "menu.html";
            }
        });

        // 监听交互点触发事件
        bus.on({
            event: Events.interaction.trigger,
            handler: (payload) => this.handleInteraction(payload),
            priority: 0
        });


        // 初始化敌人
        const enemySpawns = mapManager.getEnemySpawns();
        this.enemies = [];
        if (Array.isArray(enemySpawns)) {
            for (const e of enemySpawns) {
                this.enemies.push(new Enemy(e.type, new Vector(e.x, e.y)));
            }
        }

        console.log('👹 敌人初始化完成:', {
            enemySpawnsCount: enemySpawns ? enemySpawns.length : 0,
            enemiesCount: this.enemies.length,
            enemyTypes: this.enemies.map(e => e.type)
        });
        //TODO:测试用

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
            version: 1, // 存档版本号
            player: player.constructor.getSaveData(),
            enemies: this.enemies.map(enemy => ({
                type: enemy.type,
                position: enemy.hitbox.position,
                state: enemy.state,
                defeated: enemy.state.hp <= 0
            })),
            layer: mapManager.currentLayer,
            room: mapManager.currentRoom,
            mapState: mapManager.getMapState(), // 保存地图交互状态
            completedEvents: bus.getCompletedEvents(), // 保存已完成事件
            timestamp: new Date().toISOString()
        };

        // 验证存档数据
        if (!this.validateSaveData(saveData)) {
            console.error('存档数据验证失败');
            return null;
        }

        try {
            JSON.stringify(saveData); // 测试数据是否可序列化
        } catch (e) {
            console.error('存档数据序列化失败:', e);
            return null;
        }

        // 读取或初始化 present_data
        let currentPlayer = null;
        try {
            currentPlayer = JSON.parse(localStorage.getItem("present_data"));
        } catch (_) {
            currentPlayer = null;
            console.error('读取存档数据失败');
        }

        if (!currentPlayer || typeof currentPlayer !== 'object') {
            currentPlayer = { saveSlots: [] };
        }
        currentPlayer.saveSlots = currentPlayer.saveSlots || [];
        currentPlayer.saveSlots[slotId - 1] = saveData;

        try {
            localStorage.setItem("present_data", JSON.stringify(currentPlayer));
            console.log('存档成功:', saveData);
            return saveData;
        } catch (e) {
            console.error('存档写入失败:', e);
            return null;
        }
    }

    /**
     * 验证存档数据的完整性和有效性
     * @param {Object} saveData 存档数据
     * @returns {boolean} 验证是否通过
     */
    validateSaveData(saveData) {
        // 检查必需字段
        if (!saveData || typeof saveData !== 'object') {
            console.warn('存档数据不是有效对象');
            return false;
        }

        // 检查版本号
        if (typeof saveData.version !== 'number' || saveData.version < 1) {
            console.warn('存档版本号无效:', saveData.version);
            return false;
        }

        // 检查玩家数据
        if (!saveData.player || typeof saveData.player !== 'object') {
            console.warn('存档缺少玩家数据');
            return false;
        }

        // 检查地图数据
        if (typeof saveData.layer !== 'number' || typeof saveData.room !== 'number') {
            console.warn('存档地图数据无效');
            return false;
        }

        // 检查敌人数据
        if (!Array.isArray(saveData.enemies)) {
            console.warn('存档敌人数据不是数组');
            return false;
        }

        return true;
    }

    /**
     * 修复损坏的存档数据
     * @param {Object} saveData 原始存档数据
     * @returns {Object} 修复后的存档数据
     */
    repairSaveData(saveData) {
        console.log('尝试修复存档数据...');

        // 确保版本号存在
        if (typeof saveData.version !== 'number') {
            saveData.version = 1;
        }

        // 修复玩家数据
        if (!saveData.player || typeof saveData.player !== 'object') {
            console.log('修复玩家数据');
            saveData.player = {
                position: { x: 100, y: 100 },
                state: {
                    hp: 100,
                    hp_max: 100,
                    attack: { atk: 10 }
                },
                timestamp: new Date().toISOString()
            };
        }

        // 修复地图数据
        if (typeof saveData.layer !== 'number') {
            saveData.layer = 0;
        }
        if (typeof saveData.room !== 'number') {
            saveData.room = 3;
        }

        // 修复敌人数据
        if (!Array.isArray(saveData.enemies)) {
            saveData.enemies = [];
        }

        // 修复地图状态
        if (!saveData.mapState || typeof saveData.mapState !== 'object') {
            saveData.mapState = {
                triggeredInteractions: [],
                completedEvents: [],
                currentLayer: saveData.layer,
                currentRoom: saveData.room
            };
        }

        // 修复已完成事件
        if (!Array.isArray(saveData.completedEvents)) {
            saveData.completedEvents = [];
        }

        console.log('存档数据修复完成');
        return saveData;
    }

    async loadGame(slotId = 1) {
        console.log('开始加载存档，槽位:', slotId);
        let currentPlayer = null;
        try {
            const rawData = localStorage.getItem("present_data");
            console.log('原始存档数据:', rawData);
            currentPlayer = JSON.parse(rawData);
        } catch (e) {
            console.error('解析存档数据失败:', e);
            currentPlayer = null;
        }

        if (!currentPlayer?.saveSlots?.[slotId - 1]) {
            console.log('存档槽位不存在:', slotId);
            return false;
        }

        let saveData = currentPlayer.saveSlots[slotId - 1];
        console.log('存档数据内容:', saveData);

        // 检查存档版本并验证数据
        if (!this.validateSaveData(saveData)) {
            console.warn('存档数据验证失败，尝试修复...');
            saveData = this.repairSaveData(saveData);

            if (!this.validateSaveData(saveData)) {
                console.error('存档数据无法修复，加载失败');
                return false;
            }

            // 保存修复后的数据
            currentPlayer.saveSlots[slotId - 1] = saveData;
            try {
                localStorage.setItem("present_data", JSON.stringify(currentPlayer));
                console.log('修复后的存档数据已保存');
            } catch (e) {
                console.warn('保存修复后的存档数据失败:', e);
            }
        }

        // 处理不同版本的存档
        switch (saveData.version) {
            case 1:
                // 当前版本，直接处理
                break;
            default:
                console.warn(`未知的存档版本: ${saveData.version}，尝试按版本1处理`);
                break;
        }

        // 先加载地图，再恢复玩家位置/状态
        console.log(`加载地图: layer${saveData.layer}/room${saveData.room}`);
        await mapManager.loadRoom(saveData.layer, saveData.room);

        try {
            // 恢复玩家状态
            if (saveData.player?.position) {
                const pos = saveData.player.position;
                console.log('恢复玩家位置:', pos);
                player.setPosition(new Vector(pos.x, pos.y));
            }
            if (saveData.player?.state) {
                console.log('恢复玩家状态:', saveData.player.state);
                player.state = saveData.player.state;
            }

            // 恢复敌人状态
            if (Array.isArray(saveData.enemies)) {
                console.log('恢复敌人状态，数量:', saveData.enemies.length);
                this.enemies = saveData.enemies.map(enemyData => {
                    const enemy = new Enemy(enemyData.type, new Vector(enemyData.position.x, enemyData.position.y));

                    // 深度合并状态
                    if (enemyData.state) {
                        enemy.state = {
                            ...enemy.state, // 保留默认状态
                            ...enemyData.state, // 应用存档状态
                            attack: {
                                ...enemy.state.attack,
                                ...(enemyData.state.attack || {})
                            }
                        };

                        // 确保血量不超过最大值
                        enemy.state.hp = Math.min(enemy.state.hp, enemy.state.hp_max);
                    }

                    // 恢复敌人击败状态
                    if (enemyData.defeated) {
                        console.log(`敌人 ${enemyData.type} 已被击败`);
                        enemy.state.hp = 0;
                        enemy.state.isDefeated = true;
                    }

                    return enemy;
                });
            }

            // 恢复地图状态
            if (saveData.mapState) {
                console.log('恢复地图状态:', saveData.mapState);
                mapManager.restoreMapState(saveData.mapState);
            }

            // 恢复已完成事件
            if (Array.isArray(saveData.completedEvents)) {
                console.log('恢复已完成事件:', saveData.completedEvents);
                bus.restoreCompletedEvents(saveData.completedEvents);
            }
        } catch (e) {
            console.error('加载存档时出错:', e);
            // 容错：若旧版本数据结构不一致，则只使用地图加载结果
        }

        console.log('存档加载完成');
        return true;
    }

    /**
     * 处理交互点触发事件
     * @param {Object} payload - 交互事件数据
     * @param {string} payload.type - 交互点类型
     * @param {string} payload.event - 事件名称
     * @param {Object} payload.data - 交互点数据
     */
    async handleInteraction(payload) {
        const { type, event, data } = payload;
        console.log('🎮 交互点触发:', { type, event, data });

        try {
            switch (type) {
                case 'next_room':
                case 'exit':
                    await this.handleRoomTransition(event, data);
                    break;
                case 'plot':
                case 'teach':
                case 'fire':
                case 'sword':
                    this.handlePlotEvent(event, data);
                    break;
                case 'npc':
                case 'angel':
                    this.handleNPCEvent(event, data);
                    break;
                case 'chest':
                    this.handleChestEvent(event, data);
                    break;
                case 'hidden':
                    this.handleHiddenRoomEvent(event, data);
                    break;
                default:
                    console.log('未处理的交互类型:', type, event);
            }
        } catch (error) {
            console.error('处理交互事件时出错:', error);
        }
    }

    /**
     * 处理房间切换
     * @param {string} event - 事件名称
     * @param {Object} data - 交互点数据
     */
    async handleRoomTransition(event, data) {
        console.log('🚪 房间切换触发:', event, data);

        // 检查使用条件
        const hasEnemies = this.enemies.length > 0;
        const requiresBattleEnd = data.can_be_used_when === 'battle_end' || hasEnemies;

        console.log('🔍 初始检查:', {
            hasEnemies: hasEnemies,
            enemiesCount: this.enemies.length,
            requiresBattleEnd: requiresBattleEnd,
            explicitCondition: data.can_be_used_when === 'battle_end'
        });

        if (requiresBattleEnd) {
            // 检查是否还有敌人存活
            const aliveEnemies = this.enemies.filter(enemy => enemy.state && enemy.state.hp > 0);
            console.log('🔍 检查敌人状态:', {
                totalEnemies: this.enemies.length,
                aliveEnemies: aliveEnemies.length,
                enemyHPs: this.enemies.map(e => e.state ? e.state.hp : 'no state'),
                requiresBattleEnd: requiresBattleEnd,
                hasEnemies: hasEnemies,
                explicitCondition: data.can_be_used_when === 'battle_end'
            });

            if (aliveEnemies.length > 0) {
                console.log('⚠️ 还有敌人存活，无法切换房间');
                // TODO: 这里可以显示UI提示给玩家
                return;
            }
        }

        // 根据当前房间决定下一个房间
        const currentLayer = mapManager.currentLayer;
        const currentRoom = mapManager.currentRoom;

        let nextLayer = currentLayer;
        let nextRoom = currentRoom + 1;

        // 房间切换逻辑
        if (currentLayer === 0) {
            if (currentRoom >= 4) {
                // layer0 的最后一个房间，切换到 layer1
                nextLayer = 1;
                nextRoom = 1;
            }
        } else if (currentLayer === 1) {
            if (currentRoom >= 1) {
                // layer1 的最后一个房间，可以回到 layer0 或结束游戏
                nextLayer = 0;
                nextRoom = 1;
            }
        }

        console.log(`🔄 从 layer${currentLayer}/room${currentRoom} 切换到 layer${nextLayer}/room${nextRoom}`);

        // 执行房间切换
        await this.switchRoom(nextLayer, nextRoom);
    }

    /**
     * 执行房间切换
     * @param {number} layer - 目标层
     * @param {number} room - 目标房间
     */
    async switchRoom(layer, room) {
        try {
            // 保存当前游戏状态
            this.saveCurrentGame(this.currentSlotId);

            // 加载新房间
            await mapManager.loadRoom(layer, room);

            // 设置玩家到新房间的出生点
            const spawn = mapManager.getPlayerSpawn();
            if (spawn) {
                player.setPosition(new Vector(spawn.x, spawn.y));
            }

            // 重新初始化敌人
            const enemySpawns = mapManager.getEnemySpawns();
            this.enemies = [];
            if (Array.isArray(enemySpawns)) {
                for (const e of enemySpawns) {
                    this.enemies.push(new Enemy(e.type, new Vector(e.x, e.y)));
                }
            }
            console.log('👹 新房间敌人初始化:', {
                layer: layer,
                room: room,
                enemySpawnsCount: enemySpawns ? enemySpawns.length : 0,
                enemiesCount: this.enemies.length,
                enemyTypes: this.enemies.map(e => e.type)
            });

            console.log(`✅ 成功切换到 layer${layer}/room${room}`);
        } catch (error) {
            console.error('房间切换失败:', error);
        }
    }

    /**
     * 处理剧情事件
     * @param {string} event - 事件名称
     * @param {Object} data - 交互点数据
     */
    handlePlotEvent(event, data) {
        console.log('剧情事件触发:', event, data);
        // TODO: 实现剧情对话系统
        // 这里可以显示对话框、播放剧情等
    }

    /**
     * 处理NPC事件
     * @param {string} event - 事件名称
     * @param {Object} data - 交互点数据
     */
    handleNPCEvent(event, data) {
        console.log('NPC事件触发:', event, data);
        // TODO: 实现NPC对话系统
    }

    /**
     * 处理宝箱事件
     * @param {string} event - 事件名称
     * @param {Object} data - 交互点数据
     */
    handleChestEvent(event, data) {
        console.log('宝箱事件触发:', event, data);
        // TODO: 实现宝箱系统
    }

    /**
     * 处理隐藏房间事件
     * @param {string} event - 事件名称
     * @param {Object} data - 交互点数据
     */
    handleHiddenRoomEvent(event, data) {
        console.log('隐藏房间事件触发:', event, data);
        // TODO: 实现隐藏房间功能
    }
}

export const game = new Game();
