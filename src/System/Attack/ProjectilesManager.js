import { Projectile } from "./Projectile";
export class ProjectilesManager {
    constructor() {
        if (ProjectilesManager.instance)
            return ProjectilesManager.instance;
        ProjectilesManager.instance = this;
        this.projectiles = [];
    }

    /**
     * 添加一个飞行物
     * @param {Projectile} projectile 
     */
    add(projectile) {
        this.projectiles.push(projectile);
    }

    /**
     * 更新所有飞行物
     * @param {number} deltaTime
     */
    update(deltaTime) {
        this.projectiles.forEach(p => p.update(deltaTime));
        // 移除死亡的
        this.projectiles = this.projectiles.filter(p => p.alive);
    }

    /**
     * 绘制所有飞行物
     */
    draw(ctx) {
        this.projectiles.forEach(p => p.draw(ctx));
    }

    /**
     * 清空所有飞行物（例如切换场景）
     */
    clear() {
        this.projectiles.length = 0;
    }
}

export const projectilesManager = new ProjectilesManager();