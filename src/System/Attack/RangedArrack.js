import { AttackBase } from "./AttackBase";
import { Vector } from "../../Utils/Vector";
import { Projectile } from "./Projectile";

export class RangedAttack extends AttackBase {
    /**
     * 远程攻击类
     * @param {Entity} owner 攻击发出者
     * @param {Object} options 可配置选项
     * @param {Function} options.getDirection 获取发射方向的函数，默认根据角色朝向水平发射
     * @param {Function} options.getSpeed 获取子弹速度的函数，默认12
     * @param {Vector} options.projectileSize 子弹尺寸，默认(10,10)
     * @param {string} options.projectileColor 子弹颜色，默认黄色
     * @param {string} options.projectileShape 子弹形状，'rectangle' 或 'circle'，默认 'rectangle'
     */
    constructor(owner, options = { getDirection: null, getSpeed: null, projectileSize: null, projectileColor: 'yellow', projectileShape: 'rectangle' }) {
        super(owner, "ranged", options);

        this.getDirection = options.getDirection || (() => new Vector(this.owner.facing, 0));
        this.getSpeed = options.getSpeed || (() => 12);

        // 可配置的攻击参数
        this.config = {
            projectileSize: options.projectileSize || new Vector(10, 10),
            projectileColor: options.projectileColor,
            projectileShape: options.projectileShape,
        };
    }

    get direction() { return this.getDirection(); }
    get speed() { return this.getSpeed(); }

    onHit(owner, damage) {
        // 计算子弹初始位置
        const startPos = owner.hitbox.getCenter();
        const velocity = new Vector(this.direction.x * this.speed, this.direction.y * this.speed);

        // 创建子弹
        new Projectile(
            startPos,
            velocity,
            damage,
            this,
            {
                color: this.config.projectileColor,
                shape: this.config.projectileShape,
                size: this.config.projectileSize,
            }
        );
    }
}