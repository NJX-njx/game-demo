export class Cooldown {
    constructor(sec = 0) {
        this.t = 0;
        this.cd = sec;
    }
    start() {
        this.t = this.cd;
    }
    tick(dt) {
        this.t = Math.max(0, this.t - dt);
    }
    ready() {
        return this.t === 0;
    }
    reset() {
        this.t = 0;
    }
    set(sec = 0) {
        this.cd = sec;
    }
}