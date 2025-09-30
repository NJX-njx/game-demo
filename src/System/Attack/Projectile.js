import { Entity } from "../../Entities/Entity";
import { Vector } from "../../Utils/Vector";
import { projectilesManager } from "./ProjectilesManager";

export class Projectile extends Entity {
    constructor(position, velocity, damage, from, config = { color: 'yellow', shape: 'rectangle', size: new Vector(10, 10) }) {
        super(position, config.size, velocity);
        this.type = "enemy_projectile";
        this.damage = damage;
        this.alive = true;
        this.hurtBox = this.hitbox;
        this.from = from;

        // 可配置的子弹属性
        this.color = config.color; // 默认黄色
        this.shape = config.shape; // 'rectangle' 或 'circle'

        projectilesManager.add(this);
    }

    update(deltaTime) {
        if (!this.alive) return;

        // 刚体移动 + 碰撞检测
        const deltaFrame = 60 * deltaTime / 1000;
        const side = this.rigidMove(deltaFrame);
        if (side) {
            this.alive = false;
            return;
        }

        // 命中检测
        this.from.targets.forEach(target => {
            if (this.hurtBox.checkHit(target.hurtBox)) {
                this.from.applyDamage(target, this.damage);
                this.alive = false;
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