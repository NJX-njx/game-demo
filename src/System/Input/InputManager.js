import { mouseManager } from "./MouseManager";
import { keyboardManager } from "./KeyboardManager";
class InputManager {
    constructor() {
        this.mouse = mouseManager;
        this.keyboard = keyboardManager

        this.keyPrevState = new Map();
        this.keyCurrState = new Map();
    }

    // 每帧调用一次，更新状态
    update() {
        const allKeys = [...this.keyboard.KEYMAP.values(), "ClickLeft", "ClickRight"];
        allKeys.forEach((key) => {
            this.keyPrevState.set(key, this.keyCurrState.get(key) || false);
            this.keyCurrState.set(key, this.isKeyDown(key));
        });
    }

    // 是否按下
    isKeyDown(key) {
        if (key === "ClickLeft") return this.mouse.left;
        if (key === "ClickRight") return this.mouse.right;
        return this.keyboard.isKeyDown(key);
    }

    // 检测多个按键是否有一个按下
    isKeysDown(keys) {
        return keys.some((key) => this.isKeyDown(key));
    }

    // 检测多个按键是否全部按下
    isAllKeysDown(keys) {
        return keys.every((key) => this.isKeyDown(key));
    }

    // 是否为第一次按下
    isFirstDown(key) {
        return this.keyCurrState.get(key) && !this.keyPrevState.get(key);
    }

    // 是否持续按住
    isHeld(key) {
        return this.keyCurrState.get(key);
    }

    // 是否刚刚松开
    isReleased(key) {
        return !this.keyCurrState.get(key) && this.keyPrevState.get(key);
    }
}

export const inputManager = new InputManager()