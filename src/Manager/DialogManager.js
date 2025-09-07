// DialogManager.js
import { inputManager } from "./Manager/InputManager";
import { soundManager } from "./Manager/SoundManager";
import { game } from "./Game";

class DialogManager {
    static instance;
    
    constructor() {
        if (DialogManager.instance) return DialogManager.instance;
        DialogManager.instance = this;

        this.dialogContainer = document.querySelector('.dialogue-container');
        this.characterNameEl = document.getElementById('character-name');
        this.dialogTextEl = document.getElementById('dialog-text');
        
        this.isRunning = false;
        this.currentDialogs = [];
        this.dialogEndCallback = null;
    }

    #delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async #open() {
        this.characterNameEl.textContent = '';
        this.dialogTextEl.innerHTML = '';
        this.dialogContainer.classList.add('fadeIn');
        
        game.pause();
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        await this.#delay(300);
    }

    async #close() {
        this.dialogContainer.classList.remove('fadeIn');
        await this.#delay(300);
        

        this.isRunning = false;
        inputManager.reset();
        
        game.continue();
        game.mouseManager.capture();
        
        if (this.dialogEndCallback) {
            this.dialogEndCallback();
            this.dialogEndCallback = null;
        }
    }
    #isSkip() {
        const ctrlOnce = inputManager.isFirstDown('LCtrl') || inputManager.isFirstDown('RCtrl');
        const space = inputManager.isFirstDown('Space');
        const enter = inputManager.isFirstDown('Enter');
        const leftClick = inputManager.isFirstDown('ClickLeft');
        return ctrlOnce || space || enter || leftClick;
    }

    #isSpeedUp() {
        return inputManager.isHeld('LCtrl') || inputManager.isHeld('RCtrl');
    }

    #isClose() {
        return inputManager.isFirstDown('Esc');
    }

    async #printWordByWord(content) {
        this.dialogTextEl.innerHTML = '';
        const chars = content.split('');
        let printed = 0;

        while (printed < chars.length && this.isRunning) {
            if (this.#isClose()) break;

            if (this.#isSkip()) {
                const remaining = chars.slice(printed).join('');
                this.dialogTextEl.innerHTML += `<span>${remaining}</span>`;
                printed = chars.length;
                await this.#delay(100);
                break;
            }

            const span = document.createElement('span');
            span.textContent = chars[printed];
            this.dialogTextEl.appendChild(span);
            printed++;

            const delayTime = this.#isSpeedUp() ? 10 : 50;
            await this.#delay(delayTime);
        }
    }

    // 等待用户输入
    async #waitForKey() {
        while (this.isRunning) {
            if (this.#isClose()) break;
            if (this.#isSkip()) {
                inputManager.reset();
                break;
            }
            await this.#delay(20);
        }
    }


    startDialog(dialogs, endCallback) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.currentDialogs = [...dialogs];
        this.dialogEndCallback = endCallback;
        this.#runLoop();
    }
    async #runLoop() {
        await this.#open();

        for (const dialog of this.currentDialogs) {
            if (!this.isRunning || this.#isClose()) break;
            const { text: rawText, url } = dialog;
            let roleName = '';
            let content = '';

            if (rawText.startsWith('【')) {
                const endIdx = rawText.indexOf('】');
                if (endIdx > 0) {
                    roleName = rawText.slice(1, endIdx);
                    content = rawText.slice(endIdx + 1).trim();
                }
            } else {
                content = rawText;
            }
            this.characterNameEl.textContent = roleName;
            if (url) soundManager.playSound(url);
            await this.#printWordByWord(content);
            if (this.#isClose()) break;
            await this.#waitForKey();
        }

        await this.#close();
    }

    closeDialog() {
        if (this.isRunning) {
            this.isRunning = false;
            this.#close();
        }
    }
}

export const dialogManager = new DialogManager();
