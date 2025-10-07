/**
 * 剧情模式管理器
 * 负责控制游戏中剧情的开启和关闭
 */

class PlotModeManager {
    constructor() {
        if (PlotModeManager.instance) return PlotModeManager.instance;
        PlotModeManager.instance = this;

        // 默认剧情模式为开启
        this.plotMode = 'on';
        
        // 从localStorage加载设置
        this.loadSettings();
    }

    /**
     * 从localStorage加载剧情模式设置
     */
    loadSettings() {
        try {
            const savedMode = localStorage.getItem('plot_mode');
            if (savedMode === 'on' || savedMode === 'off') {
                this.plotMode = savedMode;
                console.log(`剧情模式管理器: 加载设置 - ${this.plotMode === 'on' ? '有剧情' : '无剧情'}`);
            }
        } catch (error) {
            console.warn('加载剧情模式设置失败，使用默认值:', error);
            this.plotMode = 'on';
        }
    }

    /**
     * 设置剧情模式
     * @param {string} mode - 'on' 或 'off'
     */
    setPlotMode(mode) {
        if (mode !== 'on' && mode !== 'off') {
            console.warn('无效的剧情模式设置:', mode);
            return;
        }

        this.plotMode = mode;
        
        try {
            localStorage.setItem('plot_mode', mode);
            console.log(`剧情模式管理器: 设置已更新 - ${mode === 'on' ? '有剧情' : '无剧情'}`);
        } catch (error) {
            console.error('保存剧情模式设置失败:', error);
        }
    }

    /**
     * 获取当前剧情模式
     * @returns {string} 'on' 或 'off'
     */
    getPlotMode() {
        return this.plotMode;
    }

    /**
     * 检查是否开启剧情模式
     * @returns {boolean}
     */
    isPlotEnabled() {
        return this.plotMode === 'on';
    }

    /**
     * 检查是否关闭剧情模式
     * @returns {boolean}
     */
    isPlotDisabled() {
        return this.plotMode === 'off';
    }

    /**
     * 切换剧情模式
     */
    togglePlotMode() {
        const newMode = this.plotMode === 'on' ? 'off' : 'on';
        this.setPlotMode(newMode);
        return newMode;
    }

    /**
     * 获取剧情模式的中文描述
     * @returns {string}
     */
    getPlotModeDescription() {
        return this.plotMode === 'on' ? '有剧情' : '无剧情';
    }
}

// 创建单例实例
export const plotModeManager = new PlotModeManager();
