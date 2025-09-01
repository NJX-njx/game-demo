class Jumping {
    /**
     * 跳跃系统
     * @param {number} baseJump 基础跳跃速度
     * @param {number} maxJump 最大跳跃速度
     * @param {number} gravity 重力加速度
     * @param {number} coyoteTime 跳跃宽限时间（离开地面后还能跳的时间）
     * @param {number} jumpBufferTime 预输入时间（提前按跳跃键后，落地能自动跳）
     */
    constructor(baseJump, maxJump, gravity, coyoteTime, jumpBufferTime) {
        this.baseJump = baseJump;               // 基础跳跃速度
        this.maxJump = maxJump;                 // 最大跳跃速度
        this.gravity = gravity;                 // 重力加速度
        this.coyoteTime = coyoteTime;           // 跳跃宽限时间（离开地面后还能跳的时间）
        this.jumpBufferTime = jumpBufferTime;   // 预输入时间（提前按跳跃键后，落地能自动跳）

        this.isJumping = false;
        this.isFalling = false;
        this.jumpVelocity = 0;
        this.chargeTime = 0;
        this.coyoteTimer = 0;
        this.jumpBuffer = 0;
        this.isSpaceHeld = false;
        this.times = 1;
    }

    canJump(onGround, deltaTime) {
        // 检查是否在地面上
        if (onGround) {
            this.coyoteTimer = this.coyoteTime; // 重置coyote时间
            this.isJumping = false;
            this.isFalling = false;
            if (!onGround & 2)
                this.jumpVelocity = 0;
            if (onGround & 2)
                this.times = 1.5;
            else
                this.times = 1;

            // 如果跳跃缓冲器大于0，落地后立即跳跃
            if (this.jumpBuffer > 0) {
                this.startJump();
            }
        } else {
            if (!this.isJumping)
                this.isFalling = true;
            this.coyoteTimer = Math.max(this.coyoteTimer - deltaTime, 0);

            // 当仍有coyote时间且已经按下空格时跳跃
            if (!this.isJumping && this.jumpBuffer > 0 && this.coyoteTimer > 0) {
                this.startJump();
            }
        }
    }

    startJump() {
        this.isJumping = true;
        this.isFalling = false;
        this.chargeTime = 0;
        this.jumpBuffer = 0;
        this.coyoteTimer = 0;
    }

    updateJump(isSpaceHeld, deltaTime, type) {
        if (this.isJumping) {
            //蓄力跳
            if (!this.isFalling && isSpaceHeld && this.chargeTime < this.maxJump * this.times) {
                // console.log("jumpingnow", this.chargeTime);
                if (this.jumpVelocity < 1e-5)
                    window.$game.soundManager.playSound(type + "-jump");
                this.chargeTime += deltaTime;
                this.jumpVelocity = Math.min(this.baseJump + (this.chargeTime / this.maxJump * this.times) * (this.maxJump * this.times - this.baseJump), this.maxJump * this.times);
                //蓄力跳
            } else {
                this.isFalling = true;
                this.updateFalling(deltaTime);
            }
        } else if (this.isFalling) {
            this.updateFalling(deltaTime);
        }
        this.reduceJumpBuffer(deltaTime);
    }

    applyJump(position, deltaTime) {
        position.y -= this.jumpVelocity * deltaTime;
        return position;
    }

    reduceJumpBuffer(deltaTime) {
        this.jumpBuffer = Math.max(this.jumpBuffer - deltaTime, 0);
    }

    setJumpBuffer() {
        this.jumpBuffer = this.jumpBufferTime;
    }
    setFalling() {
        this.isFalling = true;
        this.isJumping = false;
    }
    resetJump() {
        this.isJumping = false;
        this.isFalling = false;
        this.jumpVelocity = 0;
    }
    updateFalling(deltaTime) {
        this.jumpVelocity -= this.gravity * deltaTime;
        this.jumpVelocity = Math.max(-6 * this.baseJump, this.jumpVelocity);

    }
}

class Entity {
    /**
     *
     * @param {Vector} position
     * @param {Vector} size
     * @param {Vector} velocity
     */
    constructor(position, size, velocity = new Vector()) {
        this.type = "";
        this.velocity = velocity;  // 实体的速度
        // 只负责实体本体的物理碰撞盒，攻击/受击判定可独立扩展
        this.hitbox = new Hitbox(position, size);
        this.jumping = new Jumping(4, 9, 0.5, 8, 15);
        this.MaxSpeed = 6;
        this.isflying = 0;
        // 可选：攻击盒/受击盒
        this.attackBox = null;
        this.hurtBox = null;
    }

    getCenter() {
        return this.hitbox.getCenter();
    }

    checkOutOfMap() {
        if (this.hitbox.outofMap())
            window.$game.restart();
    }

    isOnGround() {
        // 判断y轴向下+1是否会与地图方块碰撞
        if (this.velocity.y < 0) return false;
        this.hitbox.position.y += 1;
        let collided = false;
        if (window.$game && window.$game.mapManager) {
            const blocks = window.$game.mapManager.getBlockHitboxes();
            collided = !!this.hitbox.checkHits(blocks, () => { });
        }
        this.hitbox.position.y -= 1;
        if (collided) this.isflying = 0;
        return collided;
    }

    /**
     * 刚体移动与碰撞检测
     * @param {number} deltaTime
     * @returns {number}
     */
    rigidMove(deltaTime) {
        // 移动路程需要乘上deltaTime
        // round是因为，如果沾上浮点数判断，这辈子有了
        let move = this.velocity.scale(deltaTime).round();
        let flag = 0;
        // 获取地图方块碰撞盒
        let blocks = window.$game.mapManager.getBlockHitboxes();

        // X方向
        for (let i = 0; i < Math.abs(move.x); ++i) {
            this.hitbox.position.x += Math.sign(move.x);
            if (this.hitbox.checkHits(blocks, () => {
                this.hitbox.position.x -= Math.sign(move.x);
            })) {
                flag |= 1;
                break;
            }
        }
        // Y方向
        for (let i = 0; i < Math.abs(move.y); ++i) {
            this.hitbox.position.y += Math.sign(move.y);
            if (this.hitbox.checkHits(blocks, () => {
                this.hitbox.position.y -= Math.sign(move.y);
            })) {
                flag |= 2;
                break;
            }
        }
        return flag;
    }

    updateJumping(deltaTime, control) {
        this.jumping.canJump(this.isOnGround(), deltaTime);
        this.jumping.updateJump(control, deltaTime, this.type);
    }

    updateX(deltaTime, control, isPlayer) {
        let move = control;
        let nextVelocityX = this.velocity.x;
        let decelerate = (now, deceleration) => {
            return Math.sqrt(Math.max(now * now - deceleration * deltaTime * now * now, 0)) * Math.sign(now);
        };
        let onGround = this.isOnGround();
        if (isPlayer && onGround && move)
            window.$game.soundManager.playSound(this.type + '-walk');
        if (isPlayer && (onGround & 4) && move) {
            nextVelocityX = move * Math.min(Math.sqrt(Math.abs(this.velocity.x * this.velocity.x * this.velocity.x) + 3 * deltaTime), this.MaxSpeed * 3);
        }
        else if (move == 0 && (onGround & 4)) {
            nextVelocityX = decelerate(this.velocity.x, 0.1);
        } else if (isPlayer && !this.isflying && Math.abs(this.velocity.x) <= this.MaxSpeed) {
            if (move == 0)
                nextVelocityX = this.velocity.x * Math.exp(-0.5 * deltaTime);
            else
                nextVelocityX = move * Math.min(Math.sqrt(this.velocity.x * this.velocity.x + 10 * deltaTime), this.MaxSpeed);
        } else {

            if (move == 0) {
                if (this.isOnGround())
                    nextVelocityX = decelerate(this.velocity.x, (0.16) * (1 + isPlayer));
                else
                    nextVelocityX = decelerate(this.velocity.x, (0.01) * (1 + isPlayer));
            }
            else if (move * this.velocity.x > 0) {
                if (this.isOnGround())
                    nextVelocityX = decelerate(this.velocity.x, 0.3);
                else
                    nextVelocityX = decelerate(this.velocity.x, 0.01);
            }
            else {
                if (this.isOnGround())
                    nextVelocityX = decelerate(this.velocity.x, 0.5);
                else
                    nextVelocityX = decelerate(this.velocity.x, 0.1);

            }
        }
        return nextVelocityX;
    }

    updateXY(deltaTime, controllerX, controllerY, isPlayer) {
        //此时的deltaTime当前环境下的1帧，在60帧环境下走了多少帧
        //于是在moveRigid函数中，需要将velocity乘上deltaTime代表在当前环境下走过的路程
        this.isflying = Math.max(this.isflying - deltaTime, 0);
        this.updateJumping(deltaTime, controllerY());
        let nextVelocityY = -this.jumping.jumpVelocity;
        let nextVelocityX = this.velocity.x;
        nextVelocityX = this.updateX(deltaTime, controllerX(), isPlayer);
        this.velocity.x = nextVelocityX;
        this.velocity.y = nextVelocityY;
        let side = this.rigidMove(deltaTime);
        if (side & 1) this.velocity.x = 0, this.isflying = 0;
        if (side & 2) this.velocity.y = 0;
        if (this.velocity.y == 0) {
            this.jumping.jumpVelocity = 0;
            this.jumping.setFalling();
        }
    }

    update(deltaTime) {
        deltaTime = 60 * deltaTime / 1000;
        this.updateXY(deltaTime, () => { return 0; }, () => { return 0; }, false);
    }

    draw() {
        window.$game.ctx.fillStyle = `rgba(221, 100, 0, 1)`;
        window.$game.ctx.fillRect(this.hitbox.position.x, this.hitbox.position.y, this.hitbox.size.x, this.hitbox.size.y);
    }
}
