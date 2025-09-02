class Enemy_Animation {
    static Framerate = {
        "run": 6,
        "jump": 30,
        "fall": 30,
        "stand": 8,
    };
    static Frames = {
        "run": 6,
        "jump": 4,
        "fall": 2,
        "stand": 7,
    };
    constructor() {
        this.status = "run";
        this.facing = 1;
        this.frame = 1;
        this.frameRun = 0;
    }
    setStatus(status, facing) {
        if (status != this.status || facing != this.facing) {
            this.frame = 1;
            this.frameRun = 0;
            this.status = status;
            this.facing = facing;
        }
    }
    update(deltaTime) {
        // this.frameRun += deltaTime;
        // if (this.frameRun > Animation.Framerate[this.status]) {
        //     ++this.frame;
        //     this.frameRun = 0;
        // }
        // if (this.frame > Animation.Frames[this.status])
        //     switch (this.status) {
        //         case "run":
        //             this.frame = 1;
        //             break;
        //         case "stand":
        //             this.frame = 1;
        //             break;
        //         default:
        //             --this.frame;
        //             break;
        //     }
    }
    getFrame() {
        // return window.$game.textureManager.getTexture(this.status, this.frame * this.facing);
        return window.$game.textureManager.getTexture("enemy", 0);
    }
}
class Enemy extends Entity {
    constructor(type, position, size = new Vector(50, 50), velocity = new Vector()) {
        super(position, size, velocity);
        this.Size = size;
        this.type = "enemy" + type;
        this.hp = 3;
        this.facing = 1;
        this.animation = new Enemy_Animation();
        // 攻击
        this.initAttack()
        // 受击
        this.hurtBox = this.hitbox;
        this.isInvulnerable = false;
        this.invulnerableTime = 30;
        this.invulnerableTimer = 0;
        this._unbind_list = [];
    }

    async update(deltaTime) {
        // 计算与玩家的距离
        const horizontalDist = Math.abs(this.hitbox.getCenter().x - window.$game.player.hitbox.getCenter().x);
        const verticalDist = this.hitbox.getCenter().y - window.$game.player.hitbox.getCenter().y;

        // 分层锁敌逻辑
        let shouldAttack = false;
        let lockOnMode = "patrol";

        if (verticalDist > 50) {
            // 玩家在敌人上方（高度差 > 50像素）- 增加阈值
            const maxHorizontalDist = 400; // 增加水平锁敌距离，与同层模式保持合理比例
            const maxVerticalDist = 100;   // 允许更大的垂直距离

            if (horizontalDist < maxHorizontalDist && Math.abs(verticalDist) < maxVerticalDist) {
                lockOnMode = "seek_path";
                // 寻找路径模式：检查是否有直接路径到达玩家
                if (this.hasDirectPathToPlayer()) {
                    // 只在冷却完成后，有一定概率触发攻击
                    shouldAttack = this.attack.cooldown.ready() && Math.random() < 0.2;
                }
            }
        } else if (verticalDist < -50) {
            // 玩家在敌人下方（高度差 < -50像素）- 增加阈值
            const maxHorizontalDist = 300; // 增加水平锁敌距离，与同层模式保持合理比例
            const maxVerticalDist = 80;   // 减少垂直锁敌距离

            if (horizontalDist < maxHorizontalDist && Math.abs(verticalDist) < maxVerticalDist) {
                lockOnMode = "wait";
                // 等待模式：检查是否有安全的下跳路径
                if (this.hasSafeDropPath()) {
                    shouldAttack = this.attack.cooldown.ready() && Math.random() < 0.3;
                }
            }
        } else {
            // 同层或接近（高度差在 ±50像素内）- 增加阈值
            const maxHorizontalDist = 400; // 大幅增加水平锁敌距离，让敌人能更早发现同层的玩家
            const maxVerticalDist = 60;   // 标准垂直锁敌距离

            if (horizontalDist < maxHorizontalDist && Math.abs(verticalDist) < maxVerticalDist) {
                lockOnMode = "attack";
                // 攻击模式下，每次冷却完成有 40% 概率触发攻击
                shouldAttack = this.attack.cooldown.ready() && Math.random() < 0.4;
            }
        }

        this.attack.update(deltaTime, shouldAttack);
        // 受击无敌计时
        if (this.isInvulnerable) {
            if (this.attackBox && this.attackBox.checkHit(window.$game.player.hurtBox)) {
                player.takeDamage(this.attackDamage);
            }
            this.invulnerableTimer -= deltaTime;
            if (this.invulnerableTimer <= 0) {
                this.isInvulnerable = false;
                this.invulnerableTimer = 0;
            }
        }

        // 根据锁敌模式更新移动策略
        this.updateMovementByMode(lockOnMode, horizontalDist, verticalDist);

        // 移动与跳跃
        const deltaFrame = 60 * deltaTime / 1000;
        let move = 0;
        this.updateXY(deltaFrame,
            () => {
                if (this.blockMove) return 0;
                move = 0;

                // 根据锁敌模式决定移动行为
                if (lockOnMode === "attack" || lockOnMode === "seek_path") {
                    // 攻击模式或寻找路径模式：朝向玩家移动
                    if (this.hitbox.position.x < window.$game.player.hitbox.position.x) this.facing = move = 1;
                    else this.facing = move = -1;
                    move *= 0.3;
                } else if (lockOnMode === "wait") {
                    // 等待模式：原地等待，不移动
                    move = 0;
                } else {
                    // 巡逻模式：随机移动或原地等待
                    if (Math.random() < 0.002) { // 增加到2%的概率改变方向
                        this.facing = Math.random() < 0.5 ? 1 : -1;
                    }

                    // 检查是否会撞墙，如果会撞墙则改变方向
                    const nextX = this.hitbox.position.x + this.facing * 2; // 检查前方2像素
                    const testHitbox = new Hitbox(new Vector(nextX, this.hitbox.position.y), this.hitbox.size);
                    const blocks = window.$game.mapManager.getBlockHitboxes();
                    let willHitWall = false;

                    for (const block of blocks) {
                        if (testHitbox.checkHit(block)) {
                            willHitWall = true;
                            break;
                        }
                    }

                    // 如果会撞墙或到达地图边界，改变方向
                    if (willHitWall || nextX < 0 || nextX > 1280) {
                        this.facing = -this.facing;
                    }

                    // 巡逻时正常移动速度
                    move = this.facing * 0.2;
                }

                return move;
            },
            () => {
                if (this.blockMove) return 0;

                // 根据锁敌模式决定跳跃行为
                if (lockOnMode === "attack" || lockOnMode === "seek_path") {
                    // 攻击模式或寻找路径模式：可以跳跃
                    // return window.$game.inputManager.firstDown("Space", () => {
                    // this.jumping.jumpBuffer.start();
                    // });
                } else {
                    // 其他模式：不跳跃
                    return 0;
                }
            },
            true
        );

        if (this.jumping.jumpVelocity > 0) {
            this.animation.setStatus("jump", this.facing);
        } else if (!this.isOnGround()) {
            window.$game.statistics.jumpTime += deltaTime;
            if (this.jumping.jumpVelocity < 0)
                this.animation.setStatus("fall", this.facing);
        } else {
            if (move) {
                this.animation.setStatus("run", this.facing);
            }
            else
                this.animation.setStatus("stand", this.facing);
        }
        this.animation.update(deltaFrame);
    }

    // 检查是否有直接路径到达玩家
    hasDirectPathToPlayer() {
        const playerPos = window.$game.player.hitbox.position;
        const enemyPos = this.hitbox.position;

        // 简单的路径检测：检查敌人和玩家之间是否有障碍物
        const blocks = window.$game.mapManager.getBlockHitboxes();

        // 创建从敌人到玩家的检测线
        const testHitbox = new Hitbox(
            new Vector(Math.min(enemyPos.x, playerPos.x), Math.min(enemyPos.y, playerPos.y)),
            new Vector(Math.abs(playerPos.x - enemyPos.x), Math.abs(playerPos.y - enemyPos.y))
        );

        // 检查是否有障碍物阻挡
        for (const block of blocks) {
            if (testHitbox.checkHit(block)) {
                return false; // 有障碍物阻挡
            }
        }

        return true; // 无障碍物，可以直接到达
    }

    // 检查是否有安全的下跳路径
    hasSafeDropPath() {
        const playerPos = window.$game.player.hitbox.position;
        const enemyPos = this.hitbox.position;

        // 检查敌人下方是否有安全的着陆点
        const blocks = window.$game.mapManager.getBlockHitboxes();
        const dropTestY = enemyPos.y + 100; // 测试下跳100像素

        // 创建下跳检测区域
        const dropTestHitbox = new Hitbox(
            new Vector(enemyPos.x, enemyPos.y),
            new Vector(this.hitbox.size.x, dropTestY - enemyPos.y)
        );

        // 检查下跳路径上是否有平台
        for (const block of blocks) {
            if (dropTestHitbox.checkHit(block)) {
                return true; // 有平台可以着陆
            }
        }

        return false; // 没有安全的着陆点
    }

    // 根据锁敌模式更新移动策略
    updateMovementByMode(lockOnMode, horizontalDist, verticalDist) {
        switch (lockOnMode) {
            case "seek_path":
                // 寻找路径模式：优先寻找垂直路径
                this.seekVerticalPath();
                break;
            case "wait":
                // 等待模式：原地等待或寻找下跳点
                this.waitForPlayer();
                break;
            case "attack":
                // 攻击模式：正常移动和攻击
                this.normalMovement();
                break;
            case "patrol":
            default:
                // 巡逻模式：随机移动或原地等待
                this.patrolMovement();
                break;
        }
    }

    // 寻找垂直路径
    seekVerticalPath() {
        const playerPos = window.$game.player.hitbox.position;
        const enemyPos = this.hitbox.position;

        // 检查周围是否有可攀爬的平台
        const blocks = window.$game.mapManager.getBlockHitboxes();
        let nearestPlatform = null;
        let minDistance = Infinity;

        for (const block of blocks) {
            // 只考虑敌人上方的平台
            if (block.position.y < enemyPos.y && block.position.y > playerPos.y - 50) {
                const dist = Math.abs(block.position.x - enemyPos.x);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestPlatform = block;
                }
            }
        }

        if (nearestPlatform) {
            // 移动到最近的平台
            this.moveToTarget(nearestPlatform);
        } else {
            // 没有平台时，原地等待
            this.wait();
        }
    }

    // 等待玩家
    waitForPlayer() {
        // 检查是否有安全的下跳路径
        if (this.hasSafeDropPath()) {
            // 寻找下跳点
            this.seekDropPoint();
        } else {
            // 原地等待，可能进行巡逻
            this.patrolMovement();
        }
    }

    // 正常移动
    normalMovement() {
        // 保持原有的移动逻辑
        // 这个方法会在updateXY中处理
    }

    // 巡逻移动
    patrolMovement() {
        // 巡逻逻辑：随机移动或原地等待
        if (Math.random() < 0.02) { // 2%的概率改变方向
            this.facing = Math.random() < 0.5 ? 1 : -1;
        }

        // 检查是否会撞墙，如果会撞墙则改变方向
        const nextX = this.hitbox.position.x + this.facing * 2;
        const testHitbox = new Hitbox(new Vector(nextX, this.hitbox.position.y), this.hitbox.size);
        const blocks = window.$game.mapManager.getBlockHitboxes();
        let willHitWall = false;

        for (const block of blocks) {
            if (testHitbox.checkHit(block)) {
                willHitWall = true;
                break;
            }
        }

        // 如果会撞墙或到达地图边界，改变方向
        if (willHitWall || nextX < 0 || nextX > 1280) {
            this.facing = -this.facing;
        }
    }

    // 移动到目标
    moveToTarget(target) {
        const targetPos = target.position;
        const enemyPos = this.hitbox.position;

        // 设置移动方向
        if (targetPos.x > enemyPos.x) {
            this.facing = 1;
        } else if (targetPos.x < enemyPos.x) {
            this.facing = -1;
        }

        // 如果目标在敌人上方，尝试跳跃
        if (targetPos.y < enemyPos.y && this.isOnGround()) {
            this.jumping.jumpBuffer.start();
        }
    }

    // 寻找下跳点
    seekDropPoint() {
        const playerPos = window.$game.player.hitbox.position;
        const enemyPos = this.hitbox.position;

        // 检查敌人下方是否有安全的着陆点
        const blocks = window.$game.mapManager.getBlockHitboxes();
        let bestDropPoint = null;
        let minDistance = Infinity;

        for (const block of blocks) {
            // 只考虑敌人下方的平台
            if (block.position.y > enemyPos.y && block.position.y < playerPos.y + 50) {
                const dist = Math.abs(block.position.x - enemyPos.x);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestDropPoint = block;
                }
            }
        }

        if (bestDropPoint) {
            // 移动到下跳点
            this.moveToTarget(bestDropPoint);
        }
    }

    // 等待
    wait() {
        // 原地等待，不进行移动
        // 可以在这里添加等待动画或其他行为
    }

    // 受击判定
    takeDamage(dmg) {
        if (this.isInvulnerable) return;
        this.hp -= dmg;
        this.isInvulnerable = true;
        this.invulnerableTimer = this.invulnerableTime;
        if (this.hp <= 0) {
            // 死亡逻辑
            // 解绑所有事件
            this._unbind_list.forEach((unbind) => unbind());
            this._unbind_list = [];
            // 从全局移除自己
            const idx = window.enemies.indexOf(this);
            if (idx !== -1) window.enemies.splice(idx, 1);
        }
    }

    // 攻击初始化
    initAttack() {
        this.attack = {
            state: "idle", // idle, startup, active, recovery
            timer: 0,
            attackBox: null,

            damage: 1,
            startupTime: 150,   // 前摇(ms)
            activeTime: 1,     // 出招帧(ms)
            recoveryTime: 200,  // 后摇(ms)
            cooldownTime: 1500,  // 总冷却(ms)，包含以上所有阶段

            cooldown: null,

            update: (deltaTime, shouldAttack) => {
                // 冷却 tick
                this.attack.cooldown.tick(deltaTime);

                switch (this.attack.state) {
                    case "idle":
                        if (this.attack.cooldown.ready() && shouldAttack) {
                            // 进入前摇
                            this.attack.state = "startup";
                            this.attack.timer = this.attack.startupTime;
                            this.attack.cooldown.start(); // 冷却从前摇开始计
                        }
                        break;

                    case "startup":
                        this.attack.timer -= deltaTime;
                        if (this.attack.timer <= 0) {
                            // 播放音效
                            window.$game.soundManager.playSound("enemy", "attack");
                            // 进入出招
                            this.attack.state = "active";
                            this.attack.timer = this.attack.activeTime;

                            const offset = 0.5 * (this.facing >= 0 ? this.hitbox.size.x : -this.hitbox.size.x);
                            this.attack.attackBox = new Hitbox(
                                this.hitbox.position.addVector(new Vector(offset, this.hitbox.size.y * 0.25)),
                                new Vector(this.hitbox.size.x * 0.8, this.hitbox.size.y * 0.5)
                            );
                        }
                        break;

                    case "active":
                        this.attack.timer -= deltaTime;
                        if (this.attack.attackBox) {
                            // 命中检测
                            if (this.attack.attackBox.checkHit(window.$game.player.hitbox)) {
                                window.$game.player.takeDamage(this.attack.damage);
                            }
                        }
                        if (this.attack.timer <= 0) {
                            // 出招结束 → 清空判定盒
                            this.attack.attackBox = null;
                            this.attack.state = "recovery";
                            this.attack.timer = this.attack.recoveryTime;
                        }
                        break;

                    case "recovery":
                        this.attack.timer -= deltaTime;
                        if (this.attack.timer <= 0) {
                            this.attack.state = "idle";
                        }
                        break;
                }
            }
        };

        this.attack.cooldown = new Cooldown(this.attack.cooldownTime);
    }

    draw() {
        const ctx = window.$game.ctx;
        ctx.drawImage(
            this.animation.getFrame(),
            this.hitbox.position.x,
            this.hitbox.position.y,
            this.Size.x,
            this.Size.y);
        // 绘制血条
        const hpBarWidth = this.Size.x;
        const hpBarHeight = 6;
        const hpBarX = this.hitbox.position.x;
        const hpBarY = this.hitbox.position.y - 12;
        ctx.save();
        ctx.fillStyle = 'red';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);
        ctx.fillStyle = 'green';
        const currentHpPercent = Math.max(this.hp, 0) / 3;
        const currentHpWidth = hpBarWidth * currentHpPercent;
        ctx.fillRect(hpBarX, hpBarY, currentHpWidth, hpBarHeight);
        ctx.strokeStyle = 'black';
        ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);
        ctx.restore();
        // this.drawBoxs(ctx);
    }

    drawBoxs(ctx) {
        // 绘制敌人自身盒子
        ctx.strokeStyle = this.isInvulnerable ? '#cccccc' : '#00aaff';
        ctx.strokeRect(this.hitbox.position.x, this.hitbox.position.y, this.hitbox.size.x, this.hitbox.size.y);

        // ---- 调试用攻击判定框 ----
        ctx.strokeStyle = '#ff0000';

        // 根据敌人当前状态和朝向计算判定框位置
        const offset = 0.5 * (this.facing >= 0 ? this.hitbox.size.x : -this.hitbox.size.x);
        const attackBoxPos = this.hitbox.position.addVector(new Vector(offset, this.hitbox.size.y * 0.25));
        const attackBoxSize = new Vector(this.hitbox.size.x * 0.8, this.hitbox.size.y * 0.5);

        ctx.strokeRect(attackBoxPos.x, attackBoxPos.y, attackBoxSize.x, attackBoxSize.y);

        ctx.restore();
    }
}