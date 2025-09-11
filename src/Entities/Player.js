import { Entity } from "./Entity";
import { Vector } from "../Utils/Vector";
import { MeleeAttack } from "../System/Attack/MeleeAttack"
import { RangedAttack } from "../System/Attack/RangedArrack"
import { Cooldown } from "../Utils/Cooldown";
import { game } from "../Game";
import { textureManager } from "../Manager/TextureManager";
import { soundManager } from "../Manager/SoundManager";
import { inputManager } from "../System/Input/InputManager";
import { eventBus as bus, EventTypes as Events } from "../Manager/EventBus";
import { attributeManager as AM, AttributeTypes as Attrs } from "../Manager/AttributeManager";

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
        // return textureManager.getTexture(this.status, this.frame * this.facing);
        return textureManager.getTexture("player", 0);
    }
}

class Player extends Entity {
    static getSaveData() {
        return {
            position: this.instance.hitbox.position,
            state: this.instance.state,
            inventory: [], // 待实现物品系统
            timestamp: new Date().toISOString()
        };
    }

    static loadSaveData(data) {
        if (!this.instance) return;
        this.instance.hitbox.position = data.position;
        this.instance.state = data.state;
        // 待实现物品系统加载
    }

    constructor(size = new Vector(50, 50)) {
        if (Player.instance) return Player.instance;
        super(new Vector(), size, new Vector());
        Player.instance = this
        this.size = size;
        this.type = "player";
        this.jumping.type = "player";
        this.baseState = {
            hp_max: 100,                //血量上限
            attack: {
                atk: 10,                //基础攻击
                MeleeStartupTime: 50,    //攻击前摇
                MeleeRecoveryTime: 900,   //攻击后摇
                RangedStartupTime: 150,    //攻击前摇
                RangedRecoveryTime: 700,   //攻击后摇
            },
            dash_cooldownTime: 600,     //冲刺冷却
            dash_maxCount: 1,           //冲刺段数
        }
        this.state = {
            hp: this.baseState.hp_max,  //当前血量
            hp_max: this.baseState.hp_max,
            attack: {
                atk: this.baseState.attack.atk,
                damage: {
                    melee: this.baseState.attack.atk,
                    ranged: this.baseState.attack.atk
                },
                startupTime: {
                    melee: this.baseState.attack.MeleeStartupTime,
                    ranged: this.baseState.attack.RangedStartupTime
                },
                recoveryTime: {
                    melee: this.baseState.attack.MeleeRecoveryTime,
                    ranged: this.baseState.attack.RangedRecoveryTime
                }
            },
        }
        this.attack = {
            targetSelector: () => game.enemies,
            melee: new MeleeAttack(this),
            ranged: new RangedAttack(this)
        }

        this.facing = 1;
        this.animation = new Player_Animation();
        // 冲刺
        this.initDash();
        // 受击
        this.hurtBox = this.hitbox;
        this.controllerX = () => {
            if (this.blockMove) return 0;
            let moveLeft = inputManager.isKeysDown(["A", "Left"]);
            let moveRight = inputManager.isKeysDown(["D", "Right"]);
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
            if (inputManager.isFirstDown("Space"))
                this.jumping.jumpBuffer.start();
            return inputManager.isHeld("Space");
        }
        this.dealDamageEvent = Events.player.dealDamage;
    }

    update(deltaTime) {
        this.updateState();
        bus.emit(Events.player.hpPercent, this.state.hp / this.state.hp_max);

        // 攻击逻辑
        if (inputManager.isKeyDown('J')) this.attack.melee.trigger();
        if (inputManager.isKeyDown('L')) this.attack.ranged.trigger();
        this.attack.melee.update(deltaTime);
        this.attack.ranged.update(deltaTime);

        // 冲刺逻辑
        this.dash.update(deltaTime);

        // 移动与跳跃
        const deltaFrame = 60 * deltaTime / 1000;
        let move = 0;
        // 冲刺期间跳过普通横向速度赋值，冲刺结束后只在下一帧才允许普通移动逻辑覆盖
        this.updateXY(deltaFrame, this.controllerX(), this.controllerY());

        // 动画状态更新
        if (this.jumping.jumpVelocity > 0) {
            this.animation.setStatus("jump", this.facing);
        } else if (!this.isOnGround()) {
            if (this.jumping.jumpVelocity < 0)
                this.animation.setStatus("fall", this.facing);
        } else {
            if (move) {
                this.animation.setStatus("run", this.facing);
            } else {
                this.animation.setStatus("stand", this.facing);
            }
        }
        this.animation.update(deltaFrame);
    }

    /**
     * 重写updateXY，实现冲刺时不计算摩擦和重力造成的速度改变
     * @param {number} deltaTime 
     * @param {number} cmd_X 返回X轴控制输入，-1左，0无，1右
     * @param {number} cmd_Y 返回Y轴控制输入，0无，1按住跳跃，在函数中应处理预输入
     */
    updateXY(deltaTime, cmd_X, cmd_Y) {
        if (!this.dash.isDashing) {
            this.updateY(deltaTime, cmd_Y);
            this.velocity.y = -this.jumping.jumpVelocity;
            this.velocity.x = this.updateX(deltaTime, cmd_X);
        }
        let side = this.rigidMove(deltaTime);
        if (side & 1) this.velocity.x = 0, this.dash.isDashing = 0;
        if (side & 2) this.velocity.y = this.jumping.jumpVelocity = 0;
    }

    // 更新状态
    updateState() {
        const hp = AM.getAttrSum(Attrs.player.HP);
        const atk = AM.getAttrSum(Attrs.player.ATK);
        const dmg = AM.getAttrSum(Attrs.player.DMG);
        const meleeST = AM.getAttrSum(Attrs.player.MeteeStartupTime);
        const meleeRT = AM.getAttrSum(Attrs.player.MeteeRecoveryTime);
        const rangedST = AM.getAttrSum(Attrs.player.RangedStartupTime);
        const rangedRT = AM.getAttrSum(Attrs.player.RangedRecoveryTime);
        const dash_charge = AM.getAttrSum(Attrs.player.DASH_CHARGE);
        this.state.hp_max = this.baseState.hp_max * (1 + hp);
        this.state.hp = Math.min(this.state.hp, this.state.hp_max);
        this.state.attack.atk = this.baseState.attack.atk * (1 + atk);
        this.state.attack.damage.melee = this.state.attack.atk * (1 + dmg);
        this.state.attack.damage.ranged = this.state.attack.atk * (1 + dmg);
        this.state.attack.startupTime.melee = this.baseState.attack.MeleeStartupTime + meleeST;
        this.state.attack.startupTime.ranged = this.baseState.attack.RangedStartupTime + rangedST;
        this.state.attack.recoveryTime.melee = this.baseState.attack.MeleeRecoveryTime + meleeRT;
        this.state.attack.recoveryTime.ranged = this.baseState.attack.RangedRecoveryTime + rangedRT;
        this.dash.dashCooldownTime = this.baseState.dash_cooldownTime * (1 - dash_charge);
        this.dash.dashCooldown.set(this.dash.dashCooldownTime);
    }

    // 冲刺初始化
    initDash() {
        this.dash = {
            isDashing: false,
            dashDuration: 200,       // 冲刺持续时间
            dashCooldownTime: this.baseState.dash_cooldownTime,   // 恢复一段冲刺的冷却时间
            dashSpeed: 15,
            dashDir: { x: 1, y: 0 },

            dashDurationCooldown: null,
            dashCooldown: null,

            dashMaxCount: this.baseState.dash_maxCount,         // 最大段数
            dashCount: 0,                                       // 当前可用段数

            update: null
        };

        this.dash.dashDurationCooldown = new Cooldown(this.dash.dashDuration);
        this.dash.dashCooldown = new Cooldown(this.dash.dashCooldownTime);

        this.dash.update = (deltaTime) => {
            // --- 冲刺段数恢复逻辑 ---
            if (this.isOnGround()) {
                this.dash.dashCooldown.tick(deltaTime);
                if (this.dash.dashCooldown.ready() && this.dash.dashCount < this.dash.dashMaxCount) {
                    this.dash.dashCount++;
                    this.dash.dashCooldown.start();
                }
            }

            // --- 冲刺输入检测 ---
            let dx = 0, dy = 0;
            if (inputManager.isKeysDown(['A', 'Left'])) dx -= 1;
            if (inputManager.isKeysDown(['D', 'Right'])) dx += 1;
            if (inputManager.isKeysDown(['W', 'Up'])) dy -= 1;
            if (inputManager.isKeysDown(['S', 'Down'])) dy += 1;

            // 触发冲刺
            if (!this.dash.isDashing && this.dash.dashCount > 0 && inputManager.isKeyDown('K')) {
                if (dx === 0 && dy === 0) dx = this.facing;
                let len = Math.sqrt(dx * dx + dy * dy);
                if (len === 0) len = 1;

                this.dash.dashDir = { x: dx / len, y: dy / len };
                this.dash.isDashing = true;
                this.dash.dashDurationCooldown.start();
                this.dash.dashCount--;
                soundManager.playSound('player', 'dash');
            }

            // --- 冲刺状态 ---
            if (this.dash.isDashing) {
                this.dash.dashDurationCooldown.tick(deltaTime);
                this.velocity.x = this.dash.dashSpeed * this.dash.dashDir.x;
                this.velocity.y = this.dash.dashSpeed * this.dash.dashDir.y;
                if (this.dash.dashDurationCooldown.ready()) {
                    this.dash.isDashing = false;
                    this.jumping.jumpVelocity = -this.velocity.y;
                }
            }
        };
    }

    // 返回当前是否可受击
    beforeTakeDamage(dmg) {
        if (this.dash.isDashing === true) return false;
        return true;
    }

    // 受击判定
    takeDamage(dmg, attackType) {
        let finalDmg = bus.emitReduce(
            Events.player.takeDamage,
            { baseDamage: dmg },
            (_, next) => next
        ).baseDamage;
        this.state.hp -= finalDmg;
        if (this.state.hp <= 0) {
            // -----判定阻止死亡-----
            if (!bus.emitInterruptible(Events.player.fatelDmg)) {
                bus.emit(Events.player.die);
                alert("你死了");
            }
        }
    }

    /**
     * 受治疗
     * @param {number} amount - 基础治疗量
     * @param {string|null} source - 来源（道具、技能等）
     */
    takeHeal(amount, source = null) {
        // -----计算属性加成-----
        let modifiedAmount = amount * (1 + AM.getAttrSum(Attrs.player.HEAL));
        // -----计算事件影响治疗量-----
        modifiedAmount = bus.emitReduce(
            Events.player.heal,
            { baseHeal: modifiedAmount },
            (_, next) => next
        ).baseHeal;
        // -----实际回血-----
        const finalAmount = Math.max(0, modifiedAmount);
        this.state.hp = Math.min(this.state.hp_max, this.state.hp + finalAmount);
    }

    setPosition(position) {
        this.hitbox.position = position;
    }

    draw(ctx) {
        // 绘制玩家
        ctx.drawImage(
            this.animation.getFrame(),
            this.hitbox.position.x,
            this.hitbox.position.y,
            this.size.x,
            this.size.y);

        // 绘制冲刺UI
        this.drawDashUI(ctx);
    }

    drawBoxs(ctx) {
        // 绘制敌人自身盒子
        ctx.strokeStyle = this.isInvulnerable ? '#cccccc' : '#00aaff';
        ctx.strokeRect(this.hitbox.position.x, this.hitbox.position.y, this.hitbox.size.x, this.hitbox.size.y);

        // ---- 调试用攻击判定框 ----
        ctx.strokeStyle = '#ff0000';

        // 计算判定框位置
        const offset = 0.5 * (this.facing >= 0 ? this.hitbox.size.x : -this.hitbox.size.x);
        const attackBoxPos = this.hitbox.position.addVector(new Vector(offset, this.hitbox.size.y * 0.2));
        const attackBoxSize = new Vector(this.hitbox.size.x * 0.8, this.hitbox.size.y * 0.5);
        ctx.strokeRect(attackBoxPos.x, attackBoxPos.y, attackBoxSize.x, attackBoxSize.y);
        ctx.restore();
    }

    drawDashUI(ctx) {
        const max = this.dash.dashMaxCount;
        const current = this.dash.dashCount;

        const size = 8; // 每个方块的边长
        const gap = 4;  // 间隔
        const startX = this.hitbox.position.x + this.size.x / 2 - (max * (size + gap) - gap) / 2;
        const y = this.hitbox.position.y - 12; // 头顶上方一点

        for (let i = 0; i < max; i++) {
            ctx.fillStyle = i < current ? "cyan" : "gray"; // 已有 → 蓝色，缺失 → 灰色
            ctx.fillRect(startX + i * (size + gap), y, size, size);
            ctx.strokeStyle = "black";
            ctx.strokeRect(startX + i * (size + gap), y, size, size);
        }
    }
}

export const player = new Player();