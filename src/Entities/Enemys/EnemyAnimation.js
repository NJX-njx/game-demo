import { textureManager } from "../../Manager/TextureManager";
// ========================= 怪物动画配置表 =========================
export const EnemyAnimationConfigs = {
    "1": {
        defaultFrame: "1",
        hasAttackAnimation: false,
        attackType: "ranged",
    },
    "2": {
        defaultFrame: "2",
        hasAttackAnimation: false,
        attackType: "melee"
    },
    // 霸凌者：近战
    "balingzhe": {
        defaultFrame: "balingzhe_1",
        hasAttackAnimation: true,
        attackType: "melee",
        attack: {
            frames: 5,
            framerate: 8,
            duration: 1000,
            framePrefix: "balingzhe_attack_"
        }
    }
};

// ========================= 动画类 =========================
export class EnemyAnimation {
    constructor(enemyType) {
        this.config = EnemyAnimationConfigs[enemyType] || EnemyAnimationConfigs["1"];
        this.enemyType = enemyType;

        this.isAttacking = false;
        this.attackFrame = 1;
        this.frameTimer = 0;
        this.attackEndTime = 0;
    }

    setAttackState(isAttacking) {
        if (this.config.hasAttackAnimation && isAttacking) {
            this.isAttacking = true;
            this.attackFrame = 1;
            this.frameTimer = 0;
            this.attackEndTime = Date.now() + this.config.attack.duration;
        } else if (Date.now() >= this.attackEndTime) {
            this.isAttacking = false;
        }
    }

    update(deltaTime) {
        if (!this.isAttacking || !this.config.hasAttackAnimation) return;

        const frameInterval = 1000 / this.config.attack.framerate;
        this.frameTimer += deltaTime;

        while (this.frameTimer >= frameInterval) {
            this.attackFrame++;
            this.frameTimer -= frameInterval;
            if (this.attackFrame > this.config.attack.frames) {
                this.attackFrame = 1;
            }
        }
    }

    getFrame() {
        if (this.isAttacking && this.config.hasAttackAnimation) {
            const attackFrameId = `${this.config.attack.framePrefix}${this.attackFrame}`;
            return textureManager.getTexture("enemy", attackFrameId)
                || textureManager.getTexture("enemy", this.config.defaultFrame);
        }
        return textureManager.getTexture("enemy", this.config.defaultFrame);
    }
}