// 补充状态菜单管理器导入
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
import { dialogManager } from "./Manager/DialogManager";
import { statusMenuManager } from "./Manager/StatusMenuManager"; // 关键：补充导入

class Game {
    static instance;

    constructor() {
        if (Game.instance) return Game.instance;
        Game.instance = this;

        // 画布初始化（容错）
        this.canvas = document.getElementById('canvas') || document.createElement('canvas');
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
        this.canvas.addEventListener('dragstart', e => e.preventDefault());
        this.ctx = this.canvas.getContext('2d') || {};

        // 游戏状态
        this.isStop = false;
        this.isPaused = false;
        this.lastTime = 0;
        const maxGameFrameRate = 60;
        this.targetFrameTime = 1000 / maxGameFrameRate;
        this.loop = this.loop.bind(this);

        // 暴露鼠标管理器（供菜单调用）
        this.mouseManager = inputManager.mouse;

        // 开场对话（支持空数据容错）
        this.openingDialogs = [
            { text: '【向导】欢迎来到深渊回归！', url: 'guide_1' },
            { text: '【向导】按Ctrl/空格/左键可快进对话，按住Ctrl能加速。', url: 'guide_2' },
            { text: '【向导】前方有大量敌人，你需要熟练使用攻击和闪避！', url: 'guide_3' },
            { text: '【向导】准备好了吗？冒险即将开始！', url: 'guide_4' },
        ].filter(dialog => dialog.text); // 过滤空对话

        // 统计数据
        this.statistics = {
            portal: 0,
            bullet: 0,
            restart: 0,
            jump: 0,
            jumpTime: 0,
        };

        // 初始化状态菜单（确保实例已创建）
        this.statusMenuManager = statusMenuManager;
    }

    // 游戏初始化（添加错误捕获，避免阻塞）
    async init() {
        try {
            // 资源加载（顺序：纹理→音频→地图，避免依赖缺失）
            await textureManager.load();
            console.log("纹理资源加载完成");
            
            await soundManager.load();
            console.log("音频资源加载完成");
            
            await mapManager.loadRoom(0, 1);
            console.log("地图资源加载完成");

            // 初始化玩家（容错：若无出生点，默认位置）
            const spawn = mapManager.getPlayerSpawn() || { x: 50, y: 50 };
            player.setPosition(new Vector(spawn.x, spawn.y));

            // 绑定游戏事件（优先级合理，避免冲突）
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
                handler: ({ deltaTime }) => {
                    // 容错：敌人数组不存在时初始化
                    if (this.enemies && Array.isArray(this.enemies)) {
                        this.enemies.forEach(enemy => enemy.update(deltaTime));
                    }
                },
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
                    // 容错：无ctx时不执行绘制
                    if (!this.ctx.clearRect) return;
                    
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    mapManager.draw(this.ctx);
                    projectilesManager.draw(this.ctx);
                    if (this.enemies && Array.isArray(this.enemies)) {
                        this.enemies.forEach(enemy => enemy.draw(this.ctx));
                    }
                    player.draw(this.ctx);
                    this.mouseManager.draw(this.ctx);
                },
                priority: -1
            });

            // 玩家死亡事件
            bus.on({
                event: EventTypes.player.die,
                handler: () => this.stop(),
                priority: 1 // 高优先级，确保优先执行
            });

            // 初始化敌人（容错：无敌人出生点时为空数组）
            const enemySpawns = mapManager.getEnemySpawns() || [];
            this.enemies = [];
            if (Array.isArray(enemySpawns)) {
                for (const e of enemySpawns) {
                    this.enemies.push(new Enemy(e.type || 1, new Vector(e.x, e.y)));
                }
            }

            console.log("游戏初始化完成");
        } catch (err) {
            console.error("游戏初始化失败：", err);
            // 初始化失败时仍启动对话，避免完全卡死
            dialogManager.startDialog([{ text: '【系统】资源加载失败，仍可继续游戏', url: '' }]);
        }
    }

    // 启动流程（先对话→后游戏循环）
    async start() {
        await this.init();
        
        // 启动开场对话，对话结束后启动循环
        dialogManager.startDialog(this.openingDialogs, () => {
            console.log("对话结束，启动游戏循环");
            this.lastTime = performance.now();
            requestAnimationFrame(this.loop);
            
            // 测试数据：对话结束后添加（确保菜单已初始化）
            setTimeout(() => {
                this.statusMenuManager.addSouls(350); // 灵魂值变为1560+350=1910
                this.statusMenuManager.addItem(1, 1); // 治疗药剂变为3+1=4
                console.log("测试数据添加完成：+350灵魂值，+1治疗药剂");
            }, 2000); // 延迟2秒，避免与游戏启动冲突
        });
    }

    // 游戏主循环（稳定帧率控制）
    loop(currentTime) {
        if (this.isStop) return;

        const deltaTime = currentTime - this.lastTime;
        if (deltaTime >= this.targetFrameTime) {
            // 先更新输入，再执行逻辑
            inputManager.update();
            if (!this.isPaused) {
                bus.emit(EventTypes.game.tick, { deltaTime: deltaTime / 1000 }); // 转秒单位
            }
            this.lastTime = currentTime - (deltaTime % this.targetFrameTime);
        }

        requestAnimationFrame(this.loop);
    }

    // 暂停/继续/停止（状态安全控制）
    pause() {
        if (!this.isStop) this.isPaused = true;
    }

    continue() {
        if (!this.isStop) this.isPaused = false;
    }

    stop() {
        this.isStop = true;
        this.isPaused = true;
        console.log("游戏停止：玩家死亡");
        // 可扩展：显示死亡面板
    }
}

export const game = new Game();