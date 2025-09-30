import { EnemyBase } from "./EnemyBase";
import { EnemyAnimation } from "./EnemyAnimation";
import { Vector } from "../../Utils/Vector";
import { Hitbox } from "../../Utils/Hitbox";
import { mapManager } from "../../Manager/MapManager";
import { RangedAttack } from "../../System/Attack/RangedArrack";
import { player } from "../Player";

export class Enemy_2 extends EnemyBase {
    constructor(position, size = new Vector(50, 50), velocity = new Vector()) {
        super("2", position, size, velocity);
        this.animation = new EnemyAnimation(this.enemytype);

        this.baseState = {
            hp_max: 100,
            attack: {
                atk: 10,
                StartupTime: 50,
                RecoveryTime: 1500
            }
        };

        this.attack.attacker = new RangedAttack(this, {
            getTargets: () => [player],
            getDamage: () => this.state.attack.damage,
            getStartupTime: () => this.state.attack.startupTime,
            getRecoveryTime: () => this.state.attack.recoveryTime,

            getSpeed: () => 6,
            getDirection: () => new Vector(this.hitbox.getCenter().x < player.hitbox.getCenter().x ? 1 : -1, 0),
            projectileColor: '#ff4444',
            projectileSize: new Vector(8, 8),
            projectileShape: 'rectangle'
        });
        this.attack.type = "ranged";
        this.attack.range = 500;
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
        const totalDist = Math.sqrt(horizontalDist ** 2 + verticalDist ** 2);
        if (verticalDist < 150 && totalDist <= this.attack.range) {
            lockOnMode = "attack";
            this.control.attackTriggered = true;
        } else if (totalDist > this.attack.range && totalDist < this.attack.range + 200) {
            lockOnMode = "approach"; // 靠近目标
        }

        let move = 0;
        const enemyCenterX = this.hitbox.getCenter().x;
        const playerCenterX = player.hitbox.getCenter().x;
        const distance = Math.abs(enemyCenterX - playerCenterX);
        switch (lockOnMode) {
            case "attack":
                // 攻击模式：保持距离，面向玩家
                this.facing = enemyCenterX < playerCenterX ? 1 : -1;
                // 如果距离过近则后退
                if (distance < this.attack.range * 0.7) {
                    move = -this.facing * 0.2;
                } else if (distance > this.attack.range * 0.9) {
                    // 如果距离过远则前进
                    move = this.facing * 0.2;
                } else {
                    move = 0; // 保持在最佳攻击距离
                }
                break;

            case "approach":
                // 靠近模式：移动到攻击范围内
                this.facing = enemyCenterX < playerCenterX ? 1 : -1;
                move = this.facing * 0.25;
                break;

            default:
                // 巡逻模式
                if (Math.random() < 0.002) {
                    this.facing = Math.random() < 0.5 ? 1 : -1;
                }
                const nextX = this.hitbox.position.x + this.facing * 2;
                const testHitbox = new Hitbox(new Vector(nextX, this.hitbox.position.y), this.hitbox.size);
                const willHitWall = mapManager.getBlockHitboxes().some(block => testHitbox.checkHit(block));

                if (willHitWall || nextX < 0 || nextX > 1280) {
                    this.facing = -this.facing;
                }
                move = this.facing * 0.15; // 远程怪物巡逻速度稍慢
                break;
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