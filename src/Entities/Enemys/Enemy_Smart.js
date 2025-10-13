import { EnemyBase } from "./EnemyBase";
import { Vector } from "../../Utils/Vector";
import { MeleeAttack } from "../../System/Attack/MeleeAttack";
import { textureManager } from "../../Manager/TextureManager";
import { player } from "../Player";
import { addEnhancedAI, AIBehaviorStrategy } from "../../Manager/EnhancedEnemyAI";

/**
 * 智能敌人动画类
 */
class Enemy_Smart_Animation {
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
        const frameInterval = 1000 / Enemy_Smart_Animation.Framerate[this.status];

        if (this.frameRun > frameInterval) {
            this.frame++;
            this.frameRun = 0;
        }

        const maxFrame = Enemy_Smart_Animation.Frames[this.status];

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
        const hasFrames = Enemy_Smart_Animation.Frames && Enemy_Smart_Animation.Frames[this.status];
        const textureKey = hasFrames ? `${this.status}_${this.frame}` : "default";
        // 回退到 enemy_1 的纹理（作为示例）
        return textureManager.getTexture("enemy_1", textureKey);
    }
}

/**
 * Enemy_Smart - 使用增强AI的智能敌人
 * 
 * 这是一个示例敌人类，展示如何使用EnhancedEnemyAI系统
 * 
 * 特点：
 * - 使用战术AI策略（可根据需要更改）
 * - 自动根据AI管理器的难度设置调整行为
 * - 支持多种智能决策（追击、攻击、撤退等）
 * - 不需要手动实现updateAI方法
 */
export class Enemy_Smart extends EnemyBase {
    constructor(position, size = new Vector(50, 50), velocity = new Vector()) {
        super("smart", position, size, velocity);
        this.animation = new Enemy_Smart_Animation();

        // 设置基础属性
        this.baseState = {
            hp_max: 120,  // 比普通敌人稍强
            attack: {
                atk: 12,
                StartupTime: 500,
                RecoveryTime: 1500
            }
        };

        // 配置攻击系统
        this.attack.attacker = new MeleeAttack(this, {
            getTargets: () => [player],
            getDamage: () => this.state.attack.damage,
            getStartupTime: () => this.state.attack.startupTime,
            getRecoveryTime: () => this.state.attack.recoveryTime,
        });
        this.attack.type = "melee";

        // 添加增强AI - 使用战术策略
        // 可选策略：
        // - AIBehaviorStrategy.AGGRESSIVE: 激进型
        // - AIBehaviorStrategy.DEFENSIVE: 防御型
        // - AIBehaviorStrategy.TACTICAL: 战术型（推荐）
        // - AIBehaviorStrategy.ADAPTIVE: 自适应型
        addEnhancedAI(this, { 
            strategy: AIBehaviorStrategy.TACTICAL 
        });

        console.log('智能敌人已创建，使用增强AI系统');
    }

    // updateAI方法已被EnhancedEnemyAI自动替换，不需要手动实现
    // updateAI(deltaTime) { ... }

    updateAttack(deltaTime) {
        this.attack.attacker.update(deltaTime);
        if (this.control.attackTriggered) {
            this.attack.attacker.trigger();
        }
    }

    updateAnimation(deltaTime) {
        Enemy_Smart_Animation.Framerate["attack"] = Enemy_Smart_Animation.Frames["attack"] / (this.state.attack.startupTime / 1000);
        Enemy_Smart_Animation.Framerate["attack_recover"] = Enemy_Smart_Animation.Frames["attack_recover"] / (this.state.attack.startupTime / 1000);

        // 前摇开始时，播放攻击动画
        if (this.attack.attacker.isAttacking) {
            this.animation.setStatus("attack");
        }
        // 攻击结束后，播放后摇动画
        if (this.attack.attacker.isAttacking && this.attack.attacker.isInRecovery) {
            this.animation.setStatus("attack_recover");
        }
        // 非攻击状态，播放默认动画
        if (!this.attack.attacker.isAttacking) {
            this.animation.setStatus("default");
        }
        this.animation.update(deltaTime);
    }

    // 可选：获取AI调试信息
    getAIDebugInfo() {
        if (this._enhancedAI) {
            return this._enhancedAI.getDebugInfo();
        }
        return null;
    }

    // 可选：动态切换AI策略
    setAIStrategy(strategy) {
        if (this._enhancedAI) {
            this._enhancedAI.setStrategy(strategy);
            console.log(`敌人AI策略已切换为: ${strategy}`);
        }
    }
}

/**
 * 使用示例：
 * 
 * // 在地图中创建智能敌人
 * import { Enemy_Smart } from "./Entities/Enemys/Enemy_Smart";
 * 
 * const smartEnemy = new Enemy_Smart(new Vector(100, 100));
 * game.enemies.push(smartEnemy);
 * 
 * // 可选：动态切换策略
 * smartEnemy.setAIStrategy(AIBehaviorStrategy.AGGRESSIVE);
 * 
 * // 可选：查看AI状态（调试用）
 * console.log(smartEnemy.getAIDebugInfo());
 */
