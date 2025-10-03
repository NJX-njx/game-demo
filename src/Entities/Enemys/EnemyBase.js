import { Entity } from "../Entity";
import { Vector } from "../../Utils/Vector";
import { eventBus as bus, EventTypes as Events } from "../../Manager/EventBus";
import { attributeManager as AM, AttributeTypes as Attrs } from "../../Manager/AttributeManager";
import { drawSprite } from "../../Utils/canvas";
import { game } from "../../Game";
import { MeleeAttack } from "../../System/Attack/MeleeAttack";

export class EnemyBase extends Entity {
    constructor(type, position, size = new Vector(50, 50), velocity = new Vector()) {
        super(position, size, velocity);
        this.type = "enemy" + type;
        this.enemytype = type;
        this.facing = 1;
        this.hurtBox = this.hitbox;
        this.animation = null;
        this.attack = {
            type: "melee",
            attacker: new MeleeAttack(this)
        }
        this.control = {
            attackTriggered: false,
            jumpTriggered: false,
            cmd_move: 0
        }

        // 基础属性
        this.baseState = {
            hp_max: 100,
            attack: {
                atk: 10,
                StartupTime: 50,
                RecoveryTime: 1500
            }
        };

        this.state = {
            hp: this.baseState.hp_max,
            hp_max: this.baseState.hp_max,
            attack: {
                atk: this.baseState.attack.atk,
                damage: this.baseState.attack.atk,
                startupTime: this.baseState.attack.StartupTime,
                recoveryTime: this.baseState.attack.RecoveryTime
            }
        };
        this._unbind_list = [];
    }

    takeDamage(dmg, attackType = null, attacker = null) {
        this.state.hp -= dmg;
        bus.emit(Events.enemy.takeDamage, { attackType, attacker, damage: dmg, victim: this });
        if (this.state.hp <= 0) {
            this.handleDeath(attackType, attacker, dmg);
        }
    }

    /**
     * 统一的死亡处理函数。
     * - 触发死亡事件。
     */
    handleDeath(attackType = null, attacker = null, dmg = 0) {
        bus.emit(Events.enemy.die, { attackType, attacker, damage: dmg, victim: this });
        this._unbind_list.forEach(unbind => unbind());
        const idx = game.enemies.indexOf(this);
        if (idx !== -1) game.enemies.splice(idx, 1);
    }

    update(deltaTime) {
        this.updateState();
        this.updateAI(deltaTime);
        this.updateMove(deltaTime);
        this.updateAttack(deltaTime);
        this.updateAnimation(deltaTime);
    }

    updateAI(deltaTime) { }

    updateAttack(deltaTime) { }

    updateMove(deltaTime) {
        const deltaFrame = 60 * deltaTime / 1000;
        this.updateXY(deltaFrame, () => this.control.cmd_move, () => this.control.jumpTriggered, true);
    }

    updateAnimation(deltaTime) { }

    updateState() {
        const hp = AM.getAttrSum(Attrs.enemy.HP);
        const atk = AM.getAttrSum(Attrs.enemy.ATK);
        const dmg = AM.getAttrSum(Attrs.enemy.DMG);
        const dmg_dec = AM.getAttrSum(Attrs.enemy.DMG_DEC);

        this.state.hp_max = this.baseState.hp_max * (1 + hp);
        this.state.hp = Math.min(this.state.hp, this.state.hp_max);
        this.state.attack.atk = this.baseState.attack.atk * (1 + atk);
        let finalDmg = this.state.attack.atk * (1 + dmg);
        finalDmg = Math.max(finalDmg - dmg_dec, 0.1 * finalDmg);
        this.state.attack.damage = finalDmg;

        if (this.attack.type === "melee") {
            const meleeST = AM.getAttrSum(Attrs.enemy.MeleeStartupTime);
            const meleeRT = AM.getAttrSum(Attrs.enemy.MeleeRecoveryTime);
            this.state.attack.startupTime = this.baseState.attack.StartupTime + meleeST;
            this.state.attack.recoveryTime = this.baseState.attack.RecoveryTime + meleeRT;
        } else if (this.attack.type === "ranged") {
            const rangedST = AM.getAttrSum(Attrs.enemy.RangedStartupTime);
            const rangedRT = AM.getAttrSum(Attrs.enemy.RangedRecoveryTime);
            this.state.attack.startupTime = this.baseState.attack.StartupTime + rangedST;
            this.state.attack.recoveryTime = this.baseState.attack.RecoveryTime + rangedRT;
        } else {
            this.state.attack.startupTime = this.baseState.attack.StartupTime;
            this.state.attack.recoveryTime = this.baseState.attack.RecoveryTime;
        }
    }

    draw(ctx) {
        ctx.save();
        const frameTexture = this.animation.getFrame();
        if (frameTexture) {
            drawSprite(ctx, frameTexture, this.hitbox.position.x, this.hitbox.position.y, this.size.x, this.size.y, this.facing);
        }

        // 绘制血条
        const hpBarWidth = this.size.x;
        const hpBarHeight = 6;
        const hpBarX = this.hitbox.position.x;
        const hpBarY = this.hitbox.position.y - 12;
        ctx.fillStyle = 'red';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth * (this.state.hp / this.state.hp_max), hpBarHeight);
        ctx.strokeStyle = 'black';
        ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);
        ctx.restore();
    }
}