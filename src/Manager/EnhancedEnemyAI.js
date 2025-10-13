/**
 * EnhancedEnemyAI - 增强的敌人AI行为系统
 * 提供多种AI行为策略和智能决策能力
 */

import { Vector } from "../Utils/Vector";
import { Hitbox } from "../Utils/Hitbox";
import { mapManager } from "./MapManager";
import { player } from "../Entities/Player";
import { aiManager, AIBehaviorStrategy } from "./AIManager";

// 重新导出 AIBehaviorStrategy 以便其他模块使用
export { AIBehaviorStrategy } from "./AIManager";

/**
 * 增强的敌人AI类
 * 可被敌人实体使用以获得更智能的行为
 */
export class EnhancedEnemyAI {
    constructor(enemy, options = {}) {
        this.enemy = enemy;
        this.strategy = options.strategy || AIBehaviorStrategy.TACTICAL;
        
        // AI状态
        this.state = {
            currentAction: "patrol",    // patrol, chase, attack, retreat
            targetPosition: null,
            lastDecisionTime: 0,
            decisionCooldown: 1000,     // 决策冷却时间（毫秒）
            alertLevel: 0,              // 警戒等级 0-1
            memory: {
                lastPlayerPosition: null,
                lastSeenTime: 0,
                damageReceived: 0
            }
        };

        // 从AI管理器获取行为参数
        this.params = aiManager.getEnemyAIParams(this.strategy);
        
        console.log(`敌人AI初始化 - 策略: ${this.strategy}`);
    }

    /**
     * 更新AI行为
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        // 更新AI参数（支持动态难度）
        this.params = aiManager.getEnemyAIParams(this.strategy);

        // 感知环境
        this.perceive();

        // 决策
        if (performance.now() - this.state.lastDecisionTime > this.params.decisionQuality * this.state.decisionCooldown) {
            this.makeDecision();
            this.state.lastDecisionTime = performance.now();
        }

        // 执行当前动作
        this.executeAction(deltaTime);
    }

    /**
     * 感知环境 - 检测玩家位置、威胁等
     */
    perceive() {
        const enemyCenter = this.enemy.hitbox.getCenter();
        const playerCenter = player.hitbox.getCenter();
        const horizontalDist = Math.abs(enemyCenter.x - playerCenter.x);
        const verticalDist = Math.abs(enemyCenter.y - playerCenter.y);
        const totalDist = Math.sqrt(horizontalDist * horizontalDist + verticalDist * verticalDist);

        // 检测玩家是否在视野内
        const canSeePlayer = verticalDist < 100 && horizontalDist < this.params.pursuitRange;

        if (canSeePlayer) {
            this.state.memory.lastPlayerPosition = playerCenter.clone();
            this.state.memory.lastSeenTime = performance.now();
            this.state.alertLevel = Math.min(1, this.state.alertLevel + 0.1);
        } else {
            // 失去视野，警戒等级下降
            this.state.alertLevel = Math.max(0, this.state.alertLevel - 0.05);
        }

        // 存储距离信息
        this.distanceToPlayer = totalDist;
        this.horizontalDistToPlayer = horizontalDist;
        this.verticalDistToPlayer = verticalDist;
        this.canSeePlayer = canSeePlayer;
    }

    /**
     * 决策 - 根据当前状态和策略决定下一步行动
     */
    makeDecision() {
        const healthPercent = this.enemy.state.hp / this.enemy.state.hp_max;

        // 根据不同策略做出决策
        switch (this.strategy) {
            case AIBehaviorStrategy.AGGRESSIVE:
                this._aggressiveDecision(healthPercent);
                break;
            
            case AIBehaviorStrategy.DEFENSIVE:
                this._defensiveDecision(healthPercent);
                break;
            
            case AIBehaviorStrategy.TACTICAL:
                this._tacticalDecision(healthPercent);
                break;
            
            case AIBehaviorStrategy.ADAPTIVE:
                this._adaptiveDecision(healthPercent);
                break;
            
            default:
                this._tacticalDecision(healthPercent);
        }
    }

    /**
     * 激进策略决策
     */
    _aggressiveDecision(healthPercent) {
        if (this.canSeePlayer) {
            if (this.horizontalDistToPlayer < 80) {
                this.state.currentAction = "attack";
            } else {
                this.state.currentAction = "chase";
            }
        } else if (this.state.memory.lastPlayerPosition) {
            // 即使看不见也会追击到最后已知位置
            this.state.currentAction = "chase";
        } else {
            this.state.currentAction = "patrol";
        }
    }

    /**
     * 防御策略决策
     */
    _defensiveDecision(healthPercent) {
        if (healthPercent < 0.3) {
            this.state.currentAction = "retreat";
        } else if (this.canSeePlayer) {
            if (this.horizontalDistToPlayer < 150) {
                // 保持一定距离
                if (this.horizontalDistToPlayer < 80) {
                    this.state.currentAction = "retreat";
                } else {
                    this.state.currentAction = "attack";
                }
            } else {
                this.state.currentAction = "chase";
            }
        } else {
            this.state.currentAction = "patrol";
        }
    }

    /**
     * 战术策略决策
     */
    _tacticalDecision(healthPercent) {
        if (healthPercent < 0.25) {
            // 血量过低，撤退
            this.state.currentAction = "retreat";
        } else if (this.canSeePlayer) {
            const playerHealthPercent = player.state.hp / player.state.hp_max;
            
            // 根据双方血量做决策
            if (healthPercent > playerHealthPercent * 1.5) {
                // 我方优势，激进
                this.state.currentAction = this.horizontalDistToPlayer < 80 ? "attack" : "chase";
            } else if (healthPercent < playerHealthPercent * 0.7) {
                // 我方劣势，保守
                if (this.horizontalDistToPlayer < 100) {
                    this.state.currentAction = "retreat";
                } else {
                    this.state.currentAction = "patrol";
                }
            } else {
                // 势均力敌，正常战斗
                this.state.currentAction = this.horizontalDistToPlayer < 80 ? "attack" : "chase";
            }
        } else {
            this.state.currentAction = "patrol";
        }
    }

    /**
     * 自适应策略决策
     */
    _adaptiveDecision(healthPercent) {
        // 根据玩家表现调整策略
        const playerPerformance = aiManager.getPlayerPerformanceAssessment();
        
        if (playerPerformance.score > 0.7) {
            // 玩家很强，采用更谨慎的战术
            this._defensiveDecision(healthPercent);
        } else if (playerPerformance.score < 0.3) {
            // 玩家较弱，采用激进策略
            this._aggressiveDecision(healthPercent);
        } else {
            // 正常战术
            this._tacticalDecision(healthPercent);
        }
    }

    /**
     * 执行当前动作
     * @param {number} deltaTime 
     */
    executeAction(deltaTime) {
        // 重置控制
        this.enemy.control.cmd_move = 0;
        this.enemy.control.jumpTriggered = false;
        this.enemy.control.attackTriggered = false;

        switch (this.state.currentAction) {
            case "patrol":
                this._executePatrol();
                break;
            
            case "chase":
                this._executeChase();
                break;
            
            case "attack":
                this._executeAttack();
                break;
            
            case "retreat":
                this._executeRetreat();
                break;
        }
    }

    /**
     * 执行巡逻
     */
    _executePatrol() {
        // 随机改变方向
        if (Math.random() < 0.002 / this.params.reactionTime) {
            this.enemy.facing = Math.random() < 0.5 ? 1 : -1;
        }

        // 检测前方是否有墙
        const nextX = this.enemy.hitbox.position.x + this.enemy.facing * 2;
        const testHitbox = new Hitbox(
            new Vector(nextX, this.enemy.hitbox.position.y), 
            this.enemy.hitbox.size
        );
        const willHitWall = mapManager.getBlockHitboxes().some(block => testHitbox.checkHit(block));

        if (willHitWall || nextX < 0 || nextX > 1280) {
            this.enemy.facing = -this.enemy.facing;
        }

        this.enemy.control.cmd_move = this.enemy.facing * this.params.patrolSpeed;
    }

    /**
     * 执行追击
     */
    _executeChase() {
        const targetPos = this.state.memory.lastPlayerPosition || player.hitbox.getCenter();
        this.enemy.facing = this.enemy.hitbox.position.x < targetPos.x ? 1 : -1;
        this.enemy.control.cmd_move = this.enemy.facing * this.params.attackSpeed;

        // 如果足够接近，尝试攻击
        if (this.horizontalDistToPlayer < 100) {
            // 根据AI参数调整攻击频率
            const attackChance = 0.15 * this.params.attackFrequency / this.params.reactionTime;
            this.enemy.control.attackTriggered = Math.random() < attackChance;
        }
    }

    /**
     * 执行攻击
     */
    _executeAttack() {
        // 面向玩家
        this.enemy.facing = this.enemy.hitbox.position.x < player.hitbox.position.x ? 1 : -1;
        
        // 微调位置
        const distToIdealRange = 60; // 理想攻击距离
        if (this.horizontalDistToPlayer > distToIdealRange + 20) {
            this.enemy.control.cmd_move = this.enemy.facing * this.params.attackSpeed;
        } else if (this.horizontalDistToPlayer < distToIdealRange - 20) {
            this.enemy.control.cmd_move = -this.enemy.facing * this.params.patrolSpeed;
        }

        // 发起攻击
        const attackChance = 0.15 * this.params.attackFrequency / this.params.reactionTime;
        this.enemy.control.attackTriggered = Math.random() < attackChance;
    }

    /**
     * 执行撤退
     */
    _executeRetreat() {
        // 远离玩家
        this.enemy.facing = this.enemy.hitbox.position.x < player.hitbox.position.x ? -1 : 1;
        this.enemy.control.cmd_move = this.enemy.facing * this.params.attackSpeed * 1.2;

        // 检测后方是否有墙
        const nextX = this.enemy.hitbox.position.x + this.enemy.facing * 2;
        const testHitbox = new Hitbox(
            new Vector(nextX, this.enemy.hitbox.position.y), 
            this.enemy.hitbox.size
        );
        const willHitWall = mapManager.getBlockHitboxes().some(block => testHitbox.checkHit(block));

        if (willHitWall || nextX < 0 || nextX > 1280) {
            // 无路可退，转而攻击
            this.state.currentAction = "attack";
        }
    }

    /**
     * 切换策略
     * @param {string} strategy 
     */
    setStrategy(strategy) {
        if (Object.values(AIBehaviorStrategy).includes(strategy)) {
            this.strategy = strategy;
            this.params = aiManager.getEnemyAIParams(this.strategy);
            console.log(`敌人AI策略切换为: ${strategy}`);
        }
    }

    /**
     * 获取当前状态信息（用于调试）
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            strategy: this.strategy,
            currentAction: this.state.currentAction,
            alertLevel: this.state.alertLevel.toFixed(2),
            canSeePlayer: this.canSeePlayer,
            distanceToPlayer: this.distanceToPlayer?.toFixed(2)
        };
    }
}

/**
 * 为现有敌人添加增强AI的辅助函数
 * @param {EnemyBase} enemy - 敌人实例
 * @param {Object} options - AI选项
 * @returns {EnhancedEnemyAI}
 */
export function addEnhancedAI(enemy, options = {}) {
    const enhancedAI = new EnhancedEnemyAI(enemy, options);
    
    // 替换原有的updateAI方法
    const originalUpdateAI = enemy.updateAI.bind(enemy);
    enemy.updateAI = function(deltaTime) {
        enhancedAI.update(deltaTime);
    };
    
    // 存储引用以便后续访问
    enemy._enhancedAI = enhancedAI;
    
    return enhancedAI;
}
