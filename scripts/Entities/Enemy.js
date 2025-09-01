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
        this._unbind_list = [
            window.$game.bus.on('tick', ({ deltaTime }) => this.update(deltaTime)),
        ];
    }

    async update(deltaTime) {

        this.attack.update(deltaTime);
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

        // 移动与跳跃（用updateXY和jumping，仿照async update）
        const deltaFrame = 60 * deltaTime / 1000;
        let move = 0;
        this.updateXY(deltaFrame,
            () => {
                if (this.blockMove) return 0;
                move = 0;
                if (this.hitbox.position.x < window.$game.player.hitbox.position.x) this.facing = move = 1;
                else this.facing = move = -1;
                move *= 0.3;
                return move;
            },
            () => {
                if (this.blockMove) return 0;
                return 0;
            }
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
            // 解绑所有事件
            if (this._unbind_list) {
                for (const unbind of this._unbind_list) {
                    if (typeof unbind === 'function') unbind();
                }
                this._unbind_list = [];
            }
            // 从全局移除自己
            if (window.enemies) {
                const idx = window.enemies.indexOf(this);
                if (idx !== -1) window.enemies.splice(idx, 1);
            }
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
            cooldownTime: 300,  // 总冷却(ms)，包含以上所有阶段

            cooldown: null,

            update: (deltaTime) => {
                // 冷却 tick
                this.attack.cooldown.tick(deltaTime);

                switch (this.attack.state) {
                    case "idle":
                        if (this.attack.cooldown.ready() &&
                            Math.abs(this.hitbox.getCenter().x - window.$game.player.hitbox.getCenter().x) < 30) {
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
                                this.hitbox.position.addVector(new Vector(offset, 0)),
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