import { AttackBase } from "./AttackBase";
import { Vector } from "../../Utils/Vector";
import { EnemyProjectile } from "./EnemyProjectile";

/**
 * 敌人远程攻击类
 * 可配置攻击参数，支持自定义子弹属性
 */
export class EnemyRangedAttack extends AttackBase {
    constructor(owner, config = {}) {
        super(owner, "ranged");
        
        // 可配置的攻击参数
        this.config = {
            projectileSpeed: config.projectileSpeed || 8,
            projectileSize: config.projectileSize || new Vector(10, 10),
            projectileColor: config.projectileColor || '#ff6600',
            projectileShape: config.projectileShape || 'rectangle',
            damage: config.damage || 15,
            cooldown: config.cooldown || 2000,
            ...config
        };
        
        this.projectiles = [];
    }

    /**
     * 触发远程攻击
     * @param {Object} options - 攻击选项
     * @param {Vector} options.direction - 攻击方向
     * @param {number} options.speed - 子弹速度（可选，覆盖配置）
     * @param {number} options.damage - 伤害值（可选，覆盖配置）
     */
    trigger(options = {}) {
        const direction = options.direction || new Vector(this.owner.facing, 0);
        const speed = options.speed || this.config.projectileSpeed;
        const damage = options.damage || this.config.damage;
        
        // 计算子弹初始位置（从敌人中心发射）
        const startPos = this.owner.hitbox.getCenter();
        const velocity = new Vector(direction.x * speed, direction.y * speed);
        
        // 创建子弹
        new EnemyProjectile(
            startPos,
            velocity,
            damage,
            this,
            {
                color: this.config.projectileColor,
                shape: this.config.projectileShape,
                size: this.config.projectileSize,
                speed: speed
            }
        );
    }

    /**
     * 更新远程攻击状态
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        // 子弹的更新由EnemyProjectile自己处理
        // 这里可以添加一些额外的攻击逻辑
    }

    /**
     * 应用伤害到目标
     * @param {Entity} target - 目标实体
     * @param {number} damage - 伤害值
     */
    applyDamage(target, damage) {
        if (target && typeof target.takeDamage === 'function') {
            target.takeDamage(damage, 'ranged', this.owner);
        }
    }
}