import { itemBar } from "./Screens/ItemBarSeen";
import { itemManager } from "../Item/ItemManager";
import { pauseMenu } from "./Screens/PauseMenu";
import { soundSettings } from "./Screens/SoundSettings";

class UIManager {
    static instance;

    constructor() {
        if (UIManager.instance) return UIManager.instance;
        UIManager.instance = this;

        this.screens = {};              // 所有界面
        this.currentScreen = null;      // 当前操作界面
        this.persistentScreens = new Set(); // 一直显示的界面
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
     */
    switchScreen(screenName) {
        if (this.currentScreen && !this.persistentScreens.has(this.currentScreen.name)) {
            this.currentScreen.hide();
        }

        this.currentScreen = this.screens[screenName];
        this.currentScreen?.show();
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