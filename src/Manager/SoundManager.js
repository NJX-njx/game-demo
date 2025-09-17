import { dataManager } from "./DataManager";

class SoundManager {
    constructor() {
        if (SoundManager.instance) return SoundManager.instance;
        SoundManager.instance = this;
        this.backgroundMusic = null;
        this.audioPool = new Map(); // 音效池
        this.volume = 1.0; // 全局音量
        this.masterVolume = 1.0; // 主音量
        this.sfxVolume = 1.0; // 音效音量
        this.musicVolume = 1.0; // 音乐音量
        this.maxInstances = 10; // 每个音效的最大实例数
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
        // 从localStorage加载音量设置
        this.loadVolumeSettings();
    }

    /**
     * 设置主音量
     * @param {number} volume 音量值 (0-1)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
        this.saveVolumeSettings();
    }

    /**
     * 设置音效音量
     * @param {number} volume 音量值 (0-1)
     */
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
        this.saveVolumeSettings();
    }

    /**
     * 设置音乐音量
     * @param {number} volume 音量值 (0-1)
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
        this.saveVolumeSettings();
    }

    /**
     * 更新所有音频的音量
     */
    updateAllVolumes() {
        // 更新音效池中的音量
        for (const [key, pool] of this.audioPool.entries()) {
            pool.forEach(audio => {
                audio.volume = this.getEffectiveVolume(key);
            });
        }
        
        // 更新背景音乐音量
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = this.masterVolume * this.musicVolume;
        }
    }

    /**
     * 获取有效音量
     * @param {string} soundKey 音效键名
     * @returns {number} 有效音量
     */
    getEffectiveVolume(soundKey) {
        // 根据音效类型选择对应的音量
        const isMusic = soundKey.includes('music') || soundKey.includes('bgm');
        const baseVolume = isMusic ? this.musicVolume : this.sfxVolume;
        return this.masterVolume * baseVolume;
    }

    /**
     * 保存音量设置到localStorage
     */
    saveVolumeSettings() {
        try {
            const settings = {
                masterVolume: this.masterVolume,
                sfxVolume: this.sfxVolume,
                musicVolume: this.musicVolume
            };
            localStorage.setItem('soundSettings', JSON.stringify(settings));
        } catch (e) {
            console.warn('保存音量设置失败:', e);
        }
    }

    /**
     * 从localStorage加载音量设置
     */
    loadVolumeSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('soundSettings'));
            if (settings) {
                this.masterVolume = settings.masterVolume || 1.0;
                this.sfxVolume = settings.sfxVolume || 1.0;
                this.musicVolume = settings.musicVolume || 1.0;
            }
        } catch (e) {
            console.warn('加载音量设置失败:', e);
        }
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

    /**
     * 播放音效（使用音效池）
     * @param {string} kind 音效类型
     * @param {string|number} id 音效ID
     * @param {Object} options 播放选项
     * @param {number} options.volume 音量覆盖 (0-1)
     * @param {boolean} options.loop 是否循环
     * @param {boolean} options.force 是否强制播放（即使已有实例在播放）
     */
    async playSound(kind, id = 0, options = {}) {
        const soundKey = `${kind}_${id}`;
        const sound = this.sounds[kind] && this.sounds[kind][id];
        
        if (!sound) {
            // console.warn(`SoundManager: 音效不存在 kind='${kind}' id='${id}'`);
            return;
        }

        // 获取或创建音效池
        if (!this.audioPool.has(soundKey)) {
            this.audioPool.set(soundKey, []);
        }
        
        const pool = this.audioPool.get(soundKey);
        
        // 查找可用的音频实例
        let audio = pool.find(a => a.paused);
        
        // 如果没有可用实例且未达到最大实例数，创建新实例
        if (!audio && pool.length < this.maxInstances) {
            audio = sound.cloneNode();
            audio.volume = options.volume || this.getEffectiveVolume(soundKey);
            audio.loop = options.loop || false;
            pool.push(audio);
        }
        
        // 如果仍然没有可用实例，且不是强制播放，则跳过
        if (!audio && !options.force) {
            if (kind === "walk") return; // 脚步声可以跳过
            return;
        }
        
        // 如果仍然没有可用实例，使用第一个实例（强制播放）
        if (!audio) {
            audio = pool[0];
        }
        
        // 播放音效
        if (audio) {
            audio.currentTime = 0;
            audio.volume = options.volume || this.getEffectiveVolume(soundKey);
            audio.loop = options.loop || false;
            
            try {
                await audio.play();
            } catch (error) {
                console.error(`播放音效失败: ${soundKey}`, error);
            }
        }
    }

    /**
     * 停止指定音效
     * @param {string} kind 音效类型
     * @param {string|number} id 音效ID
     */
    stopSound(kind, id = 0) {
        const soundKey = `${kind}_${id}`;
        const pool = this.audioPool.get(soundKey);
        
        if (pool) {
            pool.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
        }
    }

    /**
     * 停止所有音效
     */
    stopAllSounds() {
        for (const pool of this.audioPool.values()) {
            pool.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
        }
    }

    /**
     * 清理音效池（移除暂停的音频实例）
     */
    cleanupAudioPool() {
        for (const [key, pool] of this.audioPool.entries()) {
            // 保留一个实例，移除其他暂停的实例
            const activeInstances = pool.filter(audio => !audio.paused);
            const pausedInstances = pool.filter(audio => audio.paused);
            
            // 保留一个暂停的实例作为备用
            if (pausedInstances.length > 1) {
                const toRemove = pausedInstances.slice(1);
                toRemove.forEach(audio => {
                    const index = pool.indexOf(audio);
                    if (index > -1) {
                        pool.splice(index, 1);
                    }
                });
            }
        }
    }

    /**
     * 播放背景音乐
     * @param {string} kind 音乐类型
     * @param {string|number} id 音乐ID
     * @param {Object} options 播放选项
     * @param {number} options.volume 音量覆盖 (0-1)
     * @param {boolean} options.loop 是否循环
     * @param {boolean} options.fadeIn 是否淡入
     * @param {number} options.fadeTime 淡入时间（毫秒）
     */
    async playBackgroundMusic(kind, id = 0, options = {}) {
        const musicKey = `${kind}_${id}`;
        const music = this.sounds[kind] && this.sounds[kind][id];
        
        if (!music) {
            console.warn(`背景音乐不存在: ${musicKey}`);
            return;
        }

        // 停止当前背景音乐
        if (this.backgroundMusic) {
            await this.stopBackgroundMusic(options.fadeTime || 1000);
        }

        // 创建新的背景音乐实例
        this.backgroundMusic = music.cloneNode();
        this.backgroundMusic.loop = options.loop !== false; // 默认循环
        this.backgroundMusic.volume = 0; // 初始音量为0，用于淡入效果
        
        try {
            await this.backgroundMusic.play();
            
            // 淡入效果
            if (options.fadeIn !== false) {
                await this.fadeIn(this.backgroundMusic, options.fadeTime || 1000);
            } else {
                this.backgroundMusic.volume = this.masterVolume * this.musicVolume;
            }
        } catch (error) {
            console.error(`播放背景音乐失败: ${musicKey}`, error);
        }
    }

    /**
     * 停止背景音乐
     * @param {number} fadeTime 淡出时间（毫秒）
     */
    async stopBackgroundMusic(fadeTime = 1000) {
        if (!this.backgroundMusic) return;

        try {
            if (fadeTime > 0) {
                await this.fadeOut(this.backgroundMusic, fadeTime);
            }
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
            this.backgroundMusic = null;
        } catch (error) {
            console.error('停止背景音乐失败:', error);
        }
    }

    /**
     * 淡入效果
     * @param {HTMLAudioElement} audio 音频元素
     * @param {number} duration 淡入时间（毫秒）
     */
    async fadeIn(audio, duration = 1000) {
        const targetVolume = this.masterVolume * this.musicVolume;
        const steps = 50; // 淡入步数
        const stepTime = duration / steps;
        const volumeStep = targetVolume / steps;

        for (let i = 0; i < steps; i++) {
            audio.volume = volumeStep * (i + 1);
            await new Promise(resolve => setTimeout(resolve, stepTime));
        }
        audio.volume = targetVolume;
    }

    /**
     * 淡出效果
     * @param {HTMLAudioElement} audio 音频元素
     * @param {number} duration 淡出时间（毫秒）
     */
    async fadeOut(audio, duration = 1000) {
        const initialVolume = audio.volume;
        const steps = 50; // 淡出步数
        const stepTime = duration / steps;
        const volumeStep = initialVolume / steps;

        for (let i = 0; i < steps; i++) {
            audio.volume = initialVolume - (volumeStep * (i + 1));
            await new Promise(resolve => setTimeout(resolve, stepTime));
        }
        audio.volume = 0;
    }
}

export const soundManager = new SoundManager();
