import { EnemyBase } from "./EnemyBase";
import { EnemyAnimation } from "./EnemyAnimation";
import { Vector } from "../../Utils/Vector";
import { Hitbox } from "../../Utils/Hitbox";
import { mapManager } from "../../Manager/MapManager";
import { player } from "../Player";
import { MeleeAttack } from "../../System/Attack/MeleeAttack";

export class Enemy_1 extends EnemyBase {
    constructor(position, size = new Vector(50, 50), velocity = new Vector()) {
        super("1", position, size, velocity);
        this.animation = new EnemyAnimation(this.enemytype);

        this.baseState = {
            hp_max: 100,
            attack: {
                atk: 10,
                StartupTime: 50,
                RecoveryTime: 1500
            }
        };


        this.attack.attacker = new MeleeAttack(this, {
            getTargets: () => [player],
            getDamage: () => this.state.attack.damage,
            getStartupTime: () => this.state.attack.startupTime,
            getRecoveryTime: () => this.state.attack.recoveryTime,
        });
        this.attack.type = "melee";
    }

    updateAI(deltaTime) {
        this.control.cmd_move = 0;
        this.control.jumpTriggered = false;
        this.control.attackTriggered = false;
        let lockOnMode = "patrol";

        const enemyCenter = this.hitbox.getCenter();
        const playerCenter = player.hitbox.getCenter();
        const horizontalDist = Math.abs(enemyCenter.x - playerCenter.x);
        const verticalDist = Math.abs(enemyCenter.y - playerCenter.y);
        if (Math.abs(verticalDist) < 100 && horizontalDist < 400) {
            lockOnMode = "attack";
            this.control.attackTriggered = Math.random() < 0.15;
        }

        let move = 0;
        if (lockOnMode === "attack") {
            this.facing = this.hitbox.position.x < player.hitbox.position.x ? 1 : -1;
            move = this.facing * 0.3;
        } else {
            if (Math.random() < 0.002) {
                this.facing = Math.random() < 0.5 ? 1 : -1;
            }
            const nextX = this.hitbox.position.x + this.facing * 2;
            const testHitbox = new Hitbox(new Vector(nextX, this.hitbox.position.y), this.hitbox.size);
            const willHitWall = mapManager.getBlockHitboxes().some(block => testHitbox.checkHit(block));

            if (willHitWall || nextX < 0 || nextX > 1280) {
                this.facing = -this.facing;
            }
            move = this.facing * 0.2;
        }
        this.control.cmd_move = move;
    }

    updateAttack(deltaTime) {
        this.attack.attacker.update(deltaTime);
        if (this.control.attackTriggered) {
            this.attack.attacker.trigger();
        }
    }

    updateAnimation(deltaTime) {
        this.animation.setAttackState(this.attack.attacker.isAttacking);
        this.animation.update(deltaTime);
    }
}