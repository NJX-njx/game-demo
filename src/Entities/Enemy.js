import { Entity } from "./Entity";
import { Vector } from "../Utils/Vector";
import { Hitbox } from "../Utils/Hitbox";
import { MeleeAttack } from "../System/Attack/MeleeAttack";
import { RangedAttack } from "../System/Attack/RangedArrack"; // 假设已修正拼写
import { EnemyRangedAttack } from "../System/Attack/EnemyRangedAttack";
import { Cooldown } from "../Utils/Cooldown";
import { game } from "../Game";
import { textureManager } from "../Manager/TextureManager";
import { soundManager } from "../Manager/SoundManager";
import { player } from "./Player";
import { mapManager } from "../Manager/MapManager";
import { eventBus as bus, EventTypes as Events } from "../Manager/EventBus";
import { attributeManager as AM, AttributeTypes as Attrs } from "../Manager/AttributeManager";

// ========================= 怪物动画配置表 =========================
const EnemyAnimationConfigs = {
    "1": {
        defaultFrame: "1",
        hasAttackAnimation: false,
        attackType: "ranged",
        rangedAttack: {
            range: 500,
            cooldown: 2000,
            damage: 12,
            projectileSpeed: 6,
            projectileColor: '#ff4444',
            projectileSize: new Vector(8, 8),
            projectileShape: 'rectangle'
        }
    },
    "2": {
        defaultFrame: "2",
        hasAttackAnimation: false,
        attackType: "melee"
    },
    // 霸凌者：近战
    "balingzhe": {
        defaultFrame: "balingzhe_1",
        hasAttackAnimation: true,
        attackType: "melee",
        attack: {
            frames: 5,
            framerate: 8,
            duration: 1000,
            framePrefix: "balingzhe_attack_"
        }
    }
};

// ========================= 动画类 =========================
class EnemyAnimation {
    constructor(enemyType) {
        this.config = EnemyAnimationConfigs[enemyType] || EnemyAnimationConfigs["1"];
        this.enemyType = enemyType;
        
        this.facing = 1;
        this.isAttacking = false;
        this.attackFrame = 1;
        this.frameTimer = 0;
        this.attackEndTime = 0;
    }

    setAttackState(isAttacking, facing) {
        if (this.config.hasAttackAnimation && isAttacking) {
            this.isAttacking = true;
            this.attackFrame = 1;
            this.frameTimer = 0;
            this.attackEndTime = Date.now() + this.config.attack.duration;
            this.facing = facing;
        } else if (Date.now() >= this.attackEndTime) {
            this.isAttacking = false;
            this.facing = facing;
        }
    }

    update(deltaTime) {
        if (!this.isAttacking || !this.config.hasAttackAnimation) return;

        const frameInterval = 1000 / this.config.attack.framerate;
        this.frameTimer += deltaTime;

        while (this.frameTimer >= frameInterval) {
            this.attackFrame++;
            this.frameTimer -= frameInterval;
            if (this.attackFrame > this.config.attack.frames) {
                this.attackFrame = 1;
            }
        }
    }

    getFrame() {
        if (this.isAttacking && this.config.hasAttackAnimation) {
            const attackFrameId = `${this.config.attack.framePrefix}${this.attackFrame}`;
            return textureManager.getTexture("enemy", attackFrameId) 
                || textureManager.getTexture("enemy", this.config.defaultFrame);
        }
        return textureManager.getTexture("enemy", this.config.defaultFrame);
    }
}

// ========================= 基础怪物类（保持原有近战功能） =========================
export class Enemy extends Entity {
    constructor(type, position, size = new Vector(50, 50), velocity = new Vector()) {
        super(position, size, velocity);
        this.Size = size;
        this.type = "enemy" + type;
        this.enemytype = type;
        this.config = EnemyAnimationConfigs[this.enemytype] || EnemyAnimationConfigs["1"];

        // 基础属性
        this.baseState = {
            hp_max: 100,                
            attack: {
                atk: 10,                
                MeleeStartupTime: 50,    
                MeleeRecoveryTime: 1500
            }
        };

        this.state = {
            hp: this.baseState.hp_max,  
            hp_max: this.baseState.hp_max,
            attack: {
                damage: { melee: this.baseState.attack.atk },
                startupTime: { melee: this.baseState.attack.MeleeStartupTime },
                recoveryTime: { melee: this.baseState.attack.MeleeRecoveryTime }
            }
        };

        this.facing = 1;
        this.animation = new EnemyAnimation(this.enemytype);

        // 根据敌人类型决定攻击方式
        if (this.config.attackType === "ranged" && this.config.rangedAttack) {
            // 对于1号怪物，使用专门的EnemyRangedAttack
            if (this.enemytype === "1") {
                this.attack = {
                    ranged: new EnemyRangedAttack(this, this.config.rangedAttack),
                    targetSelector: () => [player],
                    isAttacking: false,
                    attackTimer: 0,
                    cooldownTimer: 0,
                    cooldownDuration: this.config.rangedAttack.cooldown,
                    rangedCooldown: new Cooldown(this.config.rangedAttack.cooldown)
                };
            } else {
                this.attack = {
                    ranged: new RangedAttack(this),
                    targetSelector: () => [player],
                    isAttacking: false,
                    attackTimer: 0,
                    cooldownTimer: 0,
                    cooldownDuration: this.config.rangedAttack.cooldown,
                    rangedCooldown: new Cooldown(this.config.rangedAttack.cooldown)
                };
            }
        } else {
            this.attack = {
                melee: new MeleeAttack(this),
                targetSelector: () => [player],
                isAttacking: false,
                attackTimer: 0,
                cooldownTimer: 0,
                cooldownDuration: 2000
            };
        }

        this.hurtBox = this.hitbox;
        this._unbind_list = [];
    }

    update(deltaTime) {
        this.updateState();
        const enemyCenter = this.hitbox.getCenter();
        const playerCenter = player.hitbox.getCenter();
        const horizontalDist = Math.abs(enemyCenter.x - playerCenter.x);
        const verticalDist = Math.abs(enemyCenter.y - playerCenter.y);
        const totalDist = Math.sqrt(horizontalDist ** 2 + verticalDist ** 2);

        let shouldAttack = false;
        let lockOnMode = "patrol";

        // 攻击冷却计时
        if (this.attack.cooldownTimer > 0) {
            this.attack.cooldownTimer -= deltaTime;
        }

        // 根据攻击类型进行不同的锁敌与攻击判定
        if (this.config.attackType === "ranged" && this.config.rangedAttack) {
            // 远程攻击逻辑
            if (verticalDist < 150 && totalDist <= this.config.rangedAttack.range) {
                lockOnMode = "attack";
                shouldAttack = this.attack.cooldownTimer <= 0;
            } else if (totalDist > this.config.rangedAttack.range && totalDist < this.config.rangedAttack.range + 200) {
                lockOnMode = "approach"; // 靠近目标
            }
        } else {
            // 近战攻击逻辑（保持原有逻辑）
            if (Math.abs(verticalDist) < 100 && horizontalDist < 400) {
                lockOnMode = "attack";
                shouldAttack = Math.random() < 0.15 && this.attack.cooldownTimer <= 0;
            }
        }

        // 攻击处理
        const hasAttackAnim = this.config.hasAttackAnimation;
        if (hasAttackAnim) {
            if (shouldAttack && !this.attack.isAttacking) {
                if (this.config.attackType === "ranged" && this.attack.ranged) {
                    this.triggerRangedAttack();
                } else {
                    this.attack.melee.trigger();
                }
                this.attack.isAttacking = true;
                this.attack.attackTimer = this.config.attack.duration || 1000;
                this.attack.cooldownTimer = this.attack.cooldownDuration;
            }
            if (this.attack.isAttacking) {
                this.attack.attackTimer -= deltaTime;
                if (this.attack.attackTimer <= 0) {
                    this.attack.isAttacking = false;
                }
            }
        } else {
            if (shouldAttack) {
                if (this.config.attackType === "ranged" && this.attack.ranged) {
                    this.triggerRangedAttack();
                } else {
                    this.attack.melee.trigger();
                }
                this.attack.cooldownTimer = this.attack.cooldownDuration;
            }
        }

        // 更新对应的攻击系统
        if (this.config.attackType === "ranged" && this.attack.ranged) {
            this.attack.ranged.update(deltaTime);
        } else {
            this.attack.melee.update(deltaTime);
        }

        this.updateMovement(lockOnMode);

        this.animation.setAttackState(this.attack.isAttacking, this.facing);
        this.animation.update(deltaTime);
    }

    updateMovement(lockOnMode) {
        const deltaFrame = 60 * (game.deltaTime || 16) / 1000;
        let move = 0;
        const enemyCenterX = this.hitbox.getCenter().x;
        const playerCenterX = player.hitbox.getCenter().x;

        if (this.config.attackType === "ranged" && this.config.rangedAttack) {
            // 远程怪物的移动逻辑
            const distance = Math.abs(enemyCenterX - playerCenterX);
            
            switch (lockOnMode) {
                case "attack":
                    // 攻击模式：保持距离，面向玩家
                    this.facing = enemyCenterX < playerCenterX ? 1 : -1;
                    // 如果距离过近则后退
                    if (distance < this.config.rangedAttack.range * 0.7) {
                        move = -this.facing * 0.2;
                    } else if (distance > this.config.rangedAttack.range * 0.9) {
                        // 如果距离过远则前进
                        move = this.facing * 0.2;
                    } else {
                        move = 0; // 保持在最佳攻击距离
                    }
                    break;
                    
                case "approach":
                    // 靠近模式：移动到攻击范围内
                    this.facing = enemyCenterX < playerCenterX ? 1 : -1;
                    move = this.facing * 0.25;
                    break;
                    
                default:
                    // 巡逻模式
                    if (Math.random() < 0.002) {
                        this.facing = Math.random() < 0.5 ? 1 : -1;
                    }
                    const nextX = this.hitbox.position.x + this.facing * 2;
                    const testHitbox = new Hitbox(new Vector(nextX, this.hitbox.position.y), this.hitbox.size);
                    const willHitWall = mapManager.getBlockHitboxes().some(block => testHitbox.checkHit(block));
                    
                    if (willHitWall || nextX < 0 || nextX > 1280) {
                        this.facing = -this.facing;
                    }
                    move = this.facing * 0.15; // 远程怪物巡逻速度稍慢
                    break;
            }
        } else {
            // 近战怪物的移动逻辑（保持原有逻辑）
            if (lockOnMode === "attack") {
                this.facing = this.hitbox.position.x < player.hitbox.position.x ? 1 : -1;
                move = this.facing * 0.3;
            } else {
                if (Math.random() < 0.002) {
                    this.facing = Math.random() < 0.5 ? 1 : -1;
                }
                const nextX = this.hitbox.position.x + this.facing * 2;
                const testHitbox = new Hitbox(new Vector(nextX, this.hitbox.position.y), this.hitbox.size);
                const willHitWall = mapManager.getBlockHitboxes().some(block => testHitbox.checkHit(block));
                
                if (willHitWall || nextX < 0 || nextX > 1280) {
                    this.facing = -this.facing;
                }
                move = this.facing * 0.2;
            }
        }

        this.updateXY(deltaFrame, () => move, () => 0, true);
    }

    updateState() {
        const hp = AM.getAttrSum(Attrs.enemy.HP);
        const atk = AM.getAttrSum(Attrs.enemy.ATK);
        this.state.hp_max = this.baseState.hp_max * (1 + hp);
        this.state.hp = Math.min(this.state.hp, this.state.hp_max);
        this.state.attack.damage.melee = this.baseState.attack.atk * (1 + atk);
        
        // 如果是远程怪物，更新远程攻击伤害
        if (this.config.attackType === "ranged" && this.config.rangedAttack) {
            this.state.attack.damage.ranged = this.config.rangedAttack.damage * (1 + atk);
        }
    }

    takeDamage(dmg) {
        this.state.hp -= dmg;
        if (this.state.hp <= 0) {
            bus.emit(Events.enemy.die);
            this._unbind_list.forEach(unbind => unbind());
            const idx = game.enemies.indexOf(this);
            if (idx !== -1) game.enemies.splice(idx, 1);
        }
    }

    draw(ctx) {
        const frameTexture = this.animation.getFrame();
        if (frameTexture) {
            ctx.save();
            if (this.facing === -1) {
                const flipX = this.hitbox.position.x + this.Size.x;
                ctx.translate(flipX, this.hitbox.position.y);
                ctx.scale(-1, 1);
                ctx.drawImage(frameTexture, 0, 0, this.Size.x, this.Size.y);
            } else {
                ctx.drawImage(
                    frameTexture,
                    this.hitbox.position.x,
                    this.hitbox.position.y,
                    this.Size.x,
                    this.Size.y
                );
            }
            ctx.restore();
        }

        // 绘制血条
        const hpBarWidth = this.Size.x;
        const hpBarHeight = 6;
        const hpBarX = this.hitbox.position.x;
        const hpBarY = this.hitbox.position.y - 12;
        ctx.fillStyle = 'red';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth * (this.state.hp / this.state.hp_max), hpBarHeight);
        ctx.strokeStyle = 'black';
        ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);
        
        // 绘制远程攻击 projectile
        this.drawProjectiles(ctx);
    }
    
    // 新增：触发远程攻击
    triggerRangedAttack() {
        if (!this.attack.ranged) return;
        
        // 播放攻击音效
        soundManager.playSound('enemy', 'ranged_attack');
        
        // 计算方向
        const direction = this.hitbox.getCenter().x < player.hitbox.getCenter().x ? 1 : -1;
        
        // 触发远程攻击
        if (this.enemytype === "1" && this.attack.ranged.trigger) {
            // 对于1号怪物，使用新的触发方式
            this.attack.ranged.trigger({
                direction: new Vector(direction, 0),
                speed: this.config.rangedAttack.projectileSpeed,
                damage: this.state.attack.damage.ranged
            });
        } else {
            // 其他远程怪物使用原有方式
            this.attack.ranged.trigger({
                direction: new Vector(direction, 0),
                speed: this.config.rangedAttack.projectileSpeed,
                damage: this.state.attack.damage.ranged
            });
        }
    }
    
    // 新增：绘制远程攻击 projectile
    drawProjectiles(ctx) {
        if (this.attack.ranged && this.attack.ranged.projectiles) {
            this.attack.ranged.projectiles.forEach(projectile => {
                ctx.save();
                ctx.fillStyle = projectile.color || '#ff6600';
                ctx.beginPath();
                ctx.arc(
                    projectile.position.x, 
                    projectile.position.y, 
                    projectile.size || 5, 
                    0, 
                    Math.PI * 2
                );
                ctx.fill();
                ctx.restore();
            });
        }
    }
}

// ========================= 远程攻击怪物类（新增，不影响原有近战功能） =========================
export class RangedEnemy extends Enemy {
    constructor(type, position, size = new Vector(50, 50), velocity = new Vector()) {
        super(type, position, size, velocity);
        
        // 远程怪物特有属性
        this.rangedConfig = this.config.rangedAttack;
        
        // 初始化远程攻击
        this.attack.ranged = new RangedAttack(this);
        this.attack.rangedCooldown = new Cooldown(this.rangedConfig.cooldown);
        this.attack.isRangedAttacking = false;
        
        // 覆盖基础属性
        this.baseState.attack.rangedDamage = this.rangedConfig.damage;
        this.state.attack.damage.ranged = this.rangedConfig.damage;
    }

    update(deltaTime) {
        this.updateState();
        const enemyCenter = this.hitbox.getCenter();
        const playerCenter = player.hitbox.getCenter();
        const horizontalDist = Math.abs(enemyCenter.x - playerCenter.x);
        const verticalDist = Math.abs(enemyCenter.y - playerCenter.y);
        const totalDist = Math.sqrt(horizontalDist **2 + verticalDist** 2);

        let shouldAttack = false;
        let lockOnMode = "patrol";

        // 冷却计时更新
        if (this.attack.cooldownTimer > 0) {
            this.attack.cooldownTimer -= deltaTime;
        }
        this.attack.rangedCooldown.tick(deltaTime);

        // 远程攻击判定逻辑
        if (verticalDist < 150 && totalDist <= this.rangedConfig.range) {
            lockOnMode = "attack";
            // 远程攻击条件：不在攻击中且冷却结束
            shouldAttack = !this.attack.isRangedAttacking && this.attack.rangedCooldown.ready();
        } else if (totalDist > this.rangedConfig.range && totalDist < this.rangedConfig.range + 200) {
            lockOnMode = "approach"; // 靠近目标
        }

        // 远程攻击处理
        const hasAttackAnim = this.config.hasAttackAnimation;
        if (hasAttackAnim) {
            if (shouldAttack && !this.attack.isRangedAttacking) {
                // 触发远程攻击
                this.triggerRangedAttack();
                this.attack.isRangedAttacking = true;
                this.attack.attackTimer = this.config.attack.duration;
                this.attack.rangedCooldown.reset();
            }
            if (this.attack.isRangedAttacking) {
                this.attack.attackTimer -= deltaTime;
                if (this.attack.attackTimer <= 0) {
                    this.attack.isRangedAttacking = false;
                }
            }
        } else {
            if (shouldAttack) {
                this.triggerRangedAttack();
                this.attack.rangedCooldown.reset();
            }
        }

        this.attack.ranged.update(deltaTime);
        this.updateMovement(lockOnMode);

        this.animation.setAttackState(this.attack.isRangedAttacking, this.facing);
        this.animation.update(deltaTime);
    }

    // 触发远程攻击
    triggerRangedAttack() {
        if (!this.attack.ranged) return;
        
        // 播放攻击音效
        soundManager.playSound('enemy', 'ranged_attack');
        
        // 计算方向
        const direction = this.hitbox.getCenter().x < player.hitbox.getCenter().x ? 1 : -1;
        
        // 触发远程攻击
        this.attack.ranged.trigger({
            direction: new Vector(direction, 0),
            speed: this.rangedConfig.projectileSpeed,
            damage: this.state.attack.damage.ranged
        });
    }

    // 重写移动逻辑，远程怪物保持距离
    updateMovement(lockOnMode) {
        const deltaFrame = 60 * (game.deltaTime || 16) / 1000;
        let move = 0;
        const enemyCenterX = this.hitbox.getCenter().x;
        const playerCenterX = player.hitbox.getCenter().x;
        const distance = Math.abs(enemyCenterX - playerCenterX);

        switch (lockOnMode) {
            case "attack":
                // 攻击模式：保持距离，面向玩家
                this.facing = enemyCenterX < playerCenterX ? 1 : -1;
                // 如果距离过近则后退
                if (distance < this.rangedConfig.range * 0.7) {
                    move = -this.facing * 0.2;
                } else if (distance > this.rangedConfig.range * 0.9) {
                    // 如果距离过远则前进
                    move = this.facing * 0.2;
                } else {
                    move = 0; // 保持在最佳攻击距离
                }
                break;
                
            case "approach":
                // 靠近模式：移动到攻击范围内
                this.facing = enemyCenterX < playerCenterX ? 1 : -1;
                move = this.facing * 0.25;
                break;
                
            default:
                // 巡逻模式
                if (Math.random() < 0.002) {
                    this.facing = Math.random() < 0.5 ? 1 : -1;
                }
                const nextX = this.hitbox.position.x + this.facing * 2;
                const testHitbox = new Hitbox(new Vector(nextX, this.hitbox.position.y), this.hitbox.size);
                const willHitWall = mapManager.getBlockHitboxes().some(block => testHitbox.checkHit(block));
                
                if (willHitWall || nextX < 0 || nextX > 1280) {
                    this.facing = -this.facing;
                }
                move = this.facing * 0.15; // 远程怪物巡逻速度稍慢
                break;
        }

        this.updateXY(deltaFrame, () => move, () => 0, true);
    }

    // 重写状态更新，包含远程攻击属性
    updateState() {
        super.updateState(); // 调用父类方法更新近战和HP属性
        const atk = AM.getAttrSum(Attrs.enemy.ATK);
        // 更新远程攻击伤害
        this.state.attack.damage.ranged = this.baseState.attack.rangedDamage * (1 + atk);
    }

    // 绘制远程攻击 projectile
    drawProjectiles(ctx) {
        if (this.attack.ranged && this.attack.ranged.projectiles) {
            this.attack.ranged.projectiles.forEach(projectile => {
                ctx.save();
                ctx.fillStyle = projectile.color || '#ff6600';
                ctx.beginPath();
                ctx.arc(
                    projectile.position.x, 
                    projectile.position.y, 
                    projectile.size || 5, 
                    0, 
                    Math.PI * 2
                );
                ctx.fill();
                ctx.restore();
            });
        }
    }

    // 重写绘制方法，添加远程攻击效果
    draw(ctx) {
        super.draw(ctx); // 绘制怪物本身
        this.drawProjectiles(ctx); // 绘制远程攻击 projectile
    }
}
