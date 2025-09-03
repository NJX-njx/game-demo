import { Entity } from "../../Entities/Entity";
import { Vector } from "../../Utils/Vector";
export class Projectile extends Entity {
    constructor(position, velocity, damage, targetSelector, size = new Vector(10, 10)) {
        super(position, size, velocity);
        this.type = "projectile";
        this.damage = damage;
        this.alive = true;
        this.hurtBox = this.hitbox;
        this.targetSelector = targetSelector;
        window.$game.projectilesManager.add(this);
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
        this.targetSelector().forEach(target => {
            if (this.hurtBox.checkHit(target.hurtBox)) {
                target.takeDamage(this.damage);
                this.alive = false;
            }
        });
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.fillStyle = "yellow";
        ctx.fillRect(this.hitbox.position.x, this.hitbox.position.y, this.hitbox.size.x, this.hitbox.size.y);
    }
}
