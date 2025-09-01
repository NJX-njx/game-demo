class Animation {
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
        this.frameRun += deltaTime;
        if (this.frameRun > Animation.Framerate[this.status]) {
            ++this.frame;
            this.frameRun = 0;
        }
        if (this.frame > Animation.Frames[this.status])
            switch (this.status) {
                case "run":
                    this.frame = 1;
                    break;
                case "stand":
                    this.frame = 1;
                    break;
                default:
                    --this.frame;
                    break;
            }
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
        this.alive = true;
        this.facing = 1;
        this.animation = new Animation();
        // 攻击
        this.isAttacking = false;
        this.attackDuration = 1;
        this.attackTimer = 0;
        this.attackCooldown = new Cooldown(300);
        this.attackBox = null;
        this.attackDamage = 1;
        this.attackSound = new Audio('assets/audios/attack1.wav');
        // 跳跃
        this.jumpSound1 = new Audio('assets/audios/jump1.wav');
        this.jumpSound2 = new Audio('assets/audios/jump2.wav');
        this.jumpCnt = 0;
        // 受击
        this.hurtBox = this.hitbox;
        this.isInvulnerable = false;
        this.invulnerableTime = 30;
        this.invulnerableTimer = 0;
    }

    async update(deltaTime) {
        if (!this.alive) return;
        
        // 计算与玩家的距离
        const horizontalDist = Math.abs(this.hitbox.position.x - window.$game.player.hitbox.position.x);
        const verticalDist = this.hitbox.position.y - window.$game.player.hitbox.position.y;
        
        // 分层锁敌逻辑
        let shouldAttack = false;
        let lockOnMode = "patrol";
        
        // 调试信息：打印距离和锁敌模式
        if (this.type === "enemy1") { // 只对第一个敌人打印调试信息
            console.log(`Enemy ${this.type}: horizontalDist=${horizontalDist.toFixed(1)}, verticalDist=${verticalDist.toFixed(1)}`);
        }
        
        if (verticalDist > 50) {
            // 玩家在敌人上方（高度差 > 50像素）- 增加阈值
            const maxHorizontalDist = 400; // 增加水平锁敌距离，与同层模式保持合理比例
            const maxVerticalDist = 100;   // 允许更大的垂直距离
            
            if (horizontalDist < maxHorizontalDist && Math.abs(verticalDist) < maxVerticalDist) {
                lockOnMode = "seek_path";
                // 寻找路径模式：检查是否有直接路径到达玩家
                if (this.hasDirectPathToPlayer()) {
                    shouldAttack = true;
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
                    shouldAttack = true;
                }
            }
        } else {
            // 同层或接近（高度差在 ±50像素内）- 增加阈值
            const maxHorizontalDist = 400; // 大幅增加水平锁敌距离，让敌人能更早发现同层的玩家
            const maxVerticalDist = 60;   // 标准垂直锁敌距离
            
            if (horizontalDist < maxHorizontalDist && Math.abs(verticalDist) < maxVerticalDist) {
                lockOnMode = "attack";
                shouldAttack = true;
            }
        }
        
        // 调试信息：打印锁敌模式
        if (this.type === "enemy1") {
            console.log(`Enemy ${this.type}: lockOnMode=${lockOnMode}, shouldAttack=${shouldAttack}`);
        }
        
        // 攻击逻辑
        if (shouldAttack && !this.isAttacking && this.attackCooldown.ready()) {
            this.isAttacking = true;
            this.attackTimer = this.attackDuration; // 只持续一帧
            this.attackCooldown.start();
            if (this.attackSound) {
                this.attackSound.currentTime = 0;
                this.attackSound.play();
            }
            // 生成攻击判定盒（示例：面朝方向前方一格）
            const offset = 0.5 * (this.facing >= 0 ? this.hitbox.size.x : -this.hitbox.size.x);
            this.attackBox = new Hitbox(
                this.hitbox.position.addVector(new Vector(offset, 0)),
                new Vector(this.hitbox.size.x, this.hitbox.size.y)
            );
        }
        
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

        // 攻击计时
        if (this.isAttacking && this.attackTimer > 0) {
            if (this.attackBox && this.attackBox.checkHit(window.$game.player.hurtBox)) {
                window.$game.player.takeDamage(this.attackDamage);
            }
            this.attackTimer -= deltaTime;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
                this.attackBox = null;
                this.attackTimer = 0;
            }
        }
        // 冷却tick
        this.attackCooldown.tick(deltaTime);

        // 根据锁敌模式更新移动策略
        this.updateMovementByMode(lockOnMode, horizontalDist, verticalDist);
        
        // 移动与跳跃（用updateXY和jumping，仿照async update）
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
                    return window.$game.inputManager.firstDown("Space", () => {
                        if (this.isOnGround()) {
                            window.$game.statistics.jump++;
                        }
                        this.jumping.setJumpBuffer();
                    });
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
            this.jumping.setJumpBuffer();
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
            this.alive = false;
        }
    }

    draw() {
        if (!this.alive) return;
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
        ctx.strokeStyleStyle = this.isInvulnerable ? '#cccccc' : '#00aaff';
        ctx.strokeRect(this.hitbox.position.x, this.hitbox.position.y, this.hitbox.size.x, this.hitbox.size.y);
        // 绘制攻击判定盒
        if (this.attackBox) {
            ctx.strokeStyle = '#ff0000';
            ctx.strokeRect(this.attackBox.position.x, this.attackBox.position.y, this.attackBox.size.x, this.attackBox.size.y);
        }
        ctx.restore();
    }
}