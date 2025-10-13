# Purana: Abyss Return

这是一个基于 **HTML5 + JavaScript** 的游戏项目，使用 **Vite** 管理模块化 JS，便于依赖管理；部分独立 JS 脚本依然通过 `<script>` 引入。

## ✨ 特色功能

- **AI智能体系统** - 支持多种AI行为策略和动态难度调整
- **剧情模式** - 丰富的剧情内容和交互系统
- **存档系统** - 完善的游戏进度保存功能
- **天赋系统** - 灵魂碎片和技能树
- **多样化的敌人AI** - 从简单巡逻到智能战术决策

---

## 🚀 运行方式

> ⚠️ **注意**：直接用 `file://` 打开 HTML 可能无法加载模块化 JS 和部分资源，推荐使用 HTTP Server。  

以下提供三种常见方式运行本地服务器：

### 1️⃣ VS Code Live Server 插件
- 安装 [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) 插件  
- 打开 [`index.html`](/index.html) 文件，右键选择 **“Open with Live Server”**  
- 浏览器会自动打开并预览页面  

---

### 2️⃣ Python 内置 HTTP Server
在项目根目录运行：

#### Python 3
```bash
python -m http.server 8000
```

#### Python 2
```bash
python -m SimpleHTTPServer 8000
```

然后访问：

```
http://localhost:8000
```

---

### 3️⃣ Node.js 工具

#### 使用 `serve`
```bash
# 全局安装（只需一次）
npm install -g serve

# 启动服务器（当前目录）
serve .

# 或指定端口
serve -l 8000
```

#### 使用 `http-server`
```bash
# 全局安装
npm install -g http-server

# 启动服务器
http-server -p 8000
```

然后访问：

```
http://localhost:8000
```

---

## 🛠 使用 Vite 开发
>⚠️ 需要Node.js环境  
⚠️ 项目中已附带一份打包好的 `main.js`，如果你只运行游戏而不修改 `src/` 下的模块化代码，则无需重新打包。

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

- 默认会自动打开 `index.html`  
- 为兼容不使用Vite,暂不支持 **模块热更新 (HMR,修改源码时自动更新网页内容)**
- 如需使用，可复制一份 `game.html` ，改名为 `test_game.html` ，将Vita入口的src改为 `src/main.js` 然后在浏览器中手动打开
- 链接类似 `http://localhost:5173/test_game.html`  

---

## 📦 构建生产版本

如需重新打包模块化代码：

```bash
npm run build
```

- 打包结果输出到 `dist/`  
- 默认仅打包 `src/main.js` 及其依赖，生成 `dist/main.js`  
- 如需打包其他入口文件，请修改 [`vite.config.js`](/vite.config.js)  

---

## 🤖 AI智能体系统

游戏集成了完整的AI智能体系统，提供更智能的游戏体验：

### 主要特性

- **多种AI行为策略**：激进、防御、战术、自适应
- **动态难度调整**：根据玩家表现自动调整敌人强度
- **智能敌人AI**：支持追击、攻击、撤退等智能决策
- **NPC对话系统**：上下文感知的对话AI
- **AI助手**：为玩家提供实时游戏建议
- **玩家表现追踪**：分析游戏技巧并给出改进建议

### 详细文档

查看 [AI集成文档](AI_INTEGRATION.md) 了解如何使用和扩展AI系统。

---

## 📖 剧情数据加载说明

- 所有剧情文本、触发条件和交互点在 `Plot.V3/plot-data.json` 中维护，`plotData` 字段存储章节剧情，`interactions` 字段记录各关卡的剧情触发点。
- 地图文件中的 `plot` 事件会在加载时自动剥离，仅保留非剧情事件，剧情交互由 `PlotManager` 根据章节/关卡动态注入。
- `PlotManager` 会尊重 `PlotModeManager` 的开关设置；关闭剧情模式时，剧情交互仍会触发但不会展示文本。
- 如需新增剧情，只需在 `plot-data.json` 中补充相应章节与关卡的定义，无需修改关卡地图文件。

---
