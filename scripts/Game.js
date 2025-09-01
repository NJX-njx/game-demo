class Game {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');

        this.inputManager = new InputManager(this.canvas);
        this.dataManager = new DataManager();
        this.mapManager = new MapManager();
        // this.viewData = new ViewData();

        this.saveManager = new SaveManager();
        // this.dialogManager = new DialogManager();
        this.textureManager = new TextureManager();
        this.soundManager = new SoundManager();
        // this.eventManager = new EventManager();
        // this.achievementManager = new AchievementManager();
        this.player = new Player(canvas.width, canvas.height);

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
        if (spawn) {
            this.player = new Player(new Vector(spawn.x, spawn.y));
        } else {
            this.player = new Player(new Vector(500, 400)); // 默认出生点
        }

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
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            // 绘制地图
            this.mapManager.draw(ctx);
            // 玩家
            if (this.player) {
                this.player.update(deltaTime);
                this.player.draw();
            }
            // 敌人
            if (window.enemies) {
                for (const enemy of window.enemies) {
                    enemy.update(deltaTime);
                    enemy.draw();
                }
            }
            drawDashCooldownBar(ctx, this.player, this.canvas);
            this.lastTime = currentTime - (deltaTime % this.targetFrameTime);
        }
        requestAnimationFrame(this.loop);
    }

}

function drawDashCooldownBar(ctx, player, canvas) {
    if (player.dashCooldown > 0) {
        const barMaxWidth = 200;
        const barHeight = 20;
        const barX = 20;
        const barY = canvas.height - 40;
        const percent = player.dashCooldown / player.dashCooldownMax;
        const barWidth = barMaxWidth * percent;
        ctx.save();
        ctx.fillStyle = '#f7f4f4ff';
        ctx.fillRect(barX, barY, barMaxWidth, barHeight);
        ctx.fillStyle = '#8e8a8aff';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barMaxWidth, barHeight);
        ctx.font = "18px Arial";
        ctx.fillStyle = "black";
        ctx.textAlign = "left";
        ctx.fillText(
            ' ',
            barX,
            barY - 5
        );
        ctx.restore();
    }
}
