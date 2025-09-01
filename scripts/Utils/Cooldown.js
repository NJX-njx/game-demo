class Cooldown {
    constructor(CooldownMaxTime) {
        this.maxTime = CooldownMaxTime;
        this.timer = 0;
    }
    start() {
        this.timer = this.maxTime;
    }
    tick(deltaTime) {
        if (this.timer > 0) this.timer -= deltaTime;
        else this.timer = 0;
    }
    ready() {
        return this.timer === 0;
    }
}