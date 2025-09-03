import { textureManager } from "./TextureManager";
import { game } from "../Game";
class MouseManager {
    constructor() {
        if (MouseManager.instance)
            return MouseManager.instance;
        MouseManager.instance = this;
        this.canvas = document.getElementById('canvas');
        this.container = document.querySelector("#game-container");
        this.isCapture = false;
        this.ratio = this.canvas.width / this.container.clientWidth;
        this.x = 0;
        this.y = 0;
        this.prevX = 0;
        this.prevY = 0;

        /**
         * @readonly
         * @type {boolean}
         */
        this.left = false;

        /**
         * @readonly
         * @type {boolean}
         */
        this.right = false;

        this.clickable = false;

        this.container.addEventListener('click', () => this.capture());
        this.container.addEventListener('mousemove', (e) => this.move(e));
        this.container.addEventListener('mousedown', (e) => this.mouseDown(e));
        this.container.addEventListener('mouseup', (e) => this.mouseUp(e));

        document.addEventListener('pointerlockchange', () => this.uncapture());
        document.addEventListener('visibilitychange', () => this.blur());
        document.addEventListener("click", () => game.continue());
    }

    async capture() {
        if (!this.isCapture) {
            await this.container.requestPointerLock({
                unadjustedMovement: false,
            });

            this.isCapture = true;
            setTimeout(() => {
                this.clickable = true;
            }, 200);
        }
    }

    blur() {
        if (document.visibilityState === 'hidden') {
            document.exitPointerLock();
            this.uncapture();
        }
    }

    uncapture() {
        console.debug("uncapture: ", document.pointerLockElement, this.container);
        console.debug("uncapture: ", document.pointerLockElement !== this.container);
        if (document.pointerLockElement !== this.container) {
            this.isCapture = false;
            game.pause();
        }
        this.clickable = false;
    }

    mouseDown(e) {
        e.preventDefault();
        if (!this.clickable) return;
        if (e.button === 0) {
            this.left = true;
        }
        if (e.button === 2) {
            this.right = true;
        }
    }

    mouseUp(e) {
        e.preventDefault();
        if (e.button === 0) {
            this.left = false;
        }
        if (e.button === 2) {
            this.right = false;
        }
    }

    /**
     *
     * @param {MouseEvent} e
     */
    move(e) {
        e.preventDefault();
        if (this.isCapture) {
            this.ratio = this.canvas.width / this.container.clientWidth;
            this.x += e.layerX - this.prevX;
            this.y += e.layerY - this.prevY;

            this.prevX = e.layerX;
            this.prevY = e.layerY;

            this.x += e.movementX * this.ratio;
            this.y += e.movementY * this.ratio;
            // console.log(this.x, this.y, this.ratio);
            if (this.x < 0) {
                this.x = 0;
            }
            if (this.y < 0) {
                this.y = 0;
            }
            if (this.x > this.canvas.width) {
                this.x = this.canvas.width;
            }
            if (this.y > this.canvas.height) {
                this.y = this.canvas.height;
            }
        }
    }

    draw(ctx) {
        ctx.drawImage(textureManager.getTexture("cursor"), 12, 9, 16, 22, this.x - 4, this.y - 5, 16, 22);
    }

    get position() {
        return new Vector(this.x, this.y);
    }
}

class KeyboardManager {
    /** @type {Map<string, boolean>} */
    status;

    KEYMAP = new Map([
        // Modifier Keys
        ['ShiftLeft', 'LShift'],
        ['ShiftRight', 'RShift'],
        ['ControlLeft', 'LCtrl'],
        ['ControlRight', 'RCtrl'],
        ['AltLeft', 'LAlt'],
        ['AltRight', 'RAlt'],
        ['MetaLeft', 'LWin'],
        ['MetaRight', 'RWin'],

        // Function Keys
        ['Escape', 'Esc'],
        ['F1', 'F1'],
        ['F2', 'F2'],
        ['F3', 'F3'],
        ['F4', 'F4'],
        ['F5', 'F5'],
        ['F6', 'F6'],
        ['F7', 'F7'],
        ['F8', 'F8'],
        ['F9', 'F9'],
        ['F10', 'F10'],
        ['F11', 'F11'],
        ['F12', 'F12'],

        // Alphanumeric Keys
        ['Digit0', '0'],
        ['Digit1', '1'],
        ['Digit2', '2'],
        ['Digit3', '3'],
        ['Digit4', '4'],
        ['Digit5', '5'],
        ['Digit6', '6'],
        ['Digit7', '7'],
        ['Digit8', '8'],
        ['Digit9', '9'],

        ['KeyA', 'A'],
        ['KeyB', 'B'],
        ['KeyC', 'C'],
        ['KeyD', 'D'],
        ['KeyE', 'E'],
        ['KeyF', 'F'],
        ['KeyG', 'G'],
        ['KeyH', 'H'],
        ['KeyI', 'I'],
        ['KeyJ', 'J'],
        ['KeyK', 'K'],
        ['KeyL', 'L'],
        ['KeyM', 'M'],
        ['KeyN', 'N'],
        ['KeyO', 'O'],
        ['KeyP', 'P'],
        ['KeyQ', 'Q'],
        ['KeyR', 'R'],
        ['KeyS', 'S'],
        ['KeyT', 'T'],
        ['KeyU', 'U'],
        ['KeyV', 'V'],
        ['KeyW', 'W'],
        ['KeyX', 'X'],
        ['KeyY', 'Y'],
        ['KeyZ', 'Z'],

        // Navigation Keys
        ['ArrowUp', 'Up'],
        ['ArrowDown', 'Down'],
        ['ArrowLeft', 'Left'],
        ['ArrowRight', 'Right'],
        ['Home', 'Home'],
        ['End', 'End'],
        ['PageUp', 'Page Up'],
        ['PageDown', 'Page Down'],

        // Control Keys
        ['Enter', 'Enter'],
        ['Space', 'Space'],
        ['Backspace', 'Backspace'],
        ['Tab', 'Tab'],
        ['Delete', 'Delete'],
        ['Insert', 'Insert'],
        ['CapsLock', 'Caps Lock'],
        ['NumLock', 'Num Lock'],
        ['ScrollLock', 'Scroll Lock'],
        ['Pause', 'Pause'],
        ['PrintScreen', 'Print Screen'],

        // Numpad Keys
        ['Numpad0', 'NUMPAD0'],
        ['Numpad1', 'NUMPAD1'],
        ['Numpad2', 'NUMPAD2'],
        ['Numpad3', 'NUMPAD3'],
        ['Numpad4', 'NUMPAD4'],
        ['Numpad5', 'NUMPAD5'],
        ['Numpad6', 'NUMPAD6'],
        ['Numpad7', 'NUMPAD7'],
        ['Numpad8', 'NUMPAD8'],
        ['Numpad9', 'NUMPAD9'],
        ['NumpadMultiply', 'Mul'],
        ['NumpadAdd', 'Add'],
        ['NumpadSubtract', 'Sub'],
        ['NumpadDecimal', 'Dec'],
        ['NumpadDivide', 'Div'],

        // Miscellaneous
        ['ContextMenu', 'Apps'],
        ['Help', 'Help']
    ]);

    constructor() {
        if (KeyboardManager.instance)
            return KeyboardManager.instance;
        KeyboardManager.instance = this;
        this.status = new Map();

        this.KEYMAP.forEach((value, key) => {
            this.status.set(value, false);
        });

        document.addEventListener("keydown", (event) => {
            const key = this.KEYMAP.get(event.code);
            if (this.status.has(key)) {
                this.status.set(key, true);
            }
        });

        document.addEventListener("keyup", (event) => {
            const key = this.KEYMAP.get(event.code);
            if (this.status.has(key)) {
                this.status.set(key, false);
            }
        });
        addEventListener("keydown", (e) => { e.preventDefault(); });
    }

    isKeyDown(key) {
        return this.status.get(key) || false;
    }

    isKeysDown(keys) {
        let ans = false;
        keys.forEach((key) => {
            ans = ans || this.isKeyDown(key);
        });
        return ans;
    }
}

export class InputManager {
    constructor() {
        this.keyboard = new KeyboardManager();
        this.mouse = new MouseManager();

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