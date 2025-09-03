import { dataManager } from "./DataManager";

export class SoundManager {
    constructor() {
        if (SoundManager.instance) return SoundManager.instance;
        SoundManager.instance = this;
        this.backgroundMusic = null;
        this.init();
    }

    handleClick = () => {
        // 在用户点击后，尝试播放一个空音频或静音解锁
        const dummy = new Audio();
        dummy.muted = true;
        dummy.play().catch(() => { });
        document.removeEventListener("click", this.handleClick);
    };

    init() {
        document.addEventListener("click", this.handleClick);
    }

    async load() {
        this.sounds = {};
        // 改成标准 JSON 文件
        this.soundsURL = await dataManager.loadJSON("assets/audios/Sounds.json");

        for (const kind of Object.keys(this.soundsURL)) {
            this.sounds[kind] = {};
            for (const id of Object.keys(this.soundsURL[kind])) {
                const audio = new Audio(this.soundsURL[kind][id]);
                audio.loop = false;
                this.sounds[kind][id] = audio;
            }
        }
    }

    async playSound(kind, id = 0) {
        const sound = this.sounds[kind] && this.sounds[kind][id];
        if (sound) {
            if (!sound.paused) {
                if (kind === "walk") return;
                const copy = sound.cloneNode();
                copy.currentTime = 0;
                copy.play().catch((error) => {
                    console.error(`Error playing sound: ${kind + id}`, error);
                });
            } else {
                sound.currentTime = 0;
                sound.play().catch((error) => {
                    console.error(`Error playing sound: ${kind + id}`, error);
                });
            }
        }
        else {
            // console.warn(`SoundManager: 音效不存在 kind='${kind}' id='${id}'`);//TODO:调试暂时关闭
        }
    }
}

export const soundManager = new SoundManager();
