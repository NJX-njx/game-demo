import { itemBar } from "./Screens/ItemBarSeen";
import { itemManager } from "../Item/ItemManager";
import { mouseManager } from "../Input/MouseManager";
import { pauseMenu } from "./Screens/PauseMenu";
import { soundSettings } from "./Screens/SoundSettings";
import { exchangeScreen } from "./Screens/ExchangeScreen";
import { talentScreen } from "./Screens/TalentScreen";
import { textureManager } from "../../Manager/TextureManager";
import { sizes } from "../../Utils/canvas";
import { game } from "../../Game";

class UIManager {
    static instance;

    constructor() {
        if (UIManager.instance) return UIManager.instance;
        UIManager.instance = this;

        this.screens = {};              // 所有界面
        this.currentScreen = null;      // 当前操作界面
        this.persistentScreens = new Set(); // 一直显示的界面
        this._history = []; // 已打开的界面历史栈
        this._tooltip = null; // 临时 tooltip 信息，由元素注册，统一在 draw 完成后绘制在最上层
        this._uiSuspendsGame = false;
    }

    /**
     * 添加界面
     * @param {Object} screen - 界面对象
     * @param {boolean} persistent - 是否一直显示
     */
    addScreen(screen, persistent = false) {
        this.screens[screen.name] = screen;
        if (persistent) this.persistentScreens.add(screen.name);
    }

    /**
     * 切换当前操作界面
     * persistent 屏幕不会被隐藏
     * 默认会把当前界面入栈，以便后续可以回退（按 Esc）
     * @param {string} screenName
     * @param {boolean} pushCurrent 是否将当前界面压入历史（默认 true）
     */
    switchScreen(screenName, pushCurrent = true) {
        const next = this.screens[screenName];
        if (!next) return;

        // 如果需要入栈当前界面（供回退），且当前存在且不是 persistent
        if (pushCurrent && this.currentScreen && !this.persistentScreens.has(this.currentScreen.name)) {
            this._history.push(this.currentScreen.name);
        }

        // 隐藏当前（如果不是 persistent）
        if (this.currentScreen && !this.persistentScreens.has(this.currentScreen.name)) {
            this.currentScreen.hide();
        }

        this.currentScreen = next;
        this.currentScreen?.show();
        this._updateGameSuspension();
    }

    /**
     * 关闭当前界面和所有历史界面（不关闭 persistent 常驻界面）
     */
    closeAll() {
        // 隐藏当前
        if (this.currentScreen && !this.persistentScreens.has(this.currentScreen.name)) {
            this.currentScreen.hide();
        }
        this.currentScreen = null;

        // 隐藏并清空历史中记录的界面（忽略 persistent）
        while (this._history.length > 0) {
            const name = this._history.pop();
            const screen = this.screens[name];
            if (screen && !this.persistentScreens.has(name) && typeof screen.hide === 'function') {
                try { screen.hide(); } catch (e) { /* ignore */ }
            }
        }
        this._updateGameSuspension();
    }

    /**
     * 返回是否有当前操作界面在显示（不包含 persistent 常驻界面）
     */
    isUIOpen() {
        return !!(this.currentScreen && this.currentScreen.visible);
    }

    /**
     * 回退到上一个界面（弹出历史栈一层）
     */
    goBack() {
        if (this._history.length > 0) {
            const prev = this._history.pop();
            // 切换到 prev，但不要把当前再次入栈
            this.switchScreen(prev, false);
            return;
        }
        // 若没有历史，关闭当前非 persistent 界面
        if (this.currentScreen && !this.persistentScreens.has(this.currentScreen.name)) {
            this.currentScreen.hide();
            this.currentScreen = null;
            this._updateGameSuspension();
        }
    }

    /**
     * 绘制所有界面
     * - persistentScreens 永远绘制
     * - currentScreen 绘制
     */
    draw(ctx) {
        // 清空上次的 tooltip，元素在绘制时可通过 uiManager.setTooltip(...) 注册新的 tooltip
        this._tooltip = null;

        // 绘制 persistent 屏幕
        for (let name of this.persistentScreens) {
            const screen = this.screens[name];
            if (screen.visible) screen.draw(ctx);
        }

        // 绘制当前操作界面（如果不是 persistent 的话，避免重复绘制）
        if (this.currentScreen && !this.persistentScreens.has(this.currentScreen.name)) {
            if (this.currentScreen.visible) this.currentScreen.draw(ctx);
        }

        // 在最上层绘制 tooltip（若有）以避免被其他元素遮挡
        if (this._tooltip) {
            try {
                const tip = this._tooltip;
                const padding = tip.padding || 8;
                const lineHeight = tip.lineHeight || 18;
                const boxWidth = tip.width || Math.min(300, ctx.canvas.width - 20);
                let tx = tip.x || 12;
                let ty = tip.y || 12;

                // 支持传入 rawText 或 lines。若提供 rawText，则自动换行成 lines
                let lines = Array.isArray(tip.lines) ? [...tip.lines] : [];
                if (!lines || lines.length === 0) {
                    const raw = typeof tip.rawText === 'string' ? tip.rawText : '';
                    if (raw.length > 0) {
                        const availableWidth = Math.max(4, boxWidth - padding * 2);
                        lines = this._wrapTooltipRawText(ctx, raw, availableWidth);
                    }
                }
                if (!lines || lines.length === 0) lines = [''];

                const boxHeight = lines.length * lineHeight + padding * 2;
                if (tx + boxWidth > ctx.canvas.width) tx = Math.max(8, ctx.canvas.width - boxWidth - 8);
                if (ty + boxHeight > ctx.canvas.height) ty = Math.max(8, ctx.canvas.height - boxHeight - 8);
                if (tx + boxWidth > ctx.canvas.width) tx = Math.max(8, ctx.canvas.width - boxWidth - 8);
                if (ty + boxHeight > ctx.canvas.height) ty = Math.max(8, ctx.canvas.height - boxHeight - 8);

                ctx.save();
                ctx.globalAlpha = 0.95;
                ctx.fillStyle = 'rgba(10,10,10,0.95)';
                ctx.fillRect(tx, ty, boxWidth, boxHeight);
                ctx.strokeStyle = 'rgba(255,255,255,0.12)';
                ctx.strokeRect(tx, ty, boxWidth, boxHeight);
                ctx.fillStyle = 'white';
                ctx.font = tip.font || '14px sans-serif';
                ctx.textAlign = 'left';
                for (let i = 0; i < lines.length; i++) {
                    ctx.fillText(lines[i], tx + padding, ty + padding + (i + 0.5) * lineHeight);
                }
                ctx.restore();
            } catch (e) { console.warn('tooltip draw error', e); }
        }

        // 在最上层绘制正在拖拽的道具预览，避免被 UI 元素遮挡
        try {
            if (itemManager.dragging && itemManager.draggingItem) {
                const draggingItem = itemManager.draggingItem;
                const pos = mouseManager.position;
                const tex = textureManager.getTexture('item', draggingItem.name);
                ctx.save();
                ctx.globalAlpha = 0.95;
                if (tex) {
                    const size = 48;
                    ctx.drawImage(tex, pos.x - size / 2, pos.y - size / 2, size, size);
                } else {
                    ctx.fillStyle = 'white';
                    ctx.font = '16px bold sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(draggingItem.name || '', pos.x, pos.y);
                }
                ctx.restore();
            }
        } catch (e) { /* ignore */ }
    }

    _wrapTooltipRawText(ctx, rawText, maxLineWidth) {
        if (!rawText || maxLineWidth <= 0) {
            return rawText ? rawText.split(/\r?\n/) : [''];
        }

        const lines = [];
        const paragraphs = rawText.split(/\r?\n/);
        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i];
            if (!paragraph || paragraph.length === 0) {
                if (lines.length === 0 || lines[lines.length - 1] !== '') {
                    lines.push('');
                }
            } else {
                let current = '';
                const chars = Array.from(paragraph);
                for (const ch of chars) {
                    const candidate = current + ch;
                    const width = ctx.measureText(candidate).width;
                    if (width <= maxLineWidth) {
                        current = candidate;
                    } else {
                        if (current.length > 0) {
                            lines.push(current);
                            current = ch;
                        } else {
                            lines.push(ch);
                            current = '';
                        }
                    }
                }
                if (current.length > 0) {
                    lines.push(current);
                }
            }

            if (i < paragraphs.length - 1) {
                if (lines.length === 0 || lines[lines.length - 1] !== '') {
                    lines.push('');
                }
            }
        }

        return lines.length > 0 ? lines : [''];
    }

    _shouldSuspendGame() {
        if (!this.currentScreen || !this.currentScreen.visible) return false;
        if (this.persistentScreens.has(this.currentScreen.name)) return false;
        return !!this.currentScreen.blocksGame;
    }

    _updateGameSuspension() {
        const shouldSuspend = this._shouldSuspendGame();
        if (shouldSuspend) {
            if (!this._uiSuspendsGame) {
                this._uiSuspendsGame = true;
                if (!game.isStopUpdate) {
                    game.stopUpdate();
                }
            }
        } else if (this._uiSuspendsGame) {
            this._uiSuspendsGame = false;
            if (!game.isPaused && !game.isStop) {
                game.resumeUpdate();
            }
        }
    }

    setTooltip(tip) { this._tooltip = tip; }

    /**
     * 事件处理
     * - persistentScreens 也接收事件
     * - currentScreen 接收事件
     */
    handleEvent(event) {
        const canvas = document.getElementById('ui-canvas');
        const normalizedEvent = this._normalizeCanvasEvent(event, canvas);
        const evt = normalizedEvent || event;
        const talentActive = this.currentScreen === talentScreen && this.currentScreen?.visible;
        // persistent 屏幕先处理事件
        for (let name of this.persistentScreens) {
            if (talentActive && name === itemBar.name) continue;
            const screen = this.screens[name];
            if (screen.visible && typeof screen.handleEvent === 'function') {
                if (screen.handleEvent(evt)) return;
            }
        }

        // 再处理当前操作界面事件
        if (this.currentScreen && typeof this.currentScreen.handleEvent === 'function') {
            if (this.currentScreen.handleEvent(evt)) return;
        }

        if (evt.type === "mouseup") {
            itemManager.dragging = false;
            itemManager.draggingFrom = null;
            itemManager.draggingItem = null;
            return true;
        }
        return false;
    }

    _normalizeCanvasEvent(event, canvas) {
        if (!event || !canvas || typeof event.clientX !== 'number' || typeof event.clientY !== 'number') {
            return event;
        }

        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / sizes.width || 1;
        const scaleY = rect.height / sizes.height || 1;
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const mappedX = clamp((event.clientX - rect.left) / scaleX, 0, sizes.width);
        const mappedY = clamp((event.clientY - rect.top) / scaleY, 0, sizes.height);

        const normalized = {
            type: event.type,
            offsetX: mappedX,
            offsetY: mappedY,
            clientX: event.clientX,
            clientY: event.clientY,
            movementX: event.movementX ?? 0,
            movementY: event.movementY ?? 0,
            button: event.button,
            buttons: event.buttons,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            deltaX: event.deltaX ?? 0,
            deltaY: event.deltaY ?? 0,
            deltaMode: event.deltaMode ?? 0,
            target: canvas,
            currentTarget: canvas,
            originalEvent: event,
            designX: mappedX,
            designY: mappedY,
            designScaleX: scaleX,
            designScaleY: scaleY
        };

        const noop = () => {};
        normalized.preventDefault = event.preventDefault?.bind(event) || noop;
        normalized.stopPropagation = event.stopPropagation?.bind(event) || noop;
        normalized.stopImmediatePropagation = event.stopImmediatePropagation?.bind(event) || noop;

        return normalized;
    }
}

export const uiManager = new UIManager();
const canvas = document.getElementById('ui-canvas');
// 注册事件
[
    { type: 'mousemove' },
    { type: 'mousedown' },
    { type: 'mouseup' },
    { type: 'wheel', options: { passive: false } }
].forEach(({ type, options }) => {
    canvas.addEventListener(type, e => uiManager.handleEvent(e), options);
});
uiManager.addScreen(itemBar, true);
uiManager.addScreen(pauseMenu);
uiManager.addScreen(soundSettings);
uiManager.addScreen(exchangeScreen);
uiManager.addScreen(talentScreen);