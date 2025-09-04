export class Item {
    /**
     * @param {Object} config 
     * @param {string} config.id - 唯一ID
     * @param {string} config.name - 名称
     * @param {number} config.level - 等级
     * @param {string[]} [config.tags] - 特殊属性标签
     * @param {Object} [config.effects] - 面板修正
     * @param {Object} [config.hooks] - 事件触发器
     */
    constructor({ id, name, level = 1, tags = [], effects = {}, hooks = {} }) {
        this.id = id;
        this.name = name;
        this.level = level;
        this.tags = tags;
        this.effects = effects;
        this.hooks = hooks;
    }
}
