class Player_Animation {
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
        return window.$game.textureManager.getTexture("player", 0);
    }
}
class Player extends Entity {
    constructor(position, size = new Vector(50, 50), velocity = new Vector()) {
        super(position, size, velocity);
        this.PlayerSize = size;
        this.type = "player";
        this.hp = 5;
        this.alive = true;
        this.facing = 1;
        this.animation = new Player_Animation();
        // 冲刺
        this.isDashing = false;
        this.dashDuration = 100;
        this.dashTimer = 0;
        this.dashCooldown = new Cooldown(1000);
        this.dashSpeed = 15;
        this.dashSound = new Audio('assets/audios/dash.wav');
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
        // 冲刺输入
        if (!this.isDashing && this.dashCooldown.ready() && window.$game.inputManager.isKeyDown('K')) {
            this.isDashing = true;
            this.dashTimer = this.dashDuration;
            this.dashCooldown.start();
            if (this.dashSound) {
                this.dashSound.currentTime = 0;
                this.dashSound.play();
            }
        }
        // 攻击输入
        if (!this.isAttacking && this.attackCooldown.ready() && window.$game.inputManager.isKeyDown('J')) {
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
            this.invulnerableTimer -= deltaTime;
            if (this.invulnerableTimer <= 0) {
                this.isInvulnerable = false;
                this.invulnerableTimer = 0;
            }
        }
        // 冲刺逻辑
        if (this.isDashing && this.dashTimer > 0) {
            this.velocity.x = this.dashSpeed * this.facing;
            this.dashTimer -= deltaTime;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.dashTimer = 0;
            }
        }
        // 攻击逻辑
        if (this.isAttacking && this.attackTimer > 0) {
            window.enemies.forEach(enemy => {
                if (this.attackBox && this.attackBox.checkHit(enemy.hurtBox)) {
                    enemy.takeDamage(this.attackDamage);
                }
            });
            this.attackTimer -= deltaTime;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
                this.attackBox = null;
                this.attackTimer = 0;
            }
        }
        // 冷却tick
        this.dashCooldown.tick(deltaTime);
        this.attackCooldown.tick(deltaTime);

        // 移动与跳跃（用updateXY和jumping，仿照async update）
        const deltaFrame = 60 * deltaTime / 1000;
        let move = 0;
        this.updateXY(deltaFrame,
            () => {
                if (this.blockMove) return 0;
                let moveLeft = window.$game.inputManager.isKeysDown(["A", "Left"]);
                let moveRight = window.$game.inputManager.isKeysDown(["D", "Right"]);
                move = 0;
                if (moveLeft)
                    this.facing = move = -1;
                if (moveRight)
                    this.facing = move = 1;
                return move;
            },
            () => {
                if (this.blockMove) return 0;
                return window.$game.inputManager.firstDown("Space", () => {
                    if (this.isOnGround()) {
                        window.$game.statistics.jump++;
                    }
                    this.jumping.setJumpBuffer();
                });
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
            this.PlayerSize.x,
            this.PlayerSize.y);
        // 绘制血条
        const hpBarWidth = this.PlayerSize.x;
        const hpBarHeight = 6;
        const hpBarX = this.hitbox.position.x;
        const hpBarY = this.hitbox.position.y - 12;
        ctx.save();
        ctx.fillStyle = 'red';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);
        ctx.fillStyle = 'green';
        const currentHpPercent = Math.max(this.hp, 0) / 5;
        const currentHpWidth = hpBarWidth * currentHpPercent;
        ctx.fillRect(hpBarX, hpBarY, currentHpWidth, hpBarHeight);
        ctx.strokeStyle = 'black';
        ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);
        ctx.restore();
        if (this.onEvent)
            ctx.drawImage(
                window.$game.textureManager.getTexture("onEvent", 0),
                this.hitbox.position.x + this.PlayerSize.x / 2 - halfSize,
                this.hitbox.position.y - halfSize - basicSize,
                basicSize, basicSize);
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