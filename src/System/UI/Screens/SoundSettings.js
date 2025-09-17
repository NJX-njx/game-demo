import { UIScreen } from "../base/UIScreen";
import { soundManager } from "../../../Manager/SoundManager";

/**
 * 音效设置界面
 */
export class SoundSettings extends UIScreen {
    constructor() {
        super("soundSettings");
        this.visible = false;
        this.container = null; // 延迟创建容器
    }

    setupUI() {
        // 如果容器已存在，直接返回
        if (this.container) return;
        
        // 创建音量控制容器
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            padding: 20px;
            border-radius: 10px;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 1000;
            min-width: 300px;
            display: none;
        `;

        // 主音量控制
        this.createVolumeControl('主音量', 'masterVolume', soundManager.masterVolume);
        
        // 音效音量控制
        this.createVolumeControl('音效音量', 'sfxVolume', soundManager.sfxVolume);
        
        // 音乐音量控制
        this.createVolumeControl('音乐音量', 'musicVolume', soundManager.musicVolume);

        // 关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.cssText = `
            margin-top: 15px;
            padding: 8px 16px;
            background: #333;
            color: white;
            border: 1px solid #555;
            border-radius: 5px;
            cursor: pointer;
        `;
        closeButton.addEventListener('click', () => {
            this.hide();
        });

        this.container.appendChild(closeButton);
        document.body.appendChild(this.container);
    }

    /**
     * 创建音量控制组件
     * @param {string} label 标签文本
     * @param {string} volumeType 音量类型
     * @param {number} initialVolume 初始音量
     */
    createVolumeControl(label, volumeType, initialVolume) {
        const controlDiv = document.createElement('div');
        controlDiv.style.cssText = `
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        const labelElement = document.createElement('label');
        labelElement.textContent = label;
        labelElement.style.cssText = `
            min-width: 80px;
            font-size: 14px;
        `;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.value = Math.round(initialVolume * 100);
        slider.style.cssText = `
            flex: 1;
            height: 20px;
        `;

        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = `${Math.round(initialVolume * 100)}%`;
        valueDisplay.style.cssText = `
            min-width: 40px;
            text-align: right;
            font-size: 12px;
        `;

        // 音量变化处理
        slider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            valueDisplay.textContent = `${e.target.value}%`;
            
            // 调用对应的音量设置方法
            switch (volumeType) {
                case 'masterVolume':
                    soundManager.setMasterVolume(volume);
                    break;
                case 'sfxVolume':
                    soundManager.setSfxVolume(volume);
                    break;
                case 'musicVolume':
                    soundManager.setMusicVolume(volume);
                    break;
            }
        });

        controlDiv.appendChild(labelElement);
        controlDiv.appendChild(slider);
        controlDiv.appendChild(valueDisplay);
        this.container.appendChild(controlDiv);
    }

    show() {
        this.visible = true;
        // 首次显示时才创建UI
        this.setupUI();
        this.container.style.display = 'block';
    }

    hide() {
        this.visible = false;
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    draw(ctx) {
        // 这个UI使用DOM元素，不需要Canvas绘制
    }

    handleEvent(event) {
        if (event.type === 'keydown' && event.key === 'Escape') {
            this.hide();
            return true;
        }
        return false;
    }
}

export const soundSettings = new SoundSettings();
