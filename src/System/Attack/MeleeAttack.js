import { AttackBase } from "./AttackBase";
import { Hitbox } from "../../Utils/Hitbox";
import { Vector } from "../../Utils/Vector";
import { talentManager } from "../Talent/TalentManager";
import { itemManager } from "../Item/ItemManager";

export class MeleeAttack extends AttackBase {
    constructor(owner, options = {}) {
        super(owner, "melee", options);
    }

    onHit(owner, damage) {
        const facing = owner.facing;
        const offset = facing > 0 ? owner.hitbox.size.x / 2 : -owner.hitbox.size.x / 2;
        const pos = owner.hitbox.position.addVector(new Vector(offset, owner.hitbox.size.y * 0.25));
        // 基础判定比例
        const baseW = 0.8;
        const baseH = 0.5;
        // 额外增幅：每个来源增加 0.15（可叠加）
        let extra = 0;

        // 道具按持有数量叠加（道具名为 "共情"）
        extra += (itemManager.countItem('共情') || 0) * 0.15;
        extra += talentManager.hasTalentLevel('热烈', 1) ? 0.15 : 0;
        const size = new Vector(owner.hitbox.size.x * (baseW + extra), owner.hitbox.size.y * (baseH + extra));
        const attackBox = new Hitbox(pos, size);

        this.targets.forEach(target => {
            if (attackBox.checkHit(target.hurtBox)) {
                this.applyDamage(target, damage);
            }
        });
    }
}
