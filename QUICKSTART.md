# 快速开始指南 | Quick Start Guide

想要快速上手 Purana: Abyss Return 项目？这份简明指南将帮助你在5分钟内开始贡献！

---

## ⚡ 5分钟快速上手

### 1️⃣ 克隆项目 (30秒)

```bash
git clone https://github.com/NJX-njx/Purana-Abyss-Return.git
cd Purana-Abyss-Return
```

### 2️⃣ 安装依赖 (1分钟)

```bash
npm install
```

### 3️⃣ 启动开发服务器 (30秒)

```bash
npm run dev
```

浏览器将自动打开游戏！🎮

### 4️⃣ 选择你的贡献方式 (2分钟)

根据你的技能选择：

#### 💻 程序员
- 查看 [开放的Issues](https://github.com/NJX-njx/Purana-Abyss-Return/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
- 核心代码在 `/src/` 目录
- 从简单的Bug修复开始

#### 🎨 美术设计师
- 资源文件在 `/assets/imgs/` 
- 查看现有资源的风格和尺寸
- 可以先设计概念图

#### 📝 游戏策划
- 关卡数据在 `/assets/stages/`
- 剧情数据在 `/Plot.V3/plot-data.json`
- 先体验完整游戏，了解现有内容

#### 🤖 AI研究者
- 敌人AI在 `/src/Entities/Enemys/`
- 查看 [AI集成文档](AI_INTEGRATION.md)
- 从优化现有AI开始

### 5️⃣ 开始贡献！(1分钟)

1. 创建新分支
   ```bash
   git checkout -b feature/your-feature
   ```

2. 进行修改

3. 提交代码
   ```bash
   git add .
   git commit -m "你的修改说明"
   git push origin feature/your-feature
   ```

4. 在GitHub上创建Pull Request

---

## 📚 必读文档

根据你的需求选择：

| 文档 | 适合人群 | 阅读时间 |
|------|----------|----------|
| [README.md](README.md) | 所有人 | 3分钟 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 所有贡献者 | 10分钟 |
| [AI_INTEGRATION.md](AI_INTEGRATION.md) | AI研究者 | 20分钟 |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | 所有人 | 5分钟 |

---

## 🎯 新手友好任务

寻找第一个任务？试试这些：

### 编程类
- 🐛 修复小Bug
- 📝 添加代码注释
- 🧪 编写测试
- ⚡ 性能小优化

标签：`good first issue` `help wanted`

### 非编程类
- 📖 改进文档
- 🎨 设计UI图标
- 🗺️ 设计新关卡
- ✍️ 编写剧情对话

---

## 💡 贡献建议

### ✅ 推荐的第一次贡献

1. **添加注释** - 为现有代码添加中文注释
2. **修复拼写错误** - 在文档或代码中修正错误
3. **优化现有功能** - 改进已有功能的用户体验
4. **添加小功能** - 实现一个小而独立的新功能

### ❌ 避免的陷阱

1. ❌ 大规模重构（先讨论）
2. ❌ 修改核心系统（需要充分理解）
3. ❌ 添加大量依赖（保持轻量）
4. ❌ 破坏现有功能（充分测试）

---

## 🔧 常用命令

```bash
# 开发
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览构建结果

# Git
git status           # 查看状态
git log --oneline    # 查看提交历史
git diff             # 查看修改
```

---

## 🐛 调试技巧

### 浏览器控制台

按 `F12` 打开开发者工具，使用调试对象：

```javascript
// 在控制台中尝试
debug.managers.player       // 查看玩家对象
debug.managers.player.hp    // 查看生命值
debug.managers.player.hp = 1000  // 修改生命值
```

### 常见问题

**问题：修改代码后没有生效？**
- 刷新页面 (`Ctrl+F5` 强制刷新)
- 清除浏览器缓存
- 检查是否修改了正确的文件

**问题：游戏无法启动？**
- 检查浏览器控制台的错误信息
- 确保使用HTTP服务器而非直接打开HTML
- 检查Node.js版本是否符合要求

---

## 📞 需要帮助？

遇到问题不要犹豫：

1. 🔍 搜索已有的Issues
2. 💬 创建新的Issue提问
3. 📖 查看详细的[贡献指南](CONTRIBUTING.md)
4. 🤝 在Issue中@维护者

---

## 🌟 贡献者福利

成为贡献者后你将：

- ✅ 出现在贡献者名单
- ✅ 获得项目经验
- ✅ 学习游戏开发知识
- ✅ 结识志同道合的朋友
- ✅ 实现你的游戏创意

---

## 🎊 开始你的贡献之旅！

现在你已经掌握了基础知识，是时候开始了！

1. 浏览 [Issues](https://github.com/NJX-njx/Purana-Abyss-Return/issues)
2. 找到感兴趣的任务
3. 留言表示你想处理
4. 开始编码！

**记住：每个人都是从第一次贡献开始的。不要害怕犯错，我们会帮助你！** 💪

---

**祝你贡献愉快！有任何问题随时提出！** 🚀✨
