import { inputManager } from "../System/Input/InputManager";
import { eventBus, EventTypes } from "../Manager/EventBus";
import { mapManager } from "../Manager/MapManager";

class DialogManager {
    constructor() {
        this.isActive = false;
        this.currentDialog = null;
        this.currentLine = 0;
        this.currentChar = 0;
        this.displayText = "";
        this.charDelay = 30; // 每个字符显示延迟(ms)
        this.accumulator = 0;
        this.isFastForwarding = false;
        
        // 对话框样式
        this.boxWidth = 800;
        this.boxHeight = 150;
        this.boxX = (1280 - this.boxWidth) / 2;
        this.boxY = 720 - this.boxHeight - 20;
        this.textX = this.boxX + 30;
        this.textY = this.boxY + 30;
        this.textWidth = this.boxWidth - 60;
        this.font = "20px Arial";
        this.textColor = "white";
        this.boxColor = "rgba(0, 0, 0, 0.7)";
        this.borderColor = "rgba(255, 215, 0, 0.8)";
        this.borderWidth = 3;
        
        // 修复：正确注册事件监听
        eventBus.on({
            event: EventTypes.interaction.trigger,
            handler: this.handleInteraction.bind(this),
            priority: 0
        });
        
        // 监听游戏tick事件以更新对话状态
        eventBus.on({
            event: EventTypes.game.tick,
            handler: ({ deltaTime }) => this.update(deltaTime),
            priority: 0.9
        });
    }
    
    // 处理交互事件
    handleInteraction(event) {
        if (event.type === 'dialog') {
            this.startDialog(event.data.dialogs);
        }
    }
    
    // 开始对话
    startDialog(dialogs) {
        if (dialogs && dialogs.length > 0) {
            this.isActive = true;
            this.currentDialog = dialogs;
            this.currentLine = 0;
            this.currentChar = 0;
            this.displayText = "";
            this.accumulator = 0;
            this.isFastForwarding = false;
            
            // 暂停玩家移动
            eventBus.emit(EventTypes.dialog.start);
        }
    }
    
    // 更新对话状态
    update(deltaTime) {
        if (!this.isActive || !this.currentDialog) return;
        
        // 检测Ctrl键快进
        this.isFastForwarding = inputManager.isKeysDown(['ControlLeft', 'ControlRight']);
        
        const currentLine = this.currentDialog[this.currentLine];
        if (!currentLine) {
            this.endDialog();
            return;
        }
        const lineContent = typeof currentLine === 'string' ? currentLine : currentLine.text || '';
        
        // 如果快进或者已经显示完当前行
        if (this.isFastForwarding || this.currentChar >= lineContent.length) {
            // 如果按下确认键（如空格或回车），进入下一行
            if (inputManager.isFirstDown('Space') || inputManager.isFirstDown('Enter')) {
                this.nextLine();
            }
            return;
        }
        
        // 逐字显示
        this.accumulator += deltaTime;
        if (this.accumulator >= this.charDelay) {
            this.accumulator = 0;
            this.currentChar++;
            this.displayText = lineContent.substring(0, this.currentChar);
        }
    }
    
    // 进入下一行对话
    nextLine() {
        this.currentLine++;
        this.currentChar = 0;
        this.displayText = "";
        
        // 对话结束
        if (this.currentLine >= this.currentDialog.length) {
            this.endDialog();
        }
    }
    
    // 结束对话
    endDialog() {
        this.isActive = false;
        this.currentDialog = null;
        
        // 恢复玩家移动
        eventBus.emit(EventTypes.dialog.end);
    }
    
    // 绘制对话框
    draw(ctx) {
        if (!this.isActive || !this.currentDialog) return;
        
        // 绘制对话框背景
        ctx.fillStyle = this.boxColor;
        ctx.fillRect(this.boxX, this.boxY, this.boxWidth, this.boxHeight);
        
        // 绘制边框
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.borderWidth;
        ctx.strokeRect(this.boxX, this.boxY, this.boxWidth, this.boxHeight);
        
        // 绘制文本
        ctx.fillStyle = this.textColor;
        ctx.font = this.font;
        ctx.textBaseline = "top";
        
        // 自动换行
        const words = this.displayText.split(' ');
        let line = '';
        let lineCount = 0;
        const maxWidth = this.textWidth;
        const lineHeight = 25;
        
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && i > 0) {
                ctx.fillText(line, this.textX, this.textY + lineCount * lineHeight);
                line = words[i] + ' ';
                lineCount++;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, this.textX, this.textY + lineCount * lineHeight);
        
        // 绘制提示信息
        if (this.currentChar >= this.currentDialog[this.currentLine].length) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.font = "16px Arial";
            ctx.fillText("按空格键继续...", this.boxX + this.boxWidth - 150, this.boxY + this.boxHeight - 30);
        }
    }
}

export const dialogManager = new DialogManager();
