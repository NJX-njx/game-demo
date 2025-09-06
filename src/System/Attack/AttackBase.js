import { soundManager } from "../../Manager/SoundManager";
export class AttackBase {
    constructor(owner, type) {
        this.owner = owner;
        this.type = type;

        this.state = "idle";
        this.timer = 0;
    }

    get damage() { return this.owner.state.attack.damage[this.type]; }
    get startupTime() { return this.owner.state.attack.startupTime[this.type]; }
    get recoveryTime() { return this.owner.state.attack.recoveryTime[this.type]; }
    get targetSelector() { return this.owner.attack.targetSelector; }

    trigger() {
        if (this.state === "idle") {
            this.state = "startup";
            this.timer = this.startupTime;
            return true;
        }
        return false;
    }

    update(deltaTime) {
        if (this.state === "idle") return;

        this.timer -= deltaTime;
        if (this.timer > 0) return;

        switch (this.state) {
            case "startup":
                this.enterActive();
                break;
            case "active":
                this.enterRecovery();
                break;
            case "recovery":
                this.state = "idle";
                break;
        }
    }

    enterActive() {
        this.state = "active";
        soundManager.playSound(this.owner.type, this.type + "Attack");
        this.onHit(this.owner, this.damage);
    }

    enterRecovery() {
        this.state = "recovery";
        this.timer = this.recoveryTime;
    }

    onHit(owner, damage) { }
}