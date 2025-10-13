# Purana: Abyss Return

这是一个基于 **HTML5 + JavaScript** 的游戏项目，使用 **Vite** 管理模块化 JS，便于依赖管理；部分独立 JS 脚本依然通过 `<script>` 引入。  

> 🤝 **欢迎贡献！** 我们欢迎开发者、设计师和AI领域的朋友加入项目！查看 [贡献指南](CONTRIBUTING.md) 了解如何参与。

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

## 📖 剧情数据加载说明

- 所有剧情文本、触发条件和交互点在 `Plot.V3/plot-data.json` 中维护，`plotData` 字段存储章节剧情，`interactions` 字段记录各关卡的剧情触发点。
- 地图文件中的 `plot` 事件会在加载时自动剥离，仅保留非剧情事件，剧情交互由 `PlotManager` 根据章节/关卡动态注入。
- `PlotManager` 会尊重 `PlotModeManager` 的开关设置；关闭剧情模式时，剧情交互仍会触发但不会展示文本。
- 如需新增剧情，只需在 `plot-data.json` 中补充相应章节与关卡的定义，无需修改关卡地图文件。

---

## 🤝 参与贡献

我们欢迎各类贡献者加入项目！无论你是：

- 💻 **程序员** - 改进游戏系统、优化性能、开发新功能
- 🎨 **美术设计师** - 创作角色、场景、UI等视觉资源  
- 📝 **游戏策划** - 设计关卡、撰写剧情、平衡数值
- 🤖 **AI研究者** - 探索AI智体与游戏的深度融合

**查看 [贡献指南](CONTRIBUTING.md) 了解详细信息！**

### AI集成机会

我们特别欢迎AI领域的朋友探索以下方向：
- 🧠 敌人智能优化（行为树、强化学习等）
- 💬 NPC智能对话系统
- 🎲 程序化内容生成（关卡、任务等）
- 📊 玩家行为分析与难度自适应
- 🎮 AI辅助玩家系统

> 📖 **深入阅读**: [AI智体与游戏融合技术文档](AI_INTEGRATION.md) - 详细的技术实现方案和代码示例

**让我们一起探索AI智体与游戏玩法的创新融合！**

---

