import { itemBar } from "./Screens/ItemBarSeen";
import { itemManager } from "../Item/ItemManager";
import { pauseMenu } from "./Screens/PauseMenu";
import { soundSettings } from "./Screens/SoundSettings";
import { exchangeScreen } from "./Screens/ExchangeScreen";

class UIManager {
    static instance;

    constructor() {
        if (UIManager.instance) return UIManager.instance;
        UIManager.instance = this;

        this.screens = {};              // 所有界面
        this.currentScreen = null;      // 当前操作界面
        this.persistentScreens = new Set(); // 一直显示的界面
        this._history = []; // 已打开的界面历史栈
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
        }
    }

    /**
     * 绘制所有界面
     * - persistentScreens 永远绘制
     * - currentScreen 绘制
     */
    draw(ctx) {
        // 绘制 persistent 屏幕
        for (let name of this.persistentScreens) {
            const screen = this.screens[name];
            if (screen.visible) screen.draw(ctx);
        }

        // 绘制当前操作界面（如果不是 persistent 的话，避免重复绘制）
        if (this.currentScreen && !this.persistentScreens.has(this.currentScreen.name)) {
            if (this.currentScreen.visible) this.currentScreen.draw(ctx);
        }
    }

    /**
     * 事件处理
     * - persistentScreens 也接收事件
     * - currentScreen 接收事件
     */
    handleEvent(event) {
        // persistent 屏幕先处理事件
        for (let name of this.persistentScreens) {
            const screen = this.screens[name];
            if (screen.visible && typeof screen.handleEvent === 'function') {
                if (screen.handleEvent(event)) return;
            }
        }

        // 再处理当前操作界面事件
        if (this.currentScreen && typeof this.currentScreen.handleEvent === 'function') {
            if (this.currentScreen.handleEvent(event)) return;
        }

        if (event.type === "mouseup") {
            itemManager.dragging = false;
            itemManager.draggingFrom = null;
            itemManager.draggingItem = null;
            return true;
        }
    }
}

export const uiManager = new UIManager();
const canvas = document.getElementById('ui-canvas');
// 注册事件
['mousemove', 'mousedown', 'mouseup'].forEach(type => {
    canvas.addEventListener(type, e => uiManager.handleEvent(e));
});
uiManager.addScreen(itemBar, true);
uiManager.addScreen(pauseMenu);
uiManager.addScreen(soundSettings);
uiManager.addScreen(exchangeScreen);