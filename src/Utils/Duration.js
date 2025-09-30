export class Duration {
    /**
     * @param {number} duration 持续时间，单位 ms
     */
    constructor(duration = 0) {
        this.duration = duration; // 总时间
        this.remainingTime = 0;   // 剩余时间
    }

    /** 开始计时 */
    start(duration = null) {
        if (duration !== null) this.duration = duration;
        this.remainingTime = this.duration;
    }

    /** 每帧更新 dt 单位 ms */
    tick(dt) {
        this.remainingTime = Math.max(0, this.remainingTime - dt);
    }

    /** 是否计时结束 */
    expired() {
        return this.remainingTime <= 0;
    }
    finished() {
        return this.expired();
    }

    /** 重置计时器 */
    reset() {
        this.remainingTime = 0;
    }

    /** 获取剩余时间 */
    remaining() {
        return this.remainingTime;
    }

    /** 设置总时间 */
    set(duration) {
        this.duration = duration;
    }
}
