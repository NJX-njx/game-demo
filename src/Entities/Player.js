import { Entity } from "./Entity";
import { Vector } from "../Utils/Vector";
import { MeleeAttack } from "../System/Attack/MeleeAttack"
import { RangedAttack } from "../System/Attack/RangedArrack" // 保留原拼写
import { Cooldown } from "../Utils/Cooldown";
import { game } from "../Game";
import { textureManager } from "../Manager/TextureManager";
import { soundManager } from "../Manager/SoundManager";
import { inputManager } from "../System/Input/InputManager";
import { eventBus as bus, EventTypes as Events } from "../Manager/EventBus";
import { attributeManager as AM, AttributeTypes as Attrs } from "../Manager/AttributeManager";

class Player_Animation {
    static Framerate = {
        "dash": 4,
        "stand": 4,
        "melee": 6,
        "ranged": 6, // 远程动画：6帧/秒（轮播时每1秒循环一次）
    };
    static Frames = {
        "dash": 4,
        "stand": 4,
        "melee": 6,
        "ranged": 6, // 远程动画：6帧（轮播范围1~6）
    };
    constructor() {
        this.status = "stand";
        this.facing = 1;
        this.frame = 1;
        this.frameRun = 0;
    }
    setStatus(status, facing) {
        if (status != this.status || facing != this.facing) {
            this.frame = 1; // 切换状态时重置到第一帧
            this.frameRun = 0;
            this.status = status;
            this.facing = facing;
        }
    }
    update(deltaTime) {
        this.frameRun += deltaTime;
        const frameInterval = 1000 / Player_Animation.Framerate[this.status];
        
        if (this.frameRun > frameInterval) {
            this.frame++;
            this.frameRun = 0;
        }

        const maxFrame = Player_Animation.Frames[this.status];
        // 1. 关键修改：远程动画改为循环轮播（超过6帧重置为1）
        if (this.frame > maxFrame) {
            switch (this.status) {
                case "run":
                case "stand":
                case "ranged": // 远程动画：轮播（1→6→1）
                    this.frame = 1;
                    break;
                case "melee": // 近战仍保持单次播放后固定最后一帧
                    this.frame = maxFrame;
                    break;
                default:
                    this.frame = maxFrame - 1;
                    break;
            }
        } else if (this.frame < 1) {
            this.frame = 1;
        }
    }
    getFrame() {
        let textureKey;
        switch (this.status) {
            case "dash":
                textureKey = `dash_${this.frame}`;
                break;
            case "melee":
                textureKey = `melee_${this.frame}`;
                break;
            case "ranged":
                textureKey = `ranged_${this.frame}`; // 轮播时自动切换1~6帧
                break;
            case "stand":
                textureKey = `stand_${this.frame}`;
                break;
            case "run":
                textureKey = "0"; // 移动仍用0贴图
                break;
            case "jump":
            case "fall":
                textureKey = "0";
                break;
            default:
                textureKey = `stand_1`;
                break;
        }
        return textureManager.getTexture("player", textureKey);
    }
}

class Player extends Entity {
    static getSaveData() {
        return {
            position: this.instance.hitbox.position,
            state: this.instance.state,
            inventory: [],
            timestamp: new Date().toISOString()
        };
    }

    static loadSaveData(data) {
        if (!this.instance) return;
        this.instance.hitbox.position = data.position;
        this.instance.state = data.state;
    }

    constructor(size = new Vector(50, 50)) {
        if (Player.instance) return Player.instance;
        super(new Vector(), size, new Vector());
        Player.instance = this
        this.size = size;
        this.type = "player";
        this.jumping.type = "player";
        this.isMeleeAttacking = false;
        this.isRangedAttacking = false;
        
        // 2. 新增：远程长按相关状态
        this.isRangedHolding = false; // 标记是否长按L键
        this.rangedLoopCooldown = new Cooldown(0); // 远程轮播攻击的冷却（避免攻击过快）

        this.baseState = {
            hp_max: 100,
            attack: {
                atk: 10,
                MeleeStartupTime: 50,    
                MeleeRecoveryTime: 900,   
                RangedStartupTime: 150,
                RangedRecoveryTime: 700,
                RangedLoopInterval: 850, // 远程轮播间隔（与动画时长匹配：6帧≈1秒，取850ms避免卡顿）
            },
            dash_cooldownTime: 600,
            dash_maxCount: 1,
        }
        this.state = {
            hp: this.baseState.hp_max,
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
                },
                loopInterval: this.baseState.attack.RangedLoopInterval // 轮播攻击间隔（同步动画）
            },
        }
        this.attack = {
            targetSelector: () => game.enemies,
            melee: new MeleeAttack(this),
            ranged: new RangedAttack(this)
        }

        this.facing = 1;
        this.animation = new Player_Animation();
        this.initDash();
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

        this.initMeleeAttackListener();
        this.initRangedAttackListener();
        // 3. 初始化远程轮播冷却（间隔与动画时长匹配）
        this.rangedLoopCooldown.set(this.state.attack.loopInterval);
    }

    initMeleeAttackListener() { // 原有逻辑不变
        const melee = this.attack.melee;
        if (!melee.startupCooldown) melee.startupCooldown = new Cooldown(0);
        if (!melee.recoveryCooldown) melee.recoveryCooldown = new Cooldown(0);

        const originalTrigger = melee.trigger.bind(melee);
        melee.trigger = () => {
            this.isMeleeAttacking = true;
            melee.startupCooldown.set(this.state.attack.startupTime.melee);
            melee.startupCooldown.start();
            setTimeout(() => {
                this.isMeleeAttacking = false;
            }, this.state.attack.startupTime.melee + this.state.attack.recoveryTime.melee);
            originalTrigger();
            soundManager.playSound('player', 'melee');
        };
    }

    // 4. 优化远程攻击监听：支持轮播时的单次攻击触发
    initRangedAttackListener() {
        const ranged = this.attack.ranged;
        if (!ranged.startupCooldown) ranged.startupCooldown = new Cooldown(0);
        if (!ranged.recoveryCooldown) ranged.recoveryCooldown = new Cooldown(0);

        const originalTrigger = ranged.trigger.bind(ranged);
        ranged.trigger = () => {
            this.isRangedAttacking = true; // 标记攻击中（确保动画不被切换）
            ranged.startupCooldown.set(this.state.attack.startupTime.ranged);
            ranged.startupCooldown.start();
            // 攻击后摇结束后，仅在“仍长按”时保留攻击状态（支持轮播）
            setTimeout(() => {
                if (!this.isRangedHolding) { // 松开L键：取消攻击状态
                    this.isRangedAttacking = false;
                }
            }, this.state.attack.startupTime.ranged + this.state.attack.recoveryTime.ranged);
            originalTrigger();
            soundManager.playSound('player', 'ranged');
        };
    }

    update(deltaTime) {
        this.updateState();
        bus.emit(Events.player.hpPercent, this.state.hp / this.state.hp_max);

        // 5. 关键修改：远程长按逻辑（核心）
        // 5.1 监听L键长按/松开：更新长按标记
        if (inputManager.isHeld('L') && !this.isMeleeAttacking) { // 近战优先级高于远程
            this.isRangedHolding = true; // 按下L键：标记长按
        } else {
            // 松开L键：重置所有远程相关状态（停止轮播和攻击）
            this.isRangedHolding = false;
            this.isRangedAttacking = false;
            this.rangedLoopCooldown.reset(); // 重置冷却，下次长按重新开始
        }

        // 5.2 长按期间：动画轮播 + 间隔攻击
        if (this.isRangedHolding) {
            this.rangedLoopCooldown.tick(deltaTime); // 冷却计时
            // 冷却结束 + 动画处于第一帧（确保每轮动画触发一次攻击，同步性更好）
            if (this.rangedLoopCooldown.ready() && this.animation.frame === 1) {
                this.attack.ranged.trigger(); // 触发一次远程攻击
                this.rangedLoopCooldown.start(); // 重启冷却，控制轮播间隔
            }
        }

        // 原有攻击逻辑（单次按下L键仍生效，兼容长按）
        if (inputManager.isKeyDown('J')) this.attack.melee.trigger();
        this.attack.melee.update(deltaTime);
        this.attack.ranged.update(deltaTime);

        this.dash.update(deltaTime);
        const deltaFrame = 60 * deltaTime / 1000;
        let move = this.controllerX();
        this.updateXY(deltaFrame, move, this.controllerY());

        // 6. 动画状态切换：长按远程时强制设为ranged状态
        if (this.isMeleeAttacking) {
            this.animation.setStatus("melee", this.facing);
        } else if (this.isRangedHolding || this.isRangedAttacking) { // 长按或攻击中：保持远程动画
            this.animation.setStatus("ranged", this.facing);
        } else if (this.dash.isDashing) {
            this.animation.setStatus("dash", this.facing);
        } else if (this.jumping.jumpVelocity > 0) {
            this.animation.setStatus("jump", this.facing);
        } else if (!this.isOnGround()) {
            if (this.jumping.jumpVelocity < 0)
                this.animation.setStatus("fall", this.facing);
        } else {
            if (move !== 0) {
                this.animation.setStatus("run", this.facing);
            } else {
                this.animation.setStatus("stand", this.facing);
            }
        }
        this.animation.update(deltaTime); // 动画帧更新（轮播核心）
    }

    // 以下方法完全不变（保留原有逻辑）
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
        // 更新轮播间隔（与属性系统联动，支持后续属性修改）
        this.rangedLoopCooldown.set(this.state.attack.loopInterval);
    }

    initDash() { // 原有逻辑不变
        this.dash = {
            isDashing: false,
            dashDuration: 200,
            dashCooldownTime: this.baseState.dash_cooldownTime,
            dashSpeed: 15,
            dashDir: { x: 1, y: 0 },
            dashDurationCooldown: null,
            dashCooldown: null,
            dashMaxCount: this.baseState.dash_maxCount,
            dashCount: 0,
            update: null
        };

        this.dash.dashDurationCooldown = new Cooldown(this.dash.dashDuration);
        this.dash.dashCooldown = new Cooldown(this.dash.dashCooldownTime);

        this.dash.update = (deltaTime) => {
            if (this.isOnGround()) {
                this.dash.dashCooldown.tick(deltaTime);
                if (this.dash.dashCooldown.ready() && this.dash.dashCount < this.dash.dashMaxCount) {
                    this.dash.dashCount++;
                    this.dash.dashCooldown.start();
                }
            }

            let dx = 0, dy = 0;
            if (inputManager.isKeysDown(['A', 'Left'])) dx -= 1;
            if (inputManager.isKeysDown(['D', 'Right'])) dx += 1;
            if (inputManager.isKeysDown(['W', 'Up'])) dy -= 1;
            if (inputManager.isKeysDown(['S', 'Down'])) dy += 1;

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

    beforeTakeDamage(dmg) { if (this.dash.isDashing === true) return false; return true; }
    takeDamage(dmg, attackType) { // 原有逻辑不变
        let finalDmg = bus.emitReduce(Events.player.takeDamage, { baseDamage: dmg }, (_, next) => next).baseDamage;
        this.state.hp -= finalDmg;
        if (this.state.hp <= 0) {
            if (!bus.emitInterruptible(Events.player.fatelDmg)) {
                bus.emit(Events.player.die);
                alert("你死了");
            }
        }
    }
    takeHeal(amount, source = null) { // 原有逻辑不变
        let modifiedAmount = amount * (1 + AM.getAttrSum(Attrs.player.HEAL));
        modifiedAmount = bus.emitReduce(Events.player.heal, { baseHeal: modifiedAmount }, (_, next) => next).baseHeal;
        const finalAmount = Math.max(0, modifiedAmount);
        this.state.hp = Math.min(this.state.hp_max, this.state.hp + finalAmount);
    }
    setPosition(position) { this.hitbox.position = position; }
    draw(ctx) { // 原有逻辑不变
        const currentTexture = this.animation.getFrame();
        if (!currentTexture) return;

        const drawX = this.hitbox.position.x;
        const drawY = this.hitbox.position.y;
        const drawWidth = this.size.x;
        const drawHeight = this.size.y;

        ctx.save();
        if (this.animation.facing === -1) {
            ctx.translate(drawX + drawWidth, drawY);
            ctx.scale(-1, 1);
            ctx.drawImage(currentTexture, 0, 0, drawWidth, drawHeight);
        } else {
            ctx.drawImage(currentTexture, drawX, drawY, drawWidth, drawHeight);
        }
        ctx.restore();
        this.drawDashUI(ctx);
    }
    drawBoxs(ctx) { // 原有逻辑不变
        ctx.strokeStyle = this.isInvulnerable ? '#cccccc' : '#00aaff';
        ctx.strokeRect(this.hitbox.position.x, this.hitbox.position.y, this.hitbox.size.x, this.hitbox.size.y);

        ctx.strokeStyle = '#ff0000';
        const offset = 0.5 * (this.facing >= 0 ? this.hitbox.size.x : -this.hitbox.size.x);
        const attackBoxPos = this.hitbox.position.addVector(new Vector(offset, this.hitbox.size.y * 0.2));
        const attackBoxSize = new Vector(this.hitbox.size.x * 0.8, this.hitbox.size.y * 0.5);
        ctx.strokeRect(attackBoxPos.x, attackBoxPos.y, attackBoxSize.x, attackBoxSize.y);
        ctx.restore();
    }
    drawDashUI(ctx) { // 原有逻辑不变
        const max = this.dash.dashMaxCount;
        const current = this.dash.dashCount;
        const size = 8;
        const gap = 4;
        const startX = this.hitbox.position.x + this.size.x / 2 - (max * (size + gap) - gap) / 2;
        const y = this.hitbox.position.y - 12;

        for (let i = 0; i < max; i++) {
            ctx.fillStyle = i < current ? "cyan" : "gray";
            ctx.fillRect(startX + i * (size + gap), y, size, size);
            ctx.strokeStyle = "black";
            ctx.strokeRect(startX + i * (size + gap), y, size, size);
        }
    }
}

export const player = new Player();