import { AttackBase } from "./AttackBase";
import { Hitbox } from "../../Utils/Hitbox";
import { Vector } from "../../Utils/Vector";
export class MeleeAttack extends AttackBase {
    constructor(owner) {
        super(owner, "melee")
    }
    onHit(owner, damage) {
        const facing = owner.facing;
        const offset = facing > 0 ? owner.hitbox.size.x / 2 : -owner.hitbox.size.x / 2;
        const pos = owner.hitbox.position.addVector(new Vector(offset, owner.hitbox.size.y * 0.25));
        const size = new Vector(owner.hitbox.size.x * 0.8, owner.hitbox.size.y * 0.5);
        const attackBox = new Hitbox(pos, size);
        this.targetSelector().forEach(target => {
            if (attackBox.checkHit(target.hurtBox)) {
                target.takeDamage(damage);
            }
        });
    }
}