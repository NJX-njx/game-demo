import { Entity } from "./Entity";
import { Vector } from "../Utils/Vector";
import { Duration } from "../Utils/Duration";

export class Decoy extends Entity {
    /**
     * @param {Vector} position
     * @param {Vector} size
     * @param {object} owner  // 通常为 player
     * @param {number} durationMs
     */
    constructor(position, size, owner, durationMs = 4000, image = null) {
        if (owner._decoy) return owner._decoy;
        super(position, size, new Vector());
        this.type = 'decoy';
        this.owner = owner;
        this._destroyTimer = new Duration(durationMs);
        this._destroyTimer.start();
        this.image = image;
    }

    takeDamage(dmg, attackType = null, attacker = null) {
        this.destroy();
    }

    destroy() {
        this.owner._decoy = null;
    }

    update(deltaTime) {
        this._destroyTimer.tick(deltaTime);
        if (this._destroyTimer.finished())
            this.destroy();
    }

    draw(ctx) {
        if (this.image === null) {
            console.warn("Decoy has no image to draw.", this);
            ctx.save();
            ctx.fillStyle = 'rgba(100, 100, 100, 0.6)';
            ctx.fillRect(this.hitbox.position.x, this.hitbox.position.y, this.size.x, this.size.y);
            ctx.restore();
        }
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.drawImage(this.image, this.hitbox.position.x, this.hitbox.position.y, this.size.x, this.size.y);
        ctx.restore();
    }
}
