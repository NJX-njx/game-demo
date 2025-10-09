import { inputManager } from "../System/Input/InputManager";
import { eventBus, EventTypes } from "../Manager/EventBus";
import { plotModeManager } from "./PlotModeManager";

class DialogManager {
    constructor() {
        this.createDialogDOM(); // 创建DOM结构
        this.buffer = [];       // 对话内容缓冲区
        this.printing = false;  // 是否正在打印
        this.triggeredEvents = new Set(); // 已触发的自动事件
        this.CTRL_KEYS = ['LCtrl', 'RCtrl']; // 加速/继续键
        this.isActive = false;
        this.ENDING_PLOT_ID = 'plot6-3-63-1'; // 通关剧情ID
    }

    /** 创建对话框DOM结构 */
    createDialogDOM() {
        // 对话框容器
        const dialog = document.createElement('div');
        dialog.className = 'dialogue-container';
        dialog.id = 'dialogue-container';
        dialog.style.cssText = `
            display: none;
            position: fixed;
            left: 50%;
            bottom: 50px;
            transform: translateX(-50%);
            width: 700px;
            height: 200px;
            background-color: black;
            border: 2px solid white;
            border-radius: 4px;
            padding: 25px;
            box-sizing: border-box;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 100; /* 确保在游戏画面上层 */
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
        `;

        // 角色名区域
        const charName = document.createElement('div');
        charName.className = 'character-name';
        charName.id = 'character-name';
        charName.style.cssText = `
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 8px;
        `;

        // 文本容器（包含逐字文本和提示）
        const textContainer = document.createElement('div');
        textContainer.className = 'text-container';
        textContainer.id = 'text-container';
        textContainer.style.cssText = `
            height: calc(100% - 26px); /* 预留名字高度 */
            overflow: hidden;
            position: relative;
        `;

        // 逐字文本区域
        const textContent = document.createElement('p');
        textContent.className = 'text-content';
        textContent.id = 'text-content';
        textContent.style.cssText = `
            font-size: 16px;
            line-height: 22px;
            margin: 0;
        `;

        // 提示文字（按Ctrl继续）
        const promptText = document.createElement('div');
        promptText.className = 'prompt-text';
        promptText.id = 'prompt-text';
        promptText.style.cssText = `
            position: absolute;
            bottom: 5px;
            right: 5px;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
            display: none;
        `;
        promptText.textContent = '按 Ctrl 继续';

        // 组装DOM
        textContainer.appendChild(textContent);
        textContainer.appendChild(promptText);
        dialog.appendChild(charName);
        dialog.appendChild(textContainer);

        // 插入到游戏容器（假设游戏根节点为#game）
        const gameContainer = document.getElementById('game') || document.body;
        gameContainer.appendChild(dialog);

        // 保存DOM引用
        this.dialog = dialog;
        this.charName = charName;
        this.textContent = textContent;
        this.promptText = promptText;
    }

    /** 启动对话流程 */
    startDialog(dialogs) {
        if (dialogs && dialogs.length > 0 && !this.printing) {
            // 检查剧情模式设置
            if (plotModeManager.isPlotDisabled()) {
                console.log('剧情模式已关闭，跳过对话显示');
                // 即使跳过对话，也要触发对话结束事件，确保游戏状态正确
                setTimeout(() => {
                    eventBus.emit(EventTypes.dialog.end);
                }, 100);
                return;
            }

            eventBus.emit(EventTypes.dialog.start);
            this.buffer = dialogs;
            this.printing = true;
            this.open().then(() => this._printDialogLines());
        }
    }

    /** 打开对话框（淡入动画） */
    open() {
        return new Promise(resolve => {
            this.charName.innerHTML = '';
            this.textContent.innerHTML = '';
            this.promptText.style.display = 'none';
            this.isActive = true; // 对话启动，标记为活跃

            this.dialog.style.display = 'block';
            setTimeout(() => {
                this.dialog.style.opacity = '1';
                setTimeout(resolve, 300);
            }, 10);
        });
    }

    /** 关闭对话框（淡出动画） */
    close() {
        return new Promise(resolve => {
            this.dialog.style.opacity = '0';
            setTimeout(() => {
                this.dialog.style.display = 'none';
                this.printing = false;
                this.isActive = false; // 对话结束，取消活跃
                resolve();
            }, 300);
        });
    }

    /** 逐行打印对话内容 */
    async _printDialogLines() {
        for (let lineIdx = 0; lineIdx < this.buffer.length; lineIdx++) {
            if (!this.printing) return;

            const lineData = this.buffer[lineIdx];
            const text = typeof lineData === 'string' ? lineData : lineData.text || '';
            const speaker = typeof lineData === 'object' ? lineData.speaker : '';

            // 处理说话人名字（支持特殊样式拆分）
            if (speaker) {
                let displayName = speaker;
                this.charName.innerHTML = displayName;
            } else {
                this.charName.innerHTML = '';
            }

            this.textContent.innerHTML = '';
            this.promptText.style.display = 'none';

            // 逐字打印（打字机效果）
            let fullText = '';
            for (const char of text) {
                if (!this.printing) return;

                fullText += char;
                const charSpan = document.createElement('span');
                charSpan.textContent = char;
                this.textContent.appendChild(charSpan);

                // Ctrl按住时加速打印
                if (inputManager.isKeysDown(this.CTRL_KEYS)) {
                    await new Promise(r => setTimeout(r, 10));
                    continue;
                }

                await new Promise(r => setTimeout(r, 50)); // 普通打字延迟
            }

            // 显示“按Ctrl继续”提示，等待输入
            this.promptText.style.display = 'block';
            await new Promise(resolve => {
                const checkInput = () => {
                    if (
                        inputManager.isKeysDown(this.CTRL_KEYS)
                    ) {
                        resolve();
                    } else {
                        requestAnimationFrame(checkInput);
                    }
                };
                checkInput();
            });
            this.promptText.style.display = 'none';
        }

        // 所有行打印完毕，关闭对话框
        await this.close();
        eventBus.emit(EventTypes.dialog.end);
        
        // 检查是否是通关剧情，如果是则返回菜单
        this._checkEndingPlot();
    }

    /** 检查是否是通关剧情并处理跳转 */
    _checkEndingPlot() {
        // 动态导入 plotManager 避免循环依赖
        import('./PlotManager.js').then(module => {
            const plotManager = module.plotManager;
            if (plotManager.currentPlotEventId === this.ENDING_PLOT_ID) {
                console.log('通关剧情结束，准备返回菜单页面...');
                // 延迟跳转，给玩家一点时间
                setTimeout(() => {
                    window.location.href = 'menu.html';
                }, 1000);
            }
        });
    }

    /** 清空对话（强制关闭） */
    clear() {
        this.buffer = [];
        this.printing = false;
        this.isActive = false; // 强制终止对话，取消活跃
        this.close();
    }
}

export const dialogManager = new DialogManager();