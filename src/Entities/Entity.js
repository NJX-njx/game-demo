import { Hitbox } from "../Utils/Hitbox";
import { Vector } from "../Utils/Vector";
import { soundManager } from "../Manager/SoundManager";
import { mapManager } from "../Manager/MapManager";
import { Duration } from "../Utils/Duration";
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
        this.baseJump = baseJump;
        this.maxJump = maxJump;
        this.gravity = gravity;
        this.coyoteTime = coyoteTime;
        this.jumpBuffer = new Duration(jumpBufferTime);
        this.jumpBufferTime = jumpBufferTime;

        this.isJumping = false;
        this.isFalling = false;
        this.jumpVelocity = 0;
        this.chargeTime = 0;
        this.coyoteTimer = 0;
        this.times = 1; //最大速度倍率，用于实现一些需要高跳的场景
    }

    startJump() {
        this.isJumping = true;
        this.isFalling = false;
        this.chargeTime = 0;
        this.jumpBuffer.reset();
        this.coyoteTimer = 0;
        soundManager.playSound(this.type, "jump");
    }

    updateJump(isSpaceHeld, deltaTime, onGround) {
        this.jumpBuffer.tick(deltaTime);
        // 检查是否在地面上
        if (onGround) {
            this.coyoteTimer = this.coyoteTime; // 重置coyote时间
            this.isJumping = false;
            this.isFalling = false;
            if (!onGround & 2)
                this.jumpVelocity = 0;
            // 在弹性地面上跳跃更高，TODO:暂未实现检测
            if (onGround & 2)
                this.times = 1.5;
            else
                this.times = 1;

            // 如果跳跃缓冲器大于0，落地后立即跳跃
            if (!this.jumpBuffer.finished()) {
                this.startJump();
            }
        } else {
            if (!this.isJumping)
                this.isFalling = true;
            this.coyoteTimer = Math.max(this.coyoteTimer - deltaTime, 0);

            // 当仍有coyote时间且已经按下空格时跳跃
            if (!this.isJumping && !this.jumpBuffer.finished() && this.coyoteTimer > 0) {
                this.startJump();
            }
            if (isSpaceHeld) {
                this.jumpBuffer.start();
            }
        }
        if (this.isJumping) {
            //蓄力跳
            if (!this.isFalling && isSpaceHeld && this.chargeTime < this.maxJump * this.times) {
                this.chargeTime += deltaTime;
                this.jumpVelocity = Math.min(this.baseJump + (this.chargeTime / this.maxJump * this.times) * (this.maxJump * this.times - this.baseJump), this.maxJump * this.times);
            } else {
                this.isFalling = true;
                this.updateFalling(deltaTime);
            }
        } else if (this.isFalling) {
            this.updateFalling(deltaTime);
        }
    }

    updateFalling(deltaTime) {
        this.jumpVelocity -= this.gravity * deltaTime;
        this.jumpVelocity = Math.max(-6 * this.baseJump, this.jumpVelocity);
    }
}

export class Entity {
    /**
     *
     * @param {Vector} position
     * @param {Vector} size
     * @param {Vector} velocity
     */
    constructor(position, size, velocity = new Vector()) {
        this.type = "";
        this.size = size;        // 实体的尺寸
        /** @type {Vector} */
        this.velocity = velocity;  // 实体的速度
        // 只负责实体本体的物理碰撞盒，攻击/受击判定可独立扩展
        this.hitbox = new Hitbox(position, size);
        this.jumping = new Jumping(4, 9, 0.5, 8, 15);
        this.MaxSpeed = 6;
        // 可选：攻击盒/受击盒
        this.attackBox = null;
        this.hurtBox = null;
    }

    getCenter() {
        return this.hitbox.getCenter();
    }

    isOnGround() {
        // 判断y轴向下+1是否会与地图方块碰撞
        if (this.velocity.y < 0) return false;
        this.hitbox.position.y += 1;
        let collided = false;
        const blocks = mapManager.getBlockHitboxes();
        collided = !!this.hitbox.checkHits(blocks, () => { });
        this.hitbox.position.y -= 1;
        if (collided) this.isflying = 0;
        return collided;
    }

    /**
     * 刚体移动与碰撞检测， 根据速度更新位置，返回是否碰撞，0表示无碰撞，1表示x方向碰撞，2表示y方向碰撞，3表示xy方向均碰撞
     * @param {number} deltaTime
     * @returns {number}
     */
    rigidMove(deltaTime) {
        // 移动路程需要乘上deltaTime
        // round是因为，如果沾上浮点数判断，这辈子有了
        let move = this.velocity.scale(deltaTime).round();
        let flag = 0;
        // 获取地图方块碰撞盒
        const blocks = mapManager.getBlockHitboxes();

        // // X方向
        // for (let i = 0; i < Math.abs(move.x); ++i) {
        //     this.hitbox.position.x += Math.sign(move.x);
        //     if (this.hitbox.checkHits(blocks, () => {
        //         this.hitbox.position.x -= Math.sign(move.x);
        //     })) {
        //         flag |= 1;
        //         break;
        //     }
        // }
        // // Y方向
        // for (let i = 0; i < Math.abs(move.y); ++i) {
        //     this.hitbox.position.y += Math.sign(move.y);
        //     if (this.hitbox.checkHits(blocks, () => {
        //         this.hitbox.position.y -= Math.sign(move.y);
        //     })) {
        //         flag |= 2;
        //         break;
        //     }
        // }

        // 使用 Bresenham 风格的主轴优先步进，按斜率分配次轴步进。
        // 优点：斜向移动不会一律优先同时移动 x/y（避免 45° 偏置），而是根据 dx/dy 比例决定何时进行次轴步进。
        // 同时在碰撞时尝试滑动（先尝试主轴，如果被阻挡再尝试次轴），以获得平滑的碰撞滑动行为。
        const absX = Math.abs(move.x);
        const absY = Math.abs(move.y);
        const sx = Math.sign(move.x);
        const sy = Math.sign(move.y);

        if (absX === 0 && absY === 0) return 0;

        if (absX >= absY) {
            // X 为主轴
            let err = absX / 2;
            for (let i = 0; i < absX; ++i) {
                // 先尝试沿主轴移动一格
                this.hitbox.position.x += sx;
                if (this.hitbox.checkHits(blocks, () => { })) {
                    // 主轴被阻挡：回退并尝试沿次轴移动（滑动）
                    this.hitbox.position.x -= sx;
                    flag |= 1;
                    // 如果还需要在这个步骤上移动次轴（由误差决定），尝试次轴移动
                    err -= absY;
                    if (err < 0) {
                        this.hitbox.position.y += sy;
                        if (this.hitbox.checkHits(blocks, () => { this.hitbox.position.y -= sy; })) {
                            // 次轴也被阻挡
                            flag |= 2;
                        }
                        err += absX;
                    }
                } else {
                    // 主轴移动成功
                    err -= absY;
                    if (err < 0) {
                        // 需要执行次轴步进
                        this.hitbox.position.y += sy;
                        if (this.hitbox.checkHits(blocks, () => { this.hitbox.position.y -= sy; })) {
                            // 次轴被阻挡，回退次轴移动但保留主轴移动（滑动效果）
                            flag |= 2;
                        } else {
                            // 次轴也成功
                        }
                        err += absX;
                    }
                }
            }
        } else {
            // Y 为主轴，逻辑对称
            let err = absY / 2;
            for (let i = 0; i < absY; ++i) {
                this.hitbox.position.y += sy;
                if (this.hitbox.checkHits(blocks, () => { })) {
                    this.hitbox.position.y -= sy;
                    flag |= 2;
                    err -= absX;
                    if (err < 0) {
                        this.hitbox.position.x += sx;
                        if (this.hitbox.checkHits(blocks, () => { this.hitbox.position.x -= sx; })) {
                            flag |= 1;
                        }
                        err += absY;
                    }
                } else {
                    err -= absX;
                    if (err < 0) {
                        this.hitbox.position.x += sx;
                        if (this.hitbox.checkHits(blocks, () => { this.hitbox.position.x -= sx; })) {
                            flag |= 1;
                        }
                        err += absY;
                    }
                }
            }
        }
        return flag;
    }

    updateY(deltaTime, control) {
        this.jumping.updateJump(control, deltaTime, this.isOnGround());
    }

    // 更新X轴速度
    updateX(deltaTime, move) {
        // 速度惯性和摩擦处理
        const onGround = this.isOnGround();
        let nextVelocityX = this.velocity.x;
        // 地面逻辑
        if (onGround) {
            if (move === 0) {
                // 地面摩擦减速
                nextVelocityX *= Math.exp(-0.5 * deltaTime);
            } else {
                // 地面加速，带有惯性
                const accel = 10 * deltaTime;
                nextVelocityX = move * Math.min(Math.sqrt(this.velocity.x * this.velocity.x + accel), this.MaxSpeed);
            }
            if (move) {
                soundManager.playSound(this.type, 'walk');
            }
        } else {
            // 空中逻辑
            const airAccel = 0.3 * deltaTime; // 空中加速度
            if (move !== 0) {
                // 空中主动加速，逐步靠近move*MaxSpeed
                nextVelocityX += airAccel * (move * this.MaxSpeed - this.velocity.x);
                // 限制最大速度
                if (Math.abs(nextVelocityX) > this.MaxSpeed) {
                    nextVelocityX = this.MaxSpeed * Math.sign(nextVelocityX);
                }
            } else {
                // 空中缓慢减速
                nextVelocityX *= Math.exp(-0.05 * deltaTime);
            }
        }
        return nextVelocityX;
    }

    /**
     * 
     * @param {number} deltaTime 
     * @param {function} controllerX 返回X轴控制输入，-1左，0无，1右
     * @param {function} controllerY 返回Y轴控制输入，0无，1按住跳跃，在函数中应处理预输入
     */
    updateXY(deltaTime, controllerX, controllerY) {
        //此时的deltaTime当前环境下的1帧，在60帧环境下走了多少帧
        //于是在moveRigid函数中，需要将velocity乘上deltaTime代表在当前环境下走过的路程
        this.updateY(deltaTime, controllerY());
        this.velocity.y = -this.jumping.jumpVelocity;
        this.velocity.x = this.updateX(deltaTime, controllerX());

        let side = this.rigidMove(deltaTime);
        if (side & 1) this.velocity.x = 0;
        if (side & 2) this.velocity.y = this.jumping.jumpVelocity = 0;
    }

    update(deltaTime) {
        deltaFrame = 60 * deltaTime / 1000;
        this.updateXY(deltaFrame, () => { return 0; }, () => { return 0; });
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = `rgba(221, 100, 0, 1)`;
        ctx.fillRect(this.hitbox.position.x, this.hitbox.position.y, this.hitbox.size.x, this.hitbox.size.y);
        ctx.restore();
    }
}
