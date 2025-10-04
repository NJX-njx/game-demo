import { EnemyBase } from "./EnemyBase";
import { EnemyAnimation } from "./EnemyAnimation";
import { Vector } from "../../Utils/Vector";
import { Hitbox } from "../../Utils/Hitbox";
import { mapManager } from "../../Manager/MapManager";
import { RangedAttack } from "../../System/Attack/RangedArrack";
import { textureManager } from "../../Manager/TextureManager";
import { player } from "../../Entities/Player";
import { attributeManager as AM, AttributeTypes as Attrs } from "../../Manager/AttributeManager";
export class Enemy_3 extends EnemyBase {
    constructor(position, size = new Vector(60, 60), velocity = new Vector()) {
        super("3", position, size, velocity);

        this.baseState = {
            hp_max: 80
        };
        //没有动画，只有贴图
        this.animation = null;
        
        //不攻击
        this.attack.attacker = null;
        this.attack.type = "none";
        
    }

    updateAI(deltaTime) {
        //不移动，但受到重力影响
        this.control.cmd_move = 0;
        this.control.jumpTriggered = false;
        this.control.attackTriggered = false;
        //在场时，降低玩家60%攻击力，不叠加
        AM.addAttr(Attrs.player.ATK, -0.6, this, 100, 1);
    }
}