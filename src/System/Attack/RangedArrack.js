import { AttackBase } from "./AttackBase";
import { Vector } from "../../Utils/Vector";
import { Projectile } from "./Projectile";

export class RangedAttack extends AttackBase {
    constructor(owner) {
        super(owner, "ranged");
    }

    onHit(owner, damage) {
        const speed = 12;
        const dirX = owner.facing;
        const pos = owner.hitbox.getCenter();

        new Projectile(pos, new Vector(speed * dirX, 0), damage, this);
    }
}
