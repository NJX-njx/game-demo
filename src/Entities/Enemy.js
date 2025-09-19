import { Entity } from "./Entity";
import { Vector } from "../Utils/Vector";
import { Hitbox } from "../Utils/Hitbox";
import { MeleeAttack } from "../System/Attack/MeleeAttack";
import { game } from "../Game";
import { textureManager } from "../Manager/TextureManager";
import { player } from "./Player";
import { mapManager } from "../Manager/MapManager";
import { eventBus as bus, EventTypes as Events } from "../Manager/EventBus";
import { attributeManager as AM, AttributeTypes as Attrs } from "../Manager/AttributeManager";

// ========================= 怪物动画配置表 =========================
const EnemyAnimationConfigs = {
    "1": {
        defaultFrame: "1",
        hasAttackAnimation: false
    },
    "2": {
        defaultFrame: "2",
        hasAttackAnimation: false
    },
    // 霸凌者：调整动画时长以确保完整显示
    "balingzhe": {
        defaultFrame: "balingzhe_1",
        hasAttackAnimation: true,
        attack: {
            frames: 5,               // 保持帧数不变
            framerate: 8,            // 保持帧率不变
            duration: 1000,          // 延长动画时长（从500→1000ms）
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

// ========================= 怪物主类 =========================
export class Enemy extends Entity {
    constructor(type, position, size = new Vector(50, 50), velocity = new Vector()) {
        super(position, size, velocity);
        this.Size = size;
        this.type = "enemy" + type;
        this.enemytype = type;

        // 基础属性：增加攻击恢复时间，增大攻击间隔
        this.baseState = {
            hp_max: 100,                
            attack: {
                atk: 10,                
                MeleeStartupTime: 50,    
                MeleeRecoveryTime: 1500  // 延长攻击恢复时间（从900→1500ms）
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

        this.attack = {
            melee: new MeleeAttack(this),
            targetSelector: () => [player],
            isAttacking: false,
            attackTimer: 0,
            // 新增：攻击冷却计时器，控制攻击间隔
            cooldownTimer: 0,
            cooldownDuration: 2000  // 攻击冷却时间2秒
        };

        this.hurtBox = this.hitbox;
        this._unbind_list = [];
    }

    update(deltaTime) {
        this.updateState();
        const horizontalDist = Math.abs(this.hitbox.getCenter().x - player.hitbox.getCenter().x);
        const verticalDist = this.hitbox.getCenter().y - player.hitbox.getCenter().y;

        let shouldAttack = false;
        let lockOnMode = "patrol";

        // 攻击冷却计时
        if (this.attack.cooldownTimer > 0) {
            this.attack.cooldownTimer -= deltaTime;
        }

        // 锁敌与攻击判定
        if (Math.abs(verticalDist) < 100 && horizontalDist < 400) {
            lockOnMode = "attack";
            // 降低攻击概率（从0.4→0.15），减少攻击频率
            // 同时只有冷却结束后才能攻击
            shouldAttack = Math.random() < 0.15 && this.attack.cooldownTimer <= 0;
        }

        // 攻击处理
        const hasAttackAnim = EnemyAnimationConfigs[this.enemytype].hasAttackAnimation;
        if (hasAttackAnim) {
            if (shouldAttack && !this.attack.isAttacking) {
                this.attack.melee.trigger();
                this.attack.isAttacking = true;
                this.attack.attackTimer = EnemyAnimationConfigs[this.enemytype].attack.duration;
                // 触发攻击后立即开始冷却
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
                this.attack.melee.trigger();
                // 无动画怪物也添加冷却
                this.attack.cooldownTimer = this.attack.cooldownDuration;
            }
        }

        this.attack.melee.update(deltaTime);
        this.updateMovement(lockOnMode);

        this.animation.setAttackState(this.attack.isAttacking, this.facing);
        this.animation.update(deltaTime);
    }

    // 其他方法保持不变...
    updateMovement(lockOnMode) {
        const deltaFrame = 60 * (game.deltaTime || 16) / 1000;
        let move = 0;

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

        this.updateXY(deltaFrame, () => move, () => 0, true);
    }

    updateState() {
        const hp = AM.getAttrSum(Attrs.enemy.HP);
        const atk = AM.getAttrSum(Attrs.enemy.ATK);
        this.state.hp_max = this.baseState.hp_max * (1 + hp);
        this.state.hp = Math.min(this.state.hp, this.state.hp_max);
        this.state.attack.damage.melee = this.baseState.attack.atk * (1 + atk);
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
    }
}
    