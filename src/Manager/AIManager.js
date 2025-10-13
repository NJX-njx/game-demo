/**
 * AIManager - 管理游戏中的AI智能体系统
 * 负责协调敌人AI、NPC对话AI、动态难度调整等智能行为
 */

import { eventBus as bus, EventTypes as Events } from "./EventBus";
import { player } from "../Entities/Player";

/**
 * AI行为策略枚举
 */
export const AIBehaviorStrategy = {
    AGGRESSIVE: "aggressive",   // 激进 - 主动进攻
    DEFENSIVE: "defensive",     // 防御 - 保持距离
    TACTICAL: "tactical",       // 战术 - 智能判断
    ADAPTIVE: "adaptive"        // 自适应 - 根据玩家行为调整
};

/**
 * AI难度等级
 */
export const AIDifficultyLevel = {
    EASY: "easy",           // 简单 - 反应慢，决策简单
    NORMAL: "normal",       // 普通 - 标准行为
    HARD: "hard",           // 困难 - 反应快，决策复杂
    ADAPTIVE: "adaptive"    // 自适应 - 根据玩家表现调整
};

/**
 * AI管理器类
 */
class AIManager {
    constructor() {
        if (AIManager.instance) return AIManager.instance;
        AIManager.instance = this;

        // AI难度设置
        this.difficulty = AIDifficultyLevel.NORMAL;
        
        // 动态难度调整相关
        this.playerPerformanceMetrics = {
            damageDealt: 0,          // 玩家造成的伤害
            damageTaken: 0,          // 玩家受到的伤害
            enemiesKilled: 0,        // 击杀敌人数
            deaths: 0,               // 死亡次数
            successfulDodges: 0,     // 成功闪避次数
            successfulParries: 0,    // 成功格挡次数
            combos: 0,               // 连击次数
            playTime: 0              // 游戏时间（秒）
        };

        // AI助手状态
        this.aiAssistant = {
            enabled: false,          // 是否启用AI助手
            helpLevel: 0,            // 帮助等级 0-3
            lastHelpTime: 0          // 上次提供帮助的时间
        };

        // NPC对话AI
        this.npcDialogueContext = new Map(); // 存储NPC对话上下文

        this._initEventListeners();
        console.log('AI管理器初始化完成');
    }

    /**
     * 初始化事件监听
     */
    _initEventListeners() {
        // 监听敌人受伤事件，记录玩家造成的伤害
        bus.on({
            event: Events.enemy.takeDamage,
            handler: ({ damage, attacker }) => {
                if (attacker === player) {
                    this.playerPerformanceMetrics.damageDealt += damage;
                }
            }
        });

        // 监听敌人死亡事件
        bus.on({
            event: Events.enemy.die,
            handler: ({ attacker }) => {
                if (attacker === player) {
                    this.playerPerformanceMetrics.enemiesKilled++;
                }
            }
        });

        // 监听玩家受伤事件
        bus.on({
            event: Events.player.takeDamage,
            handler: ({ damage }) => {
                this.playerPerformanceMetrics.damageTaken += damage;
            }
        });

        // 监听玩家死亡事件
        bus.on({
            event: Events.player.die,
            handler: () => {
                this.playerPerformanceMetrics.deaths++;
            }
        });

        // 监听玩家成功闪避
        bus.on({
            event: Events.player.dodgeSuccess,
            handler: () => {
                this.playerPerformanceMetrics.successfulDodges++;
            }
        });

        // 监听玩家成功格挡
        bus.on({
            event: Events.player.parrySuccess,
            handler: () => {
                this.playerPerformanceMetrics.successfulParries++;
            }
        });
    }

    /**
     * 设置AI难度
     * @param {string} difficulty - 难度等级
     */
    setDifficulty(difficulty) {
        if (Object.values(AIDifficultyLevel).includes(difficulty)) {
            this.difficulty = difficulty;
            console.log(`AI难度设置为: ${difficulty}`);
        } else {
            console.warn(`无效的难度等级: ${difficulty}`);
        }
    }

    /**
     * 获取当前AI难度
     * @returns {string}
     */
    getDifficulty() {
        return this.difficulty;
    }

    /**
     * 获取敌人AI行为参数
     * 根据难度调整敌人的反应速度、决策质量等
     * @param {string} behaviorStrategy - 行为策略
     * @returns {Object} AI行为参数
     */
    getEnemyAIParams(behaviorStrategy = AIBehaviorStrategy.TACTICAL) {
        const baseParams = {
            strategy: behaviorStrategy,
            reactionTime: 1.0,      // 反应时间倍数
            decisionQuality: 1.0,   // 决策质量
            attackFrequency: 1.0,   // 攻击频率倍数
            dodgeChance: 0.1,       // 闪避概率
            blockChance: 0.1,       // 格挡概率
            pursuitRange: 400,      // 追击范围
            patrolSpeed: 0.2,       // 巡逻速度
            attackSpeed: 0.3        // 攻击速度
        };

        // 根据难度调整参数
        switch (this.difficulty) {
            case AIDifficultyLevel.EASY:
                baseParams.reactionTime = 1.5;
                baseParams.decisionQuality = 0.6;
                baseParams.attackFrequency = 0.7;
                baseParams.dodgeChance = 0.05;
                baseParams.blockChance = 0.05;
                break;
            
            case AIDifficultyLevel.NORMAL:
                // 使用默认参数
                break;
            
            case AIDifficultyLevel.HARD:
                baseParams.reactionTime = 0.7;
                baseParams.decisionQuality = 1.4;
                baseParams.attackFrequency = 1.3;
                baseParams.dodgeChance = 0.2;
                baseParams.blockChance = 0.2;
                baseParams.pursuitRange = 500;
                break;
            
            case AIDifficultyLevel.ADAPTIVE:
                // 根据玩家表现动态调整
                const performanceScore = this._calculatePlayerPerformance();
                if (performanceScore > 0.7) {
                    // 玩家表现好，增加难度
                    baseParams.reactionTime = 0.8;
                    baseParams.decisionQuality = 1.2;
                    baseParams.attackFrequency = 1.2;
                } else if (performanceScore < 0.3) {
                    // 玩家表现差，降低难度
                    baseParams.reactionTime = 1.3;
                    baseParams.decisionQuality = 0.8;
                    baseParams.attackFrequency = 0.8;
                }
                break;
        }

        // 根据行为策略调整参数
        switch (behaviorStrategy) {
            case AIBehaviorStrategy.AGGRESSIVE:
                baseParams.attackFrequency *= 1.5;
                baseParams.pursuitRange *= 1.3;
                baseParams.attackSpeed *= 1.2;
                baseParams.dodgeChance *= 0.7;
                break;
            
            case AIBehaviorStrategy.DEFENSIVE:
                baseParams.attackFrequency *= 0.7;
                baseParams.pursuitRange *= 0.8;
                baseParams.dodgeChance *= 1.5;
                baseParams.blockChance *= 1.5;
                break;
            
            case AIBehaviorStrategy.TACTICAL:
                // 平衡的参数，使用基础值
                break;
            
            case AIBehaviorStrategy.ADAPTIVE:
                // 根据战斗情况动态调整
                const healthPercent = player.state.hp / player.state.hp_max;
                if (healthPercent < 0.3) {
                    // 玩家血量低，采取激进策略
                    baseParams.attackFrequency *= 1.3;
                    baseParams.pursuitRange *= 1.2;
                } else if (healthPercent > 0.7) {
                    // 玩家血量高，采取防御策略
                    baseParams.dodgeChance *= 1.3;
                    baseParams.blockChance *= 1.3;
                }
                break;
        }

        return baseParams;
    }

    /**
     * 计算玩家表现分数 (0-1)
     * @returns {number}
     */
    _calculatePlayerPerformance() {
        const metrics = this.playerPerformanceMetrics;
        
        // 如果没有足够的数据，返回中等分数
        if (metrics.enemiesKilled === 0 && metrics.deaths === 0) {
            return 0.5;
        }

        // 计算各项指标
        const killDeathRatio = metrics.deaths === 0 ? 
            metrics.enemiesKilled : 
            metrics.enemiesKilled / (metrics.deaths + 1);
        
        const damageRatio = metrics.damageTaken === 0 ? 
            1 : 
            metrics.damageDealt / (metrics.damageTaken + metrics.damageDealt);
        
        const skillScore = (metrics.successfulDodges + metrics.successfulParries) / 
            (metrics.enemiesKilled + 1);

        // 综合评分
        const score = (
            killDeathRatio * 0.4 + 
            damageRatio * 0.4 + 
            skillScore * 0.2
        ) / 2; // 归一化到0-1

        return Math.min(1, Math.max(0, score));
    }

    /**
     * 获取玩家表现评估
     * @returns {Object}
     */
    getPlayerPerformanceAssessment() {
        const score = this._calculatePlayerPerformance();
        let assessment = "中等";
        
        if (score > 0.7) assessment = "优秀";
        else if (score > 0.5) assessment = "良好";
        else if (score < 0.3) assessment = "需要提升";

        return {
            score,
            assessment,
            metrics: { ...this.playerPerformanceMetrics },
            suggestions: this._generateSuggestions(score)
        };
    }

    /**
     * 生成给玩家的建议
     * @param {number} score - 表现分数
     * @returns {Array<string>}
     */
    _generateSuggestions(score) {
        const suggestions = [];
        const metrics = this.playerPerformanceMetrics;

        if (score < 0.5) {
            if (metrics.damageTaken > metrics.damageDealt) {
                suggestions.push("尝试多使用闪避和格挡来减少受到的伤害");
            }
            if (metrics.successfulDodges < 5) {
                suggestions.push("练习使用闪避技能，把握时机躲避敌人攻击");
            }
            if (metrics.deaths > 3) {
                suggestions.push("考虑降低游戏难度或升级角色属性");
            }
        }

        return suggestions;
    }

    /**
     * 启用/禁用AI助手
     * @param {boolean} enabled 
     */
    setAIAssistant(enabled) {
        this.aiAssistant.enabled = enabled;
        console.log(`AI助手${enabled ? '已启用' : '已禁用'}`);
    }

    /**
     * AI助手提供帮助
     * @param {number} currentTime - 当前时间
     * @returns {Object|null} 帮助信息
     */
    getAIAssistance(currentTime) {
        if (!this.aiAssistant.enabled) return null;
        
        // 避免频繁提示
        if (currentTime - this.aiAssistant.lastHelpTime < 10000) {
            return null;
        }

        const healthPercent = player.state.hp / player.state.hp_max;
        
        // 根据玩家状态提供建议
        if (healthPercent < 0.3 && this.aiAssistant.helpLevel < 3) {
            this.aiAssistant.lastHelpTime = currentTime;
            return {
                type: "warning",
                message: "警告：生命值过低！建议寻找安全位置恢复或使用恢复道具"
            };
        }

        return null;
    }

    /**
     * 获取NPC对话的上下文感知回复
     * @param {string} npcId - NPC ID
     * @param {string} topic - 对话主题
     * @returns {string}
     */
    getNPCDialogueResponse(npcId, topic) {
        // 获取或创建该NPC的对话上下文
        if (!this.npcDialogueContext.has(npcId)) {
            this.npcDialogueContext.set(npcId, {
                interactionCount: 0,
                lastTopics: [],
                relationship: 0 // 好感度
            });
        }

        const context = this.npcDialogueContext.get(npcId);
        context.interactionCount++;
        context.lastTopics.push(topic);
        if (context.lastTopics.length > 5) {
            context.lastTopics.shift();
        }

        // 根据上下文生成回复
        // 这里可以集成更复杂的对话AI系统
        return this._generateContextualResponse(context, topic);
    }

    /**
     * 生成上下文感知的回复
     * @param {Object} context - 对话上下文
     * @param {string} topic - 当前主题
     * @returns {string}
     */
    _generateContextualResponse(context, topic) {
        // 简单的基于规则的回复系统
        // 实际应用中可以集成更复杂的NLP模型
        
        if (context.interactionCount === 1) {
            return "你好，初次见面！有什么我可以帮助你的吗？";
        } else if (context.interactionCount > 5) {
            return "我们又见面了，老朋友！";
        }

        // 根据主题返回回复
        const responses = {
            "帮助": "当然，我很乐意帮助你。你想了解什么？",
            "战斗": "战斗技巧需要不断练习，记住观察敌人的攻击模式。",
            "道具": "合理使用道具可以让战斗变得更轻松。",
            "default": "有趣的话题，让我想想..."
        };

        return responses[topic] || responses["default"];
    }

    /**
     * 重置玩家表现数据
     */
    resetPerformanceMetrics() {
        this.playerPerformanceMetrics = {
            damageDealt: 0,
            damageTaken: 0,
            enemiesKilled: 0,
            deaths: 0,
            successfulDodges: 0,
            successfulParries: 0,
            combos: 0,
            playTime: 0
        };
        console.log('玩家表现数据已重置');
    }

    /**
     * 更新方法（每帧调用）
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        this.playerPerformanceMetrics.playTime += deltaTime / 1000;
    }

    /**
     * 获取AI系统状态
     * @returns {Object}
     */
    getStatus() {
        return {
            difficulty: this.difficulty,
            aiAssistant: { ...this.aiAssistant },
            playerPerformance: this.getPlayerPerformanceAssessment()
        };
    }
}

// 导出单例
export const aiManager = new AIManager();
