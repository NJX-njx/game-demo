import { soundManager } from "../../Manager/SoundManager";
import { eventBus as bus } from "../../Manager/EventBus";

export class AttackBase {
    constructor(owner, type, options = { getDamage: null, getStartupTime: null, getRecoveryTime: null, getTargets: null }) {
        this.owner = owner;
        this.type = type;

        this.getDamage = options.getDamage || (() => {
            try {
                const val = this.owner.state.attack.damage[this.type];
                if (val !== undefined)
                    return val;
                else
                    console.warn(`AttackBase: damage for attack type "${this.type}" not found on owner "${this.owner && this.owner.type ? this.owner.type : '<unknown>'}". Returning 0.`);
                return 0;
            } catch (e) {
                console.warn(`AttackBase: error reading damage for owner "${this.owner && this.owner.type ? this.owner.type : '<unknown>'}":`, e);
                return 0;
            }
        });

        this.getStartupTime = options.getStartupTime || (() => {
            try {
                const val = this.owner.state.attack.startupTime[this.type];
                if (val !== undefined)
                    return val;
                else
                    console.warn(`AttackBase: startupTime for attack type "${this.type}" not found on owner "${this.owner && this.owner.type ? this.owner.type : '<unknown>'}". Returning 0.`);
                return 0;
            } catch (e) {
                console.warn(`AttackBase: error reading startupTime for owner "${this.owner && this.owner.type ? this.owner.type : '<unknown>'}":`, e);
                return 0;
            }
        });

        this.getRecoveryTime = options.getRecoveryTime || (() => {
            try {
                const val = this.owner.state.attack.recoveryTime[this.type];
                if (val !== undefined)
                    return val;
                else
                    console.warn(`AttackBase: recoveryTime for attack type "${this.type}" not found on owner "${this.owner && this.owner.type ? this.owner.type : '<unknown>'}". Returning 0.`);
                return 0;
            } catch (e) {
                console.warn(`AttackBase: error reading recoveryTime for owner "${this.owner && this.owner.type ? this.owner.type : '<unknown>'}":`, e);
                return 0;
            }
        });
        this.getTargets = options.getTargets || (() => {
            try {
                return this.owner.attack.targetSelector();
            } catch (e) {
                console.warn(`AttackBase: error calling targetSelector for owner "${this.owner && this.owner.type ? this.owner.type : '<unknown>'}":`, e);
                return [];
            }
        });

        this.state = "idle";
        this.timer = 0;
    }

    get damage() { return this.getDamage(); }
    get startupTime() { return this.getStartupTime() }
    get recoveryTime() { return this.getRecoveryTime() }
    get targets() { return this.getTargets(); }

    trigger() {
        if (this.state === "idle") {
            this.state = "startup";
            this.timer = this.startupTime;
            return true;
        }
        return false;
    }

    reset() {
        this.state = "idle";
        this.timer = 0;
    }

    get isAttacking() {
        return this.state !== "idle";
    }
    get isInStartup() {
        return this.state === "startup";
    }
    get isInActive() {
        return this.state === "active";
    }
    get isInRecovery() {
        return this.state === "recovery";
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

    /**
     * 统一伤害处理逻辑：触发事件 → 应用伤害
     */
    applyDamage(target, damage) {
        if (target.beforeTakeDamage && !target.beforeTakeDamage(damage, this.type, this.owner))
            return;

        let finalDamage = damage;

        if (this.owner.dealDamageEvent) {
            finalDamage = bus.emitReduce(
                this.owner.dealDamageEvent,
                { baseDamage: finalDamage },
                (_, next) => next
            ).baseDamage;
        }

        target.takeDamage(finalDamage, this.type, this.owner);
    }

    onHit(owner, damage) { }
}
