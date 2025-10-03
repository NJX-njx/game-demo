import { Entity } from "../../Entities/Entity";
import { player } from "../../Entities/Player";
import { Vector } from "../../Utils/Vector";
import { talentManager } from "../Talent/TalentManager";
import { AttackBase } from "./AttackBase";
import { projectilesManager } from "./ProjectilesManager";

export class Projectile extends Entity {
    /**
     * 创建一个子弹实体
     * @param {Vector} position 生成位置
     * @param {Vector} velocity 速度
     * @param {number} damage 伤害值
     * @param {AttackBase} from 发射该子弹的攻击实例
     * @param {Object} config 可配置参数
     * @param {string} config.color 颜色，默认黄色
     * @param {string} config.shape 形状，'rectangle' 或 'circle'，默认 'rectangle'
     * @param {Vector} config.size 大小，默认 (10,10)
     */
    constructor(position, velocity, damage, from, config = { color: 'yellow', shape: 'rectangle', size: new Vector(10, 10) }) {
        super(position, config.size, velocity);
        this.type = "enemy_projectile";
        this.damage = damage;
        this.alive = true;
        this.from = from;
        this.owner = from.owner;

        // 可配置的子弹属性
        this.color = config.color; // 默认黄色
        this.shape = config.shape; // 'rectangle' 或 'circle'

        this.bouncedTimes = 0; // 已反弹次数

        projectilesManager.add(this);
    }

    update(deltaTime) {
        if (!this.alive) return;

        // 刚体移动 + 碰撞检测
        const beginPosition = this.hitbox.position.copy();
        const deltaFrame = 60 * deltaTime / 1000;
        const side = this.rigidMove(deltaFrame);
        if (side) {
            if (this.owner === player) {
                //如果弹幕来自玩家且携带天赋“直面”或“凝神”，则允许弹幕反弹
                let maxBounced = 0;
                if (talentManager.hasTalentLevel('直面', 1)) maxBounced += 1;
                if (talentManager.hasTalentLevel('凝神', 1)) maxBounced += 1;

                if (this.bouncedTimes < maxBounced) {
                    this.bouncedTimes++;

                    if (side & 1) {
                        this.velocity.x = -this.velocity.x;
                        // 反弹后将子弹推出墙面，防止连续检测
                        this.hitbox.position.x += Math.sign(this.velocity.x) * 2;
                    }
                    if (side & 2) {
                        this.velocity.y = -this.velocity.y;
                        this.hitbox.position.y += Math.sign(this.velocity.y) * 2;
                    }

                    return;
                }
            }

            this.alive = false;
            return;
        }

        // 命中检测
        this.from.targets.forEach(target => {
            if (this.hitbox.checkMovingHit(target.hurtBox, beginPosition, this.hitbox.position)) {
                this.from.applyDamage(target, this.damage);
                if (!(this.owner === player && talentManager.hasTalentLevel('专注', 1))) {
                    // 如果弹幕来自玩家且携带天赋“专注”，则允许弹幕穿透
                    this.alive = false;
                }
            }
        });
    }

    draw(ctx) {
        if (!this.alive) return;

        ctx.save();
        ctx.fillStyle = this.color;

        if (this.shape === 'circle') {
            // 圆形子弹
            const centerX = this.hitbox.position.x + this.hitbox.size.x / 2;
            const centerY = this.hitbox.position.y + this.hitbox.size.y / 2;
            const radius = Math.min(this.hitbox.size.x, this.hitbox.size.y) / 2;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 矩形子弹（默认）
            ctx.fillRect(
                this.hitbox.position.x,
                this.hitbox.position.y,
                this.hitbox.size.x,
                this.hitbox.size.y
            );
        }

        ctx.restore();
    }

}