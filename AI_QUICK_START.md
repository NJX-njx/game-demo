# AI智能体系统快速使用指南

本指南简要说明如何在游戏中使用AI智能体系统。

## 🚀 快速开始

### 1. 设置AI难度

```javascript
import { aiManager, AIDifficultyLevel } from "./src/Manager/AIManager";

// 设置难度
aiManager.setDifficulty(AIDifficultyLevel.NORMAL);
// 可选: EASY, NORMAL, HARD, ADAPTIVE
```

### 2. 创建智能敌人

#### 方法A: 使用智能敌人类

```javascript
import { Enemy_Smart } from "./src/Entities/Enemys/Enemy_Smart";
import { Vector } from "./src/Utils/Vector";

const smartEnemy = new Enemy_Smart(new Vector(400, 300));
game.enemies.push(smartEnemy);
```

#### 方法B: 为现有敌人添加AI

```javascript
import { Enemy_1 } from "./src/Entities/Enemys/Enemy_1";
import { addEnhancedAI, AIBehaviorStrategy } from "./src/Manager/EnhancedEnemyAI";

const enemy = new Enemy_1(new Vector(400, 300));
addEnhancedAI(enemy, { 
    strategy: AIBehaviorStrategy.TACTICAL  // 战术型AI
});
game.enemies.push(enemy);
```

## 🎯 AI行为策略

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| `AGGRESSIVE` | 激进 - 主动追击，频繁攻击 | BOSS、狂战士 |
| `DEFENSIVE` | 防御 - 保持距离，谨慎进攻 | 弓箭手、刺客 |
| `TACTICAL` | 战术 - 智能判断，平衡攻防 | 通用敌人 |
| `ADAPTIVE` | 自适应 - 根据玩家表现调整 | 高级敌人 |

## 💡 常用功能

### 查看玩家表现

```javascript
const assessment = aiManager.getPlayerPerformanceAssessment();
console.log('评分:', assessment.score);
console.log('评价:', assessment.assessment);
console.log('建议:', assessment.suggestions);
```

### 启用AI助手

```javascript
// 启用助手
aiManager.setAIAssistant(true);

// 获取建议
const help = aiManager.getAIAssistance(performance.now());
if (help) {
    console.log(help.message);
}
```

### NPC对话

```javascript
const response = aiManager.getNPCDialogueResponse("npc_001", "帮助");
console.log(response);
```

### 调试AI状态

```javascript
// 查看系统状态
console.log(aiManager.getStatus());

// 查看敌人AI状态
if (enemy._enhancedAI) {
    console.log(enemy._enhancedAI.getDebugInfo());
}
```

## 📊 难度效果对比

| 难度 | 反应速度 | 决策质量 | 攻击频率 |
|------|---------|---------|---------|
| EASY | 慢 (1.5x) | 低 (0.6x) | 低 (0.7x) |
| NORMAL | 正常 (1.0x) | 正常 (1.0x) | 正常 (1.0x) |
| HARD | 快 (0.7x) | 高 (1.4x) | 高 (1.3x) |
| ADAPTIVE | 动态调整 | 动态调整 | 动态调整 |

## 🔧 在地图中使用

在地图JSON中添加智能敌人：

```json
{
  "enemies": [
    {
      "type": "smart",
      "position": { "x": 400, "y": 300 }
    }
  ]
}
```

## 📖 更多信息

详细文档请查看 [AI_INTEGRATION.md](AI_INTEGRATION.md)

示例代码请查看 [examples/ai_usage_examples.js](examples/ai_usage_examples.js)
