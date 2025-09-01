class Game {
    constructor() {
        window.$game = this;
        // 获取画布
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');

        // 输入管理
        this.inputManager = new InputManager(this.canvas);

        // 资源管理
        this.dataManager = new DataManager();
        this.textureManager = new TextureManager();
        this.soundManager = new SoundManager();

        // 事件总线
        this.bus = new EventBus();

        this.mapManager = new MapManager();
        // this.viewData = new ViewData();

        this.saveManager = new SaveManager();
        // this.dialogManager = new DialogManager();

        // this.eventManager = new EventManager();
        // this.achievementManager = new AchievementManager();

        this.player = new Player(new Vector(100, 100));

        this.stop = false;
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
        await this.textureManager.load();
        await this.soundManager.load();
        await this.mapManager.loadRoom(1, 1);

        // 初始化玩家
        const spawn = this.mapManager.getPlayerSpawn();
        this.player.setPosition(new Vector(spawn.x, spawn.y));

        this.bus.on('tick_draw', () => {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            // 绘制地图
            this.mapManager.draw(ctx);
            this.player.draw();
            window.enemies.forEach(enemy => enemy.draw());
        });

        // 初始化敌人
        const enemySpawns = this.mapManager.getEnemySpawns();
        window.enemies = [];
        if (Array.isArray(enemySpawns)) {
            for (const e of enemySpawns) {
                window.enemies.push(new Enemy(e.type, new Vector(e.x, e.y)));
            }
        }
    }

    start(prev = 0) {
        this.loop(0);
    }

    loop(currentTime) {
        const deltaTime = currentTime - this.lastTime;

        if (deltaTime >= this.targetFrameTime) {
            this.bus.emit('tick', { deltaTime: deltaTime });
            this.bus.emit('tick_draw');
            this.lastTime = currentTime - (deltaTime % this.targetFrameTime);
        }
        requestAnimationFrame(this.loop);
    }

}
