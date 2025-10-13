/**
 * AI系统使用示例
 * 
 * 本文件展示如何在游戏中使用AI智能体系统
 */

// ============================================
// 示例1: 设置游戏AI难度
// ============================================

import { aiManager, AIDifficultyLevel } from "../src/Manager/AIManager";

function initializeGameDifficulty() {
    // 方式1: 从菜单设置中读取
    const savedDifficulty = localStorage.getItem('ai_difficulty') || 'normal';
    
    switch(savedDifficulty) {
        case 'easy':
            aiManager.setDifficulty(AIDifficultyLevel.EASY);
            console.log('AI难度: 简单 - 敌人反应较慢，攻击频率较低');
            break;
        case 'normal':
            aiManager.setDifficulty(AIDifficultyLevel.NORMAL);
            console.log('AI难度: 普通 - 标准的敌人行为');
            break;
        case 'hard':
            aiManager.setDifficulty(AIDifficultyLevel.HARD);
            console.log('AI难度: 困难 - 敌人反应敏捷，决策更智能');
            break;
        case 'adaptive':
            aiManager.setDifficulty(AIDifficultyLevel.ADAPTIVE);
            console.log('AI难度: 自适应 - 根据玩家表现动态调整');
            break;
    }
}

// ============================================
// 示例2: 创建不同策略的敌人
// ============================================

import { Enemy_1 } from "../src/Entities/Enemys/Enemy_1";
import { Enemy_Smart } from "../src/Entities/Enemys/Enemy_Smart";
import { addEnhancedAI, AIBehaviorStrategy } from "../src/Manager/EnhancedEnemyAI";
import { Vector } from "../src/Utils/Vector";

function spawnMixedEnemyGroup(position) {
    const enemies = [];
    
    // 1. 创建一个激进型敌人（冲锋陷阵）
    const aggressive = new Enemy_1(position.clone());
    addEnhancedAI(aggressive, { 
        strategy: AIBehaviorStrategy.AGGRESSIVE 
    });
    enemies.push(aggressive);
    console.log('生成激进型敌人 - 会主动追击并频繁攻击');
    
    // 2. 创建一个防御型敌人（保持距离）
    const defensive = new Enemy_1(new Vector(position.x + 100, position.y));
    addEnhancedAI(defensive, { 
        strategy: AIBehaviorStrategy.DEFENSIVE 
    });
    enemies.push(defensive);
    console.log('生成防御型敌人 - 会保持安全距离并谨慎进攻');
    
    // 3. 创建一个战术型敌人（智能判断）
    const tactical = new Enemy_Smart(new Vector(position.x + 200, position.y));
    enemies.push(tactical);
    console.log('生成战术型敌人 - 会根据双方血量智能决策');
    
    // 4. 创建一个自适应敌人（根据玩家表现调整）
    const adaptive = new Enemy_1(new Vector(position.x + 300, position.y));
    addEnhancedAI(adaptive, { 
        strategy: AIBehaviorStrategy.ADAPTIVE 
    });
    enemies.push(adaptive);
    console.log('生成自适应型敌人 - 会根据玩家实力调整策略');
    
    return enemies;
}

// ============================================
// 示例3: BOSS战场景
// ============================================

function createBossFight() {
    import("../src/Entities/Enemys/Enemy_balingzhe").then(({ Enemy_balingzhe }) => {
        // 创建BOSS
        const boss = new Enemy_balingzhe(new Vector(640, 300));
        
        // 给BOSS增强AI - 使用自适应策略
        addEnhancedAI(boss, { 
            strategy: AIBehaviorStrategy.ADAPTIVE 
        });
        
        // 增强BOSS属性
        boss.baseState.hp_max = 500;
        boss.baseState.attack.atk = 30;
        boss.state.hp = 500;
        boss.state.hp_max = 500;
        
        console.log('BOSS登场！使用自适应AI，会根据玩家实力调整战术');
        
        return boss;
    });
}

// ============================================
// 示例4: 启用AI助手
// ============================================

function enableAIAssistant() {
    // 在新手教程或困难模式中启用AI助手
    aiManager.setAIAssistant(true);
    console.log('AI助手已启用，将在关键时刻提供建议');
    
    // 在游戏循环中检查AI助手建议
    function gameLoop() {
        const assistance = aiManager.getAIAssistance(performance.now());
        if (assistance) {
            // 显示提示
            showNotification(assistance.message, assistance.type);
        }
        
        requestAnimationFrame(gameLoop);
    }
}

// 模拟通知函数
function showNotification(message, type) {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // 实际项目中这里应该显示UI提示
}

// ============================================
// 示例5: 查看玩家表现
// ============================================

function displayPlayerStats() {
    const assessment = aiManager.getPlayerPerformanceAssessment();
    
    console.log('=== 玩家表现评估 ===');
    console.log(`综合评分: ${(assessment.score * 100).toFixed(1)}%`);
    console.log(`评价: ${assessment.assessment}`);
    console.log('\n详细数据:');
    console.log(`- 造成伤害: ${assessment.metrics.damageDealt}`);
    console.log(`- 受到伤害: ${assessment.metrics.damageTaken}`);
    console.log(`- 击杀敌人: ${assessment.metrics.enemiesKilled}`);
    console.log(`- 死亡次数: ${assessment.metrics.deaths}`);
    console.log(`- 成功闪避: ${assessment.metrics.successfulDodges}`);
    console.log(`- 成功格挡: ${assessment.metrics.successfulParries}`);
    console.log(`- 游戏时间: ${(assessment.metrics.playTime / 60).toFixed(1)} 分钟`);
    
    if (assessment.suggestions.length > 0) {
        console.log('\n建议:');
        assessment.suggestions.forEach((suggestion, index) => {
            console.log(`${index + 1}. ${suggestion}`);
        });
    }
}

// ============================================
// 示例6: NPC对话AI
// ============================================

function talkToNPC(npcId, topic) {
    // 获取NPC的智能回复
    const response = aiManager.getNPCDialogueResponse(npcId, topic);
    console.log(`NPC [${npcId}]: ${response}`);
    
    // 实际项目中应该显示对话框
    // dialogManager.showDialog(response);
}

// 使用示例
function npcInteractionExample() {
    // 第一次对话
    talkToNPC('merchant_001', '帮助');
    // 输出: "你好，初次见面！有什么我可以帮助你的吗？"
    
    // 多次对话后
    for (let i = 0; i < 6; i++) {
        talkToNPC('merchant_001', '道具');
    }
    // 输出: "我们又见面了，老朋友！"
}

// ============================================
// 示例7: 动态切换敌人策略
// ============================================

function changeEnemyBehaviorDuringBattle(enemy) {
    // 假设在战斗中需要改变敌人行为
    if (enemy._enhancedAI) {
        const currentHealth = enemy.state.hp / enemy.state.hp_max;
        
        if (currentHealth < 0.3) {
            // 血量低于30%，切换到防御策略
            enemy._enhancedAI.setStrategy(AIBehaviorStrategy.DEFENSIVE);
            console.log('敌人血量过低，切换为防御策略！');
        } else if (currentHealth > 0.7) {
            // 血量充足，采取激进策略
            enemy._enhancedAI.setStrategy(AIBehaviorStrategy.AGGRESSIVE);
            console.log('敌人血量充足，采取激进策略！');
        }
    }
}

// ============================================
// 示例8: 调试AI状态
// ============================================

function debugAISystem() {
    // 查看AI系统总体状态
    const status = aiManager.getStatus();
    console.log('AI系统状态:', JSON.stringify(status, null, 2));
    
    // 查看特定敌人的AI状态
    import("../src/Game").then(({ game }) => {
        game.enemies.forEach((enemy, index) => {
            if (enemy._enhancedAI) {
                const debugInfo = enemy._enhancedAI.getDebugInfo();
                console.log(`敌人 ${index}:`, debugInfo);
            }
        });
    });
}

// ============================================
// 示例9: 重置玩家数据
// ============================================

function startNewGameWithFreshStats() {
    // 开始新游戏时重置所有追踪数据
    aiManager.resetPerformanceMetrics();
    console.log('已重置玩家表现数据，开始新的游戏统计');
}

// ============================================
// 示例10: 完整的关卡初始化
// ============================================

function initializeLevel(levelConfig) {
    console.log('=== 关卡初始化 ===');
    
    // 1. 设置关卡难度
    const difficulty = levelConfig.difficulty || 'normal';
    aiManager.setDifficulty(AIDifficultyLevel[difficulty.toUpperCase()]);
    
    // 2. 决定是否启用AI助手
    const isHardLevel = levelConfig.isHard || false;
    if (isHardLevel) {
        aiManager.setAIAssistant(true);
    }
    
    // 3. 生成敌人
    const enemies = [];
    levelConfig.enemyGroups.forEach(group => {
        const groupEnemies = spawnMixedEnemyGroup(group.position);
        enemies.push(...groupEnemies);
    });
    
    // 4. 如果有BOSS
    if (levelConfig.hasBoss) {
        const boss = createBossFight();
        enemies.push(boss);
    }
    
    console.log(`关卡初始化完成: ${enemies.length} 个敌人已生成`);
    return enemies;
}

// 关卡配置示例
const level3Config = {
    difficulty: 'hard',
    isHard: true,
    hasBoss: true,
    enemyGroups: [
        { position: new Vector(300, 400) },
        { position: new Vector(600, 400) },
        { position: new Vector(900, 400) }
    ]
};

// ============================================
// 导出示例函数供其他模块使用
// ============================================

export {
    initializeGameDifficulty,
    spawnMixedEnemyGroup,
    createBossFight,
    enableAIAssistant,
    displayPlayerStats,
    talkToNPC,
    npcInteractionExample,
    changeEnemyBehaviorDuringBattle,
    debugAISystem,
    startNewGameWithFreshStats,
    initializeLevel
};

// ============================================
// 使用说明
// ============================================

/*
要在项目中使用这些示例：

1. 在游戏初始化时调用：
   initializeGameDifficulty();

2. 在生成敌人时调用：
   const enemies = spawnMixedEnemyGroup(new Vector(400, 300));
   enemies.forEach(enemy => game.enemies.push(enemy));

3. 在游戏循环中检查AI助手：
   enableAIAssistant();

4. 在结算画面显示玩家表现：
   displayPlayerStats();

5. 在浏览器控制台调试：
   debugAISystem();
*/
