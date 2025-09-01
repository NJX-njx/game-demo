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
        return window.$game.textureManager.getTexture("player", 0);
    }
}

class Player extends Entity {
    constructor(position, size = new Vector(50, 50), velocity = new Vector()) {
        super(position, size, velocity);
        this.size = size;
        this.type = "player";
        this.jumping.type = "player";

        this.hp = 5;
        this.alive = true;
        this.facing = 1;
        this.animation = new Player_Animation();
        // 冲刺
        this.initDash();
        // 攻击
        this.initAttack();
        // 受击
        this.hurtBox = this.hitbox;
        this.invulnerableCooldown = new Cooldown(100);//受击间隔
        this.controllerX = () => {
            if (this.blockMove) return 0;
            let moveLeft = window.$game.inputManager.isKeysDown(["A", "Left"]);
            let moveRight = window.$game.inputManager.isKeysDown(["D", "Right"]);
            let move = 0;
            if (moveLeft && moveRight)
                move = 0;
            else if (moveLeft)
                this.facing = move = -1;
            else if (moveRight)
                this.facing = move = 1;
            return move;
        }
        this.controllerY = () => {
            if (this.blockMove) return 0;
            return window.$game.inputManager.firstDown("Space", () => {
                this.jumping.jumpBuffer.start();
            });
        }
        window.$game.bus.on('tick', ({ deltaTime }) => this.update(deltaTime));
    }

    async update(deltaTime) {
        if (!this.alive) return;

        // 受击无敌冷却
        this.invulnerableCooldown.tick(deltaTime);

        // 攻击
        this.attack.update(deltaTime);

        // 冲刺
        this.dash.update(deltaTime);
        // 移动与跳跃（用updateXY和jumping，仿照async update）
        const deltaFrame = 60 * deltaTime / 1000;
        let move = 0;
        // 冲刺期间跳过普通横向速度赋值，冲刺结束后只在下一帧才允许普通移动逻辑覆盖
        this.updateXY(deltaFrame, this.controllerX(), this.controllerY());

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

    /**
     * 
     * @param {number} deltaTime 
     * @param {number} cmd_X 返回X轴控制输入，-1左，0无，1右
     * @param {number} cmd_Y 返回Y轴控制输入，0无，1按住跳跃，在函数中应处理预输入
     */
    updateXY(deltaTime, cmd_X, cmd_Y) {
        if (!this.dash.isDashing) {
            //此时的deltaTime当前环境下的1帧，在60帧环境下走了多少帧
            //于是在moveRigid函数中，需要将velocity乘上deltaTime代表在当前环境下走过的路程
            this.updateY(deltaTime, cmd_Y);
            this.velocity.y = -this.jumping.jumpVelocity;
            this.velocity.x = this.updateX(deltaTime, cmd_X);
        }
        let side = this.rigidMove(deltaTime);
        if (side & 1) this.velocity.x = 0, this.dash.isDashing = 0;
        if (side & 2) this.velocity.y = this.jumping.jumpVelocity = 0;
    }

    // 冲刺初始化
    initDash() {
        this.dash = {
            isDashing: false,
            dashDuration: 200,
            dashCooldownTime: 600,
            dashSpeed: 15,
            dashDir: { x: 1, y: 0 },
            dashDurationCooldown: null,
            dashCooldown: null,
            update: null
        };
        this.dash.dashDurationCooldown = new Cooldown(this.dash.dashDuration);
        this.dash.dashCooldown = new Cooldown(this.dash.dashCooldownTime);
        this.dash.update = (deltaTime) => {
            this.dash.dashCooldown.tick(deltaTime);
            // 检测8方向输入
            let dx = 0, dy = 0;
            if (window.$game.inputManager.isKeysDown(['A', 'Left'])) dx -= 1;
            if (window.$game.inputManager.isKeysDown(['D', 'Right'])) dx += 1;
            if (window.$game.inputManager.isKeysDown(['W', 'Up'])) dy -= 1;
            if (window.$game.inputManager.isKeysDown(['S', 'Down'])) dy += 1;
            // 冲刺按键检测
            if (!this.dash.isDashing && this.dash.dashCooldown.ready() && window.$game.inputManager.isKeyDown('K')) {
                // 没有方向输入时默认朝当前facing
                if (dx === 0 && dy === 0) {
                    dx = this.facing;
                }
                // 归一化方向
                let len = Math.sqrt(dx * dx + dy * dy);
                if (len === 0) len = 1;
                this.dash.dashDir = { x: dx / len, y: dy / len };
                this.dash.isDashing = true;
                this.dash.dashDurationCooldown.start();
                this.dash.dashCooldown.start();
                window.$game.soundManager.playSound('player', 'dash');
            }
            // 冲刺状态逻辑
            if (this.dash.isDashing) {
                this.dash.dashDurationCooldown.tick(deltaTime);
                this.velocity.x = this.dash.dashSpeed * this.dash.dashDir.x;
                this.velocity.y = this.dash.dashSpeed * this.dash.dashDir.y;
                if (this.dash.dashDurationCooldown.ready()) {
                    this.dash.isDashing = false;
                    this.jumping.jumpVelocity = - this.velocity.y;
                }
            }
        };
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
                            window.$game.inputManager.isKeyDown('J')) {
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
                            window.$game.soundManager.playSound("player", "attack");
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
                            window.enemies.forEach(enemy => {
                                if (this.attack.attackBox.checkHit(enemy.hurtBox)) {
                                    enemy.takeDamage(this.attack.damage);
                                }
                            });
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

    // 受击判定
    takeDamage(dmg) {
        if (!this.invulnerableCooldown.ready()) return;
        this.hp -= dmg;
        this.invulnerableCooldown.start();
        if (this.hp <= 0) {
            window.$game.bus.emit('player.die');
        }
    }

    setPosition(position) {
        this.hitbox.position = position;
    }

    draw() {
        if (!this.alive) return;
        const ctx = window.$game.ctx;
        //  绘制玩家
        ctx.drawImage(
            this.animation.getFrame(),
            this.hitbox.position.x,
            this.hitbox.position.y,
            this.size.x,
            this.size.y);
        // 绘制血条
        const hpBarWidth = this.size.x;
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
        // if (this.onEvent)
        //     ctx.drawImage(
        //         window.$game.textureManager.getTexture("onEvent", 0),
        //         this.hitbox.position.x + this.size.x / 2 - halfSize,
        //         this.hitbox.position.y - halfSize - basicSize,
        //         basicSize, basicSize);
        // this.drawBoxs(ctx);
    }

    drawBoxs(ctx) {
        ctx.strokeStyle = !this.invulnerableCooldown.ready() ? '#cccccc' : '#00aaff';
        ctx.strokeRect(this.hitbox.position.x, this.hitbox.position.y, this.hitbox.size.x, this.hitbox.size.y);
        // 绘制攻击判定盒
        if (this.attackBox) {
            ctx.strokeStyle = '#ff0000';
            ctx.strokeRect(this.attackBox.position.x, this.attackBox.position.y, this.attackBox.size.x, this.attackBox.size.y);
        }
        ctx.restore();
    }
}