import { Entity } from "./Entity";
import { Vector } from "../Utils/Vector";
import { MeleeAttack } from "../System/Attack/MeleeAttack"
import { RangedAttack } from "../System/Attack/RangedArrack"
import { Cooldown } from "../Utils/Cooldown";
import { Duration } from "../Utils/Duration";
import { game } from "../Game";
import { textureManager } from "../Manager/TextureManager";
import { soundManager } from "../Manager/SoundManager";
import { inputManager } from "../System/Input/InputManager";
import { eventBus as bus, EventTypes as Events } from "../Manager/EventBus";
import { attributeManager as AM, AttributeTypes as Attrs } from "../Manager/AttributeManager";
import { drawSprite } from "../Utils/canvas";
import { Decoy } from "./Decoy";
import { talentManager } from "../System/Talent/TalentManager";
import { Projectile } from "../System/Attack/Projectile";

class Player_Animation {
    static Framerate = {
        "dash": 4,
        "stand": 4,
        "melee": 6,
        "ranged": 6, // 远程动画：6帧/秒（轮播时每1秒循环一次）
        "block": 5, // 格挡动画：5帧/秒
    };
    static Frames = {
        "dash": 4,
        "stand": 4,
        "melee": 6,
        "ranged": 6, // 远程动画：6帧（轮播范围1~6）
        "block": 5, // 格挡动画：5帧
    };
    constructor() {
        this.status = "stand";
        this.frame = 1;
        this.frameRun = 0;
    }

    setStatus(status) {
        if (status != this.status) {
            this.frame = 1;
            this.frameRun = 0;
            this.status = status;
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

        if (this.frame > maxFrame) {
            switch (this.status) {
                case "block":
                    this.frame = maxFrame;
                    break;
                default:
                    this.frame = 1;
                    break;
            }
        } else if (this.frame < 1) {
            this.frame = 1;
        }
    }
    getFrame() {
        const hasFrames = Player_Animation.Frames && Player_Animation.Frames[this.status];
        const textureKey = hasFrames ? `${this.status}_${this.frame}` : "default";
        return textureManager.getTexture("player", textureKey);
    }
}

class Player extends Entity {
    constructor(size = new Vector(50, 50)) {
        if (Player.instance) return Player.instance;
        super(new Vector(), size, new Vector());
        Player.instance = this
        this.type = "player";
        this.jumping.type = "player";
        this.baseState = {
            hp_max: 100,                //血量上限
            MaxSpeed: 6,                //最大移动速度
            attack: {
                atk: 10,                 //基础攻击
                MeleeStartupTime: 50,    //攻击前摇
                MeleeRecoveryTime: 900,  //攻击后摇
                RangedStartupTime: 150,  //攻击前摇
                RangedRecoveryTime: 700, //攻击后摇
            },
            dash_cooldownTime: 600,     //冲刺冷却
            dash_durationTime: 200,     //冲刺持续时间
            dash_maxCount: 1,           //冲刺段数
            block: {
                parryWindow: 200,           // 弹反窗口时间（毫秒）
                recoveryTime: 300,          // 后摇时间（毫秒）
                damageReduction: 0.7,       // 格挡伤害减免系数
                parryDamageMultiplier: 1.5, // 弹反伤害倍数
            },
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
            block: {
                parryWindow: this.baseState.block.parryWindow,
                recoveryTime: this.baseState.block.recoveryTime,
                damageReduction: this.baseState.block.damageReduction,
                parryDamageMultiplier: this.baseState.block.parryDamageMultiplier,
            },
            unlock: {
                melee: false,
                ranged: false,
                dash: false,
                block: false,
                dodge: false,
                parry: false
            }
        }

        this.facing = 1;
        this.moving = false;
        this.animation = new Player_Animation();
        // 当前武器：'melee' 或 'ranged'，初始为近战
        this.currentWeapon = 'melee';
        const getDamage = (type) => {
            let dmg = this.state.attack.damage[type];

            // 处理闪避反击倍率
            let mult = 1;
            if (this.dodge.isDodge) {
                this.dodge.stopDodgeWindow();
                // 触发闪避反击事件，供其他系统响应
                bus.emit(Events.player.dodge_attack);
                mult = talentManager.hasTalentLevel('愉悦', 1) ? 3 : 2;
            }

            return dmg * mult;
        };
        const getSpeed = () => {
            let speed = 12;
            if (talentManager.hasTalentLevel('凝神', 1)) speed *= 4;
            return speed;
        };
        this.attack = {
            melee: new MeleeAttack(this, { getTargets: () => game.enemies, getDamage: getDamage.bind(this, 'melee') }),
            ranged: new RangedAttack(this, { getTargets: () => game.enemies, getDamage: getDamage.bind(this, 'ranged'), getSpeed: getSpeed.bind(this) })
        }

        // 冲刺
        this.dash = {
            isDashing: false,
            dashSpeed: 15,
            dashDir: { x: 1, y: 0 },

            dashDurationCooldown: new Duration(this.baseState.dash_durationTime),  // 冲刺持续时间
            dashCooldown: new Cooldown(this.baseState.dash_cooldownTime),          // 恢复一段冲刺的冷却时间

            dashMaxCount: this.baseState.dash_maxCount,         // 最大段数
            dashCount: 0,                                       // 当前可用段数
            isCountingDash: false, // 用于检测是否刚触地以启动冲刺段数恢复计时器

            trigger: () => {
                if (this.dash.isDashing || this.dash.dashCount <= 0) return;

                // --- 冲刺输入检测 ---
                let dx = 0, dy = 0;
                if (inputManager.isKeysDown(['A', 'Left'])) dx -= 1;
                if (inputManager.isKeysDown(['D', 'Right'])) dx += 1;
                if (inputManager.isKeysDown(['W', 'Up'])) dy -= 1;
                if (inputManager.isKeysDown(['S', 'Down'])) dy += 1;

                if (dx === 0 && dy === 0) dx = this.facing;
                let len = Math.sqrt(dx * dx + dy * dy);
                if (len === 0) len = 1;

                this.dash.dashDir = { x: dx / len, y: dy / len };
                this.dash.isDashing = true;
                this.dash.dashDurationCooldown.start();
                this.dash.dashCount--;
                this.dash.isCountingDash = true;
                soundManager.playSound('player', 'dash');
            },
            update: (deltaTime) => {
                // --- 冲刺段数恢复逻辑 ---
                if (this.isOnGround()) {
                    this.dash.isCountingDash = true;
                }
                if (this.dash.isCountingDash && this.dash.dashCount < this.dash.dashMaxCount) {
                    this.dash.dashCooldown.tick(deltaTime);
                    if (this.dash.dashCooldown.ready()) {
                        this.dash.dashCount++;
                        this.dash.dashCooldown.start();
                    }
                }

                // --- 冲刺状态 ---
                if (this.dash.isDashing) {
                    this.dash.dashDurationCooldown.tick(deltaTime);
                    this.velocity.x = this.dash.dashSpeed * this.dash.dashDir.x;
                    this.velocity.y = this.dash.dashSpeed * this.dash.dashDir.y;
                    if (this.dash.dashDurationCooldown.finished()) {
                        this.dash.isDashing = false;
                        this.jumping.jumpVelocity = -this.velocity.y;
                    }
                }
            },
            refreshDashCount: () => {
                this.dash.dashCount = this.dash.dashMaxCount;
                this.dash.dashCooldown.start();
            }
        };

        // 闪避反击
        this.dodge = {
            isDodge: false, // 是否处于闪避状态
            duration: new Duration(1000), // 闪避反击窗口持续时间（毫秒）
            update: (deltaTime) => {
                // 更新闪避反击窗口计时
                this.dodge.duration.tick(deltaTime);
                if (this.dodge.duration.finished()) {
                    this.dodge.isDodge = false;
                }
            },
            startDodgeWindow: () => {
                this.dodge.duration.start();
                this.dodge.isDodge = true;
            },
            stopDodgeWindow: () => {
                this.dodge.duration.reset();
                this.dodge.isDodge = false;
            }
        };

        // 格挡
        this.block = {
            isBlocking: false,// 是否正在格挡
            isParrying: false,// 是否在弹反窗口内
            blockCooldown: new Cooldown(this.state.block.recoveryTime), // 格挡冷却
            parryDuration: new Duration(this.state.block.parryWindow),  // 弹反窗口

            trigger: () => {
                if (!this.state.unlock.block) return;
                if (this.block.isBlocking || !this.block.blockCooldown.ready()) return;

                this.block.isBlocking = true;
                if (this.state.unlock.parry) {
                    this.block.isParrying = true;
                    this.block.parryDuration.start();
                }

                this.dodge.duration.reset(); // 取消闪避反击窗口

                console.log(`开始格挡 - 进入弹反窗口 (${this.state.block.parryWindow}ms)`);
            },

            stop: () => {
                if (this.block.isBlocking) {
                    this.block.isBlocking = false;
                    this.block.isParrying = false;
                    this.block.blockCooldown.start();
                    console.log("停止格挡 - 进入后摇");
                }
            },

            update: (deltaTime) => {
                this.block.blockCooldown.tick(deltaTime);

                if (this.block.isParrying) {
                    this.block.parryDuration.tick(deltaTime);
                    if (this.block.parryDuration.finished()) {
                        this.block.isParrying = false;
                        console.log(`弹反窗口结束`);
                    }
                }
            },

            // 对敌人造成范围伤害（热烈）
            applyParryDamageArea: (reflectedDamage) => {
                const victims = [];
                if (reflectedDamage <= 0) return victims;
                const enemies = game.enemies || [];

                const center = this.hitbox.getCenter();
                const radius = 70;

                enemies.forEach(enemy => {
                    const enemyCenter = enemy.hurtBox.getCenter();
                    if (Math.hypot(enemyCenter.x - center.x, enemyCenter.y - center.y) > radius) return;
                    if (victims.includes(enemy)) return;
                    enemy.takeDamage(reflectedDamage, 'parry', this);
                    victims.push(enemy);
                });

                return victims;
            },

            // 弹反子弹
            reflectProjectile: (projectile, reflectedDamage) => {
                if (!projectile || !projectile.alive) return;
                projectile.owner = this;
                projectile.from = this.attack.ranged;
                projectile.damage = reflectedDamage;
                projectile.bouncedTimes = 0;
                projectile.velocity = projectile.velocity.scale(-1);
                const dir = projectile.velocity.magnitude() > 0 ? projectile.velocity.normalize() : new Vector(this.facing || 1, 0);
                projectile.hitbox.position = projectile.hitbox.position.addVector(dir.scale(6));
                projectile.color = '#38bdf8';
                return projectile;
            },

            /**
             * 执行弹反攻击
             * @param {Object} context
             * @param {string} context.attackType 攻击类型 'melee' 或 'ranged'
             * @param {number} context.damage 原始伤害值
             * @param {Entity} context.attacker 攻击者实体
             * @param {Projectile} [context.projectile] 被弹反的子弹实体（仅远程攻击时提供） 
             */
            performParry: (context = {}) => {
                const { attackType = 'melee', damage = 0, attacker = null, projectile = null } = context;

                const multiplier = this.state.block.parryDamageMultiplier;
                const reflectedDamage = Math.max(0, Math.round(damage * multiplier));

                console.log(`执行弹反攻击！类型:${attackType}，反弹伤害:${reflectedDamage}`);

                const payload = {
                    player: this,
                    attackType,
                    attacker,
                    incomingDamage: damage ?? 0,
                    reflectedDamage,
                    isProjectile: !!projectile,
                    projectile: projectile || null,
                    reflectedTargets: [],
                    timestamp: typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
                };

                const victims = [];

                if (attackType === 'ranged' && projectile) {
                    payload.reflectedProjectile = this.block.reflectProjectile(projectile, reflectedDamage) || null;
                    if (talentManager.hasTalentLevel('热烈', 1)) {
                        const splashVictims = this.block.applyParryDamageArea(reflectedDamage);
                        splashVictims.forEach(enemy => {
                            if (!victims.includes(enemy)) victims.push(enemy);
                        });
                    }
                } else if (attackType === 'melee' && attacker && attacker !== this) {
                    attacker.takeDamage(reflectedDamage, 'parry', this);
                    victims.push(attacker);
                }

                payload.reflectedTargets = victims;

                bus.emit(Events.player.parry, payload);

                this.block.isParrying = false;
                this.block.parryDuration.reset();
                this.block.stop();
                this.block.blockCooldown.reset();
            }
        };

        // 受击
        this.hurtBox = this.hitbox;

        this.invinDuration = new Duration(0); // 受击后无敌时间

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

        // 对话事件：取消正在进行的动作并重置必要状态
        bus.on({
            event: Events.dialog.start,
            handler: () => {
                // 强制取消正在进行的攻击状态
                if (this.attack.melee) { this.attack.melee.reset(); }
                if (this.attack.ranged) { this.attack.ranged.reset(); }
                this.block.stop();
                this.dash.isDashing = false;
                this.animation.setStatus("stand");
            }
        });
    }

    update(deltaTime) {
        if (this._decoy) this._decoy.update(deltaTime);
        this.updateState();
        bus.emit(Events.player.hpPercent, this.state.hp / this.state.hp_max);

        // 攻击与操作逻辑（按键映射：F 切换武器，J 攻击，K 突进，L 格挡＆弹反）
        // 切换武器（需先解锁远程：天赋名 '你须抵抗'）
        if (inputManager.isFirstDown('F')) {
            if (this.currentWeapon === 'melee' && this.state.unlock.ranged) {
                this.currentWeapon = 'ranged';
                console.log('切换武器为', this.currentWeapon);
            } else if (this.currentWeapon === 'ranged' && this.state.unlock.melee) {
                this.currentWeapon = 'melee';
                console.log('切换武器为', this.currentWeapon);
            }
        }

        // 攻击（J）
        if (inputManager.isKeyDown('J')) {
            if (this.currentWeapon === 'melee' && this.state.unlock.melee) this.attack.melee.trigger();
            else if (this.currentWeapon === 'ranged' && this.state.unlock.ranged) this.attack.ranged.trigger();
        }
        // 突进（K）
        if (inputManager.isKeyDown('K') && this.state.unlock.dash) this.dash.trigger();
        // 格挡＆弹反（L）
        if (inputManager.isKeyDown('L') && this.state.unlock.block) this.block.trigger();
        else this.block.stop();

        this.attack.melee.update(deltaTime);
        this.attack.ranged.update(deltaTime);
        this.dash.update(deltaTime);
        this.block.update(deltaTime);
        this.dodge.update(deltaTime);

        // 移动与跳跃
        const deltaFrame = 60 * deltaTime / 1000;
        const cmd_X = this.controllerX(), cmd_Y = this.controllerY();
        this.updateXY(deltaFrame, cmd_X, cmd_Y);
        this.moving = cmd_X !== 0;

        // 动画状态更新
        if (this.attack.melee.isAttacking) {
            this.animation.setStatus("melee");
        } else if (this.attack.ranged.isAttacking) {
            this.animation.setStatus("ranged");
        } else if (this.block.isBlocking) {
            this.animation.setStatus("block");
        } else if (this.dash.isDashing) {
            this.animation.setStatus("dash");
        } else if (this.jumping.jumpVelocity > 0) {
            this.animation.setStatus("jump");
        } else if (!this.isOnGround()) {
            if (this.jumping.jumpVelocity < 0)
                this.animation.setStatus("fall");
        } else {
            if (this.moving) {
                this.animation.setStatus("run");
            } else {
                this.animation.setStatus("stand");
            }
        }
        this.animation.update(deltaTime); // 动画帧更新
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
        if (side & 1) this.velocity.x = 0;
        if (side & 2) this.velocity.y = this.jumping.jumpVelocity = 0;
    }

    // 更新状态
    updateState() {
        const hp = AM.getAttrSum(Attrs.player.HP);
        const spd = Math.min(AM.getAttrSum(Attrs.player.SPD), 1);
        const atk = AM.getAttrSum(Attrs.player.ATK);
        const dmg = AM.getAttrSum(Attrs.player.DMG);
        const Melee_dmg = AM.getAttrSum(Attrs.player.MeleeDmg);
        const Ranged_dmg = AM.getAttrSum(Attrs.player.RangedDmg);
        const ST = AM.getAttrSum(Attrs.player.AttackStartupTime);
        const RT = AM.getAttrSum(Attrs.player.AttackRecoveryTime);
        const meleeST = AM.getAttrSum(Attrs.player.MeleeStartupTime);
        const meleeRT = AM.getAttrSum(Attrs.player.MeleeRecoveryTime);
        const rangedST = AM.getAttrSum(Attrs.player.RangedStartupTime);
        const rangedRT = AM.getAttrSum(Attrs.player.RangedRecoveryTime);
        const dash_charge = AM.getAttrSum(Attrs.player.DASH_CHARGE);
        const dash_duration = AM.getAttrSum(Attrs.player.DASH_DURATION);
        const block_dmg_reduction = AM.getAttrSum(Attrs.player.BlockDamageReduction);
        const parry_damage = AM.getAttrSum(Attrs.player.PARRY_DMG);

        this.state.hp_max = this.baseState.hp_max * (1 + hp);
        this.state.hp = Math.min(this.state.hp, this.state.hp_max);
        this.MaxSpeed = this.baseState.MaxSpeed * (1 + spd);

        this.state.attack.atk = this.baseState.attack.atk * (1 + atk);
        this.state.attack.damage.melee = this.state.attack.atk * (1 + dmg) * (1 + Melee_dmg);
        this.state.attack.damage.ranged = this.state.attack.atk * (1 + dmg) * (1 + Ranged_dmg);
        this.state.attack.startupTime.melee = this.baseState.attack.MeleeStartupTime + meleeST + ST;
        this.state.attack.startupTime.ranged = this.baseState.attack.RangedStartupTime + rangedST + ST;
        this.state.attack.recoveryTime.melee = this.baseState.attack.MeleeRecoveryTime + meleeRT + RT;
        this.state.attack.recoveryTime.ranged = this.baseState.attack.RangedRecoveryTime + rangedRT + RT;
        Player_Animation.Framerate["melee"] = Player_Animation.Frames["melee"] / ((this.state.attack.startupTime.melee + this.state.attack.recoveryTime.melee) / 1000);
        Player_Animation.Framerate["ranged"] = Player_Animation.Frames["ranged"] / ((this.state.attack.startupTime.ranged + this.state.attack.recoveryTime.ranged) / 1000);

        const dashCooldownTime = this.baseState.dash_cooldownTime * (1 - dash_charge);
        this.dash.dashCooldown.set(dashCooldownTime);
        const dashDurationTime = this.baseState.dash_durationTime + dash_duration;
        this.dash.dashDurationCooldown.set(dashDurationTime);

        this.state.block.parryWindow = this.baseState.block.parryWindow;
        this.block.parryDuration.set(this.state.block.parryWindow);
        this.state.block.recoveryTime = this.baseState.block.recoveryTime;
        this.block.blockCooldown.set(this.state.block.recoveryTime);
        this.state.block.damageReduction = this.baseState.block.damageReduction + block_dmg_reduction;
        this.state.block.parryDamageMultiplier = this.baseState.block.parryDamageMultiplier * (1 + parry_damage);
    }

    // 检查攻击方向是否在格挡范围内
    isAttackFromFront(attacker) {
        if (!attacker || !attacker.hitbox) return false;
        if (talentManager.hasTalentLevel('冷静', 1)) return true; // 持有冷静时格挡所有方向伤害

        const attackerCenterX = attacker.hitbox.getCenter().x;
        const playerCenterX = this.hitbox.getCenter().x;

        // 如果玩家面向右侧(facing = 1)，攻击者必须在玩家右侧
        // 如果玩家面向左侧(facing = -1)，攻击者必须在玩家左侧
        if (this.facing > 0) {
            return attackerCenterX > playerCenterX;
        } else {
            return attackerCenterX < playerCenterX;
        }
    }

    // 返回当前是否可受击
    beforeTakeDamage(dmg, attackType = null, attacker = null, projectile = null) {
        if (!this.invinDuration.finished()) return false;
        if (this.dash.isDashing === true) {
            bus.emit(Events.player.dodge);
            console.log("闪避成功！");
            if (this.state.unlock.dodge) this.dodge.startDodgeWindow();
            return false;
        };
        if (this.block.isParrying && attacker && this.isAttackFromFront(projectile ?? attacker)) {// 弹反：完全免疫伤害并触发弹反攻击
            this.block.performParry({ attackType, damage: dmg, attacker, projectile });
            console.log("弹反成功！");
            return false; // 完全免疫伤害
        }
        return true;
    }

    // 受击判定
    takeDamage(dmg, attackType, attacker = null, projectile = null) {
        if (this._decoy) return;
        let finalDmg = bus.emitReduce(
            Events.player.takeDamage,
            { baseDamage: dmg, attackType, attacker, projectile },
            (_, next) => next
        ).baseDamage;

        // 格挡处理
        if (this.block.isBlocking && attacker && this.isAttackFromFront(attacker)) {
            finalDmg = finalDmg * this.state.block.damageReduction;
            console.log(`格挡成功，伤害减免至: ${finalDmg}`);
        }

        finalDmg *= (1 + AM.getAttrSum(Attrs.player.TAKE_DMG));

        finalDmg = Math.max(0, Math.floor(finalDmg));

        const hpBefore = this.state.hp;
        this.state.hp -= finalDmg;
        bus.emit(Events.player.afterTakeDamage, { attackType, attacker, damage: finalDmg, victim: this });
        // 统一的死亡处理
        this.checkAndHandleDeath(hpBefore, finalDmg);
    }

    /**
     * 生命流失（直接扣血），不经过 HEAL 属性或治疗事件的加成计算。
     * 常用于持续性伤害 / 状态扣血效果。
     * @param {number} amount - 扣除的生命值（基数，直接减）
     * @param {string|null} source - 来源（可选）
     */
    takeLifeLoss(amount, source = null) {
        if (this._decoy) return;
        const finalAmount = Math.max(0, amount);
        this.state.hp = Math.max(0, this.state.hp - finalAmount);

        try { bus.emit(Events.player.afterTakeDamage, { attackType: 'life_loss', attacker: source, damage: finalAmount, victim: this }); } catch (e) { }

        // 统一的死亡处理
        this.checkAndHandleDeath();
    }

    /**
     * 统一的死亡判定与处理函数。
     * - 当 hp <= 0 时触发可中断的致命伤事件（Events.player.fatelDmg），如果没有被中断，则触发死亡事件。
     */
    checkAndHandleDeath(hpBefore = 0, dmg = 0) {
        if (this.state.hp < 0)
            if (!bus.emitInterruptible(Events.player.fatelDmg, { hpBefore, damage: dmg })) {
                bus.emit(Events.player.die);
                alert("你死了");
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

    /**
     * 创建替身：替身会出现在玩家当前位置，存在指定时间或被攻击后消失。
     * @param {number} durationMs 存在时长（毫秒）
     */
    createDecoy(durationMs = 4000) {
        this._decoy = new Decoy(this.hitbox.position.copy(), this.size.copy(), this, durationMs, this.animation.getFrame());
    }

    draw(ctx) {
        const currentTexture = this.animation.getFrame();
        if (!currentTexture) return;

        ctx.save();

        const drawX = this.hitbox.position.x;
        const drawY = this.hitbox.position.y;
        let drawWidth = this.size.x;
        let drawHeight = this.size.y;

        // 格挡动画特殊处理：使用更大的渲染尺寸
        if (this.animation.status === "block") {
            // 格挡动画纹理是420x420，需要适当缩放
            const scaleFactor = 420 / 256; // 相对于基础纹理的缩放比例
            drawWidth = this.size.x * scaleFactor;
            drawHeight = this.size.y * scaleFactor;
            // 调整位置，让角色居中
            const offsetX = (drawWidth - this.size.x) / 2;
            const offsetY = (drawHeight - this.size.y) / 2;
            const adjustedX = drawX - offsetX;
            const adjustedY = drawY - offsetY;

            drawSprite(ctx, currentTexture, adjustedX, adjustedY, drawWidth, drawHeight, this.facing);
        } else {
            // 其他动画使用原有逻辑
            drawSprite(ctx, currentTexture, drawX, drawY, drawWidth, drawHeight, this.facing);
        }

        ctx.restore();

        // 绘制冲刺UI
        this.drawDashUI(ctx);
        if (player._decoy) {
            player._decoy.draw(ctx);
        }
    }

    drawBoxs(ctx) {
        ctx.save();
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
        if (!this.state.unlock.dash) return;
        ctx.save();
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
        ctx.restore();
    }
}

export const player = new Player();