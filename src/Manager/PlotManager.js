
/**
 * 剧情管理器
 * 管理游戏中的剧情触发和显示
 */

import { dialogManager } from '../Manager/DialogManager';
import { eventBus, EventTypes } from '../Manager/EventBus';

class PlotManager {
    constructor() {
        this.plotData = null;
        this.loadPlotData();
        this.setupEventListeners();
    }

    /**
     * 加载剧情数据
     */
    async loadPlotData() {
        try {
            const response = await fetch('Plot.V3/plot-data.json');
            this.plotData = await response.json();
            console.log('剧情数据加载完成');
        } catch (error) {
            console.error('加载剧情数据失败:', error);
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        eventBus.on(EventTypes.PLOT_TRIGGER, this.handlePlotTrigger.bind(this));
    }

    /**
     * 处理剧情触发
     * @param {string} eventId 事件ID
     */
    handlePlotTrigger(eventId) {
        const plotInfo = this.parseEventId(eventId);
        if (!plotInfo) return;

        const sceneData = this.plotData?.plotData[plotInfo.chapter]?.[plotInfo.scene];
        if (!sceneData) return;

        const trigger = sceneData.triggers.find(t => t.id === plotInfo.triggerId);
        if (!trigger || !trigger.dialogs || !trigger.dialogs.length) return;

        // 显示剧情对话
        this.showPlotDialogue(trigger.dialogs);
    }

    /**
     * 解析事件ID
     * @param {string} eventId 事件ID
     * @returns {Object|null} 解析结果
     */
    parseEventId(eventId) {
        const match = eventId.match(/plot(\d+)-(\d+)-(.+)/);
        if (match) {
            return {
                chapter: match[1],
                scene: match[2],
                triggerId: match[3]
            };
        }
        return null;
    }

    /**
     * 显示剧情对话
     * @param {Array} dialogues 对话数组
     */
    showPlotDialogue(dialogues) {
        if (!dialogManager) {
            console.error('DialogManager未初始化');
            return;
        }

        // 将对话添加到缓冲区
        dialogues.forEach(dialog => {
            dialogManager.addToBuffer(dialog.speaker, dialog.text);
        });

        // 开始显示对话
        dialogManager.startDialog();
    }

    /**
     * 获取场景标题
     * @param {string} chapter 章节编号
     * @param {string} scene 场景编号
     * @returns {string} 场景标题
     */
    getSceneTitle(chapter, scene) {
        return this.plotData?.plotData[chapter]?.[scene]?.title || '';
    }
}

// 创建单例实例
export const plotManager = new PlotManager();
