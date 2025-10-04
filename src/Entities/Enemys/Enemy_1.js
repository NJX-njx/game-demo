import { EnemyBase } from "./EnemyBase";
import { Vector } from "../../Utils/Vector";
import { Hitbox } from "../../Utils/Hitbox";
import { mapManager } from "../../Manager/MapManager";
import { player } from "../Player";
import { MeleeAttack } from "../../System/Attack/MeleeAttack";
import { textureManager } from "../../Manager/TextureManager";

export class Enemy_1 extends EnemyBase {
    constructor(position, size = new Vector(50, 50), velocity = new Vector()) {
        super("1", position, size, velocity);
        this.animation = new Enemy_1_Animation();

        this.baseState = {
            hp_max: 100,
            attack: {
                atk: 10,
                StartupTime: 500,
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
        Enemy_1_Animation.Framerate["attack"] = Enemy_1_Animation.Frames["attack"] / (this.state.attack.startupTime / 1000);
        Enemy_1_Animation.Framerate["attack_recover"] = Enemy_1_Animation.Frames["attack_recover"] / (this.state.attack.startupTime / 1000);


        //前摇开始时，播放攻击动画
        if (this.attack.attacker.isAttacking) {
            this.animation.setStatus("attack");
        }
        //攻击结束后，播放后摇动画，帧率与前摇动画帧率相同
        if (this.attack.attacker.isAttacking && this.attack.attacker.isInRecovery) {
            this.animation.setStatus("attack_recover");
        }
        //非攻击状态，播放默认动画
        if (!this.attack.attacker.isAttacking) {
            this.animation.setStatus("default");
        }
        this.animation.update(deltaTime);
    }
}

class Enemy_1_Animation {
    static Framerate = {
        "attack": 5,
        "attack_recover": 5,
    };
    static Frames = {
        "attack": 4,
        "attack_recover": 1,
    };
    constructor() {
        this.status = "default";
        this.frame = 1;
        this.frameRun = 0;
    }

    setStatus(status) {
        if (status != this.status) {
            this.frame = 1;
            this.frameRun = 0;
            this.status = status;
        }
    }

    update(deltaTime) {
        this.frameRun += deltaTime;
        const frameInterval = 1000 / Enemy_1_Animation.Framerate[this.status];

        if (this.frameRun > frameInterval) {
            this.frame++;
            this.frameRun = 0;
        }

        const maxFrame = Enemy_1_Animation.Frames[this.status];

        if (this.frame > maxFrame) {
            switch (this.status) {
                default:
                    this.frame = maxFrame;
                    break;
            }
        } else if (this.frame < 1) {
            this.frame = 1;
        }
    }
    getFrame() {
        const hasFrames = Enemy_1_Animation.Frames && Enemy_1_Animation.Frames[this.status];
        const textureKey = hasFrames ? `${this.status}_${this.frame}` : "default";
        return textureManager.getTexture("enemy_1", textureKey);
    }
}