import { EnemyBase } from "./EnemyBase";
import { EnemyAnimation } from "./EnemyAnimation";
import { Vector } from "../../Utils/Vector";
import { Hitbox } from "../../Utils/Hitbox";
import { mapManager } from "../../Manager/MapManager";
import { RangedAttack } from "../../System/Attack/RangedArrack";
import { player } from "../Player";
import { textureManager } from "../../Manager/TextureManager";

export class Enemy_2 extends EnemyBase {
    constructor(position, size = new Vector(50, 50), velocity = new Vector()) {
        super("2", position, size, velocity);
        this.animation = new Enemy_2_Animation();

        this.baseState = {
            hp_max: 40,
            attack: {
                atk: 12,
                StartupTime: 300,
                RecoveryTime: 2500
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
        this.attack.range = 700;
    }

    updateAI(deltaTime) {
        //玩家纵坐标与自己不大于50且没有遮挡时向玩家攻击。
        this.control.cmd_move = 0;
        this.control.jumpTriggered = false;
        this.control.attackTriggered = false;
        const enemyCenter = this.hitbox.getCenter();//敌人中心
        const playerCenter = player.hitbox.getCenter();//玩家中心
        const horizontalDist = Math.abs(enemyCenter.x - playerCenter.x);
        const verticalDist = Math.abs(enemyCenter.y - playerCenter.y);
        if (verticalDist <= 50 && horizontalDist < this.attack.range) {
            this.control.attackTriggered = true;
        }
        this.facing = this.hitbox.position.x < player.hitbox.position.x ? 1 : -1;
    }

    updateMove(deltaTime) {
        //不移动
        this.control.cmd_move = 0;
    }

    updateAttack(deltaTime) {
        this.attack.attacker.update(deltaTime);
        if (this.control.attackTriggered) {
            this.attack.attacker.trigger();
        }
    }

    updateAnimation(deltaTime) {
        //前摇开始时，播放攻击动画
        if (this.attack.attacker.isAttacking) {
            this.animation.setStatus("attack");
        }
        //否则保持待机动画
        else {
            this.animation.setStatus("stand");
        }
        this.animation.update(deltaTime);
    }
}

class Enemy_2_Animation {
    static Framerate = {
        "stand": 5,
        "attack": 5,
    };
    static Frames = {
        "stand": 12,
        "attack": 5
    };
    constructor() {
        this.status = "stand";
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
        const frameInterval = 1000 / Enemy_2_Animation.Framerate[this.status];

        if (this.frameRun > frameInterval) {
            this.frame++;
            this.frameRun = 0;
        }

        const maxFrame = Enemy_2_Animation.Frames[this.status];

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
        const hasFrames = Enemy_2_Animation.Frames && Enemy_2_Animation.Frames[this.status];
        const textureKey = hasFrames ? `${this.status}_${this.frame}` : "default";
        return textureManager.getTexture("enemy_2", textureKey);
    }
}