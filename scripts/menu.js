// ==============================================
// 1. 工具类（模拟本地存储和用户认证）
// ==============================================
class Store {
    static get(key) {
        return localStorage.getItem(key);
    }
    
    static set(key, value) {
        localStorage.setItem(key, value);
    }
    
    static remove(key) {
        localStorage.removeItem(key);
    }
}

class Auth {
    static getToken() {
        return "current_user_123";
    }
}

// ==============================================
// 2. 数据模型（成就数据结构）
// ==============================================
class Achievement {
    constructor(id, title, desc, condition, completed = false) {
        this.id = id;
        this.title = title;
        this.desc = desc;
        this._condition = condition;
        this._completed = completed;
    }
}

// ==============================================
// 3. 成就核心管理器（业务逻辑）
// ==============================================
class AchievementManager {
    constructor() {
        this.achievements = [];
        this.user = Auth.getToken();
        this.init();
    }

    async init() {
        const isDebug = true; // 开发时清除缓存，发布时设为false
        if (isDebug) {
            Store.remove("achievements");
            this.initDefaultAchievements();
            this.save();
        } else {
            await this.load();
            if (this.achievements.length === 0) {
                this.initDefaultAchievements();
                this.save();
            }
        }
    }

    // 初始化默认成就（与你原代码一致）
    initDefaultAchievements() {
        this.achievements = [
            new Achievement(
                "first_step",
                "第一步",
                "勇敢地开始你的第一次冒险",
                "启动游戏并开始新游戏",
                false
            ),
            new Achievement(
                "item_collector",
                "物品收藏家",
                "收集了所有稀有物品",
                "获得游戏中所有特殊物品",
                false
            ),
            new Achievement(
                "combat_expert",
                "战斗专家",
                "展现了非凡的战斗技巧",
                "击败100个敌人",
                false
            ),
            new Achievement(
                "legend",
                "传奇人物",
                "成为了游戏世界中的传奇",
                "完成游戏中的所有成就",
                false
            )
        ];
    }

    async load() {
        try {
            const storedData = Store.get("achievements");
            if (storedData) {
                const allUsersAchievements = JSON.parse(storedData);
                if (allUsersAchievements[this.user]) {
                    this.achievements = allUsersAchievements[this.user].map(
                        data => new Achievement(
                            data.id,
                            data.title,
                            data.desc,
                            data._condition,
                            data._completed
                        )
                    );
                }
            }
        } catch (error) {
            console.error("加载成就数据失败:", error);
            this.achievements = [];
        }
    }

    save() {
        try {
            const storedData = Store.get("achievements") || "{}";
            const allUsersAchievements = JSON.parse(storedData);
            allUsersAchievements[this.user] = this.achievements;
            Store.set("achievements", JSON.stringify(allUsersAchievements));
        } catch (error) {
            console.error("保存成就数据失败:", error);
        }
    }

    getAll() {
        return [...this.achievements];
    }

    getCompleted() {
        return this.achievements.filter(ach => ach._completed);
    }

    getIncomplete() {
        return this.achievements.filter(ach => !ach._completed);
    }

    completeAchievement(achievementId) {
        const achievement = this.achievements.find(ach => ach.id === achievementId);
        
        if (achievement && !achievement._completed) {
            achievement._completed = true;
            achievement._completedAt = new Date();
            this.save();
            this.triggerAchievementUnlocked(achievement);
            return true;
        }
        
        return false;
    }

    triggerAchievementUnlocked(achievement) {
        this.showAchievementPopup(achievement);
    }

    showAchievementPopup(achievement) {
        const toast = document.getElementById('achievement-toast');
        const toastTitle = document.getElementById('toast-title');
        const toastDesc = document.getElementById('toast-desc');
        
        toastTitle.textContent = achievement.title;
        toastDesc.textContent = achievement.desc;
        
        // 显示提示（移除右移隐藏）
        toast.style.transform = "translateX(0)";
        
        // 2秒后隐藏
        setTimeout(() => {
            toast.style.transform = "translateX(calc(100% + 24px))";
        }, 2000);
    }
}

// ==============================================
// 4. 成就展示器（UI渲染，适配新样式）
// ==============================================
class AchievementDisp {
    constructor(container) {
        this.container = container;
        this.achievementManager = new AchievementManager();
        this.currentFilter = 'all';
    }

    async disp(filter = 'all') {
        this.currentFilter = filter;
        await this.achievementManager.load();
        
        let achievements = this.achievementManager.getAll();
        if (filter === 'completed') {
            achievements = this.achievementManager.getCompleted();
        } else if (filter === 'incomplete') {
            achievements = this.achievementManager.getIncomplete();
        }

        this.container.innerHTML = "";

        // 无数据时显示空状态
        if (achievements.length === 0) {
            const emptyEle = document.createElement("div");
            emptyEle.className = "col-span-full text-center py-12 text-light/60";
            emptyEle.style.color = "rgba(248, 250, 252, 0.6)";
            emptyEle.innerHTML = `<i class="fa fa-search-minus text-4xl mb-2 block"></i> 没有符合条件的成就`;
            // 替换Font Awesome图标为文字符号
            emptyEle.innerHTML = `<span style="font-size: 40px; display: block; margin-bottom: 8px;">🔍</span> 没有符合条件的成就`;
            this.container.appendChild(emptyEle);
            return;
        }

        // 排序：已解锁在前，未解锁在后
        const sortedAchievements = [...achievements].sort((a, b) => {
            if (a._completed && !b._completed) return -1;
            if (!a._completed && b._completed) return 1;
            return a.id.localeCompare(b.id);
        });

        // 渲染每个成就项（适配新CSS类）
        sortedAchievements.forEach(achievement => {
            const achievementEle = this.generateAchievementItem(achievement);
            this.container.appendChild(achievementEle);
        });
    }

    // 生成成就项（适配新CSS结构）
    generateAchievementItem(achievement) {
        const ele = document.createElement("div");
        // 新增成就项基础类和状态类（completed/incomplete）
        ele.className = `achievement-item ${achievement._completed ? 'completed' : 'incomplete'}`;

        // 图标配置（已解锁=奖杯，未解锁=锁）
        const iconSymbol = achievement._completed ? '🏆' : '🔒';
        
        // 成就项内容（适配新CSS结构）
        ele.innerHTML = `
            <div class="achievement-icon ${achievement._completed ? 'completed' : 'incomplete'}">
                ${iconSymbol}
            </div>
            <div class="achievement-text">
                <h3 class="achievement-title ${achievement._completed ? '' : 'incomplete'}">${achievement.title}</h3>
                <p class="achievement-desc">${achievement.desc}</p>
                <div class="achievement-condition">
                    <span>条件: ${achievement._condition}</span>
                </div>
            </div>
        `;

        return ele;
    }
}

// ==============================================
// 5. 页面初始化与事件绑定（核心交互）
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    // 初始化核心组件
    const achievementListContainer = document.getElementById('achievement-list');
    const achievementDisp = new AchievementDisp(achievementListContainer);
    achievementDisp.disp();

    // 缓存DOM元素（适配新ID）
    const achievementPanel = document.getElementById('achievement-panel');
    const panelContent = achievementPanel.querySelector('.panel-content'); // 面板内容区
    const closePanelBtn = document.getElementById('close-panel');
    const panelBackdrop = document.getElementById('panel-backdrop');
    const showAchievementsBtn = document.getElementById('show-achievements');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const startGameBtn = document.getElementById('start-game');

    // 成就面板显示函数
    function showAchievementPanel() {
        achievementPanel.style.opacity = "1";
        achievementPanel.style.pointerEvents = "auto";
        // 延迟缩放动画
        setTimeout(() => {
            panelContent.style.transform = "scale(1)"; // 放大到100%
        }, 50);
        // 刷新成就列表
        achievementDisp.disp(achievementDisp.currentFilter);
    }

    // 成就面板隐藏函数
    function hideAchievementPanel() {
        panelContent.style.transform = "scale(0.95)"; // 缩小到95%
        // 延迟隐藏遮罩
        setTimeout(() => {
            achievementPanel.style.opacity = "0";
            achievementPanel.style.pointerEvents = "none";
        }, 300);
    }

    // 绑定事件
    // 1. 显示成就面板
    showAchievementsBtn.addEventListener('click', showAchievementPanel);
    
    // 2. 关闭成就面板（按钮）
    closePanelBtn.addEventListener('click', hideAchievementPanel);
    
    // 3. 关闭成就面板（背景点击）
    panelBackdrop.addEventListener('click', hideAchievementPanel);
    
    // 4. 成就过滤
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 更新过滤按钮样式
            filterBtns.forEach(b => {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            
            // 渲染过滤后的成就
            const filter = btn.getAttribute('data-filter');
            achievementDisp.disp(filter);
        });
    });
    
    // 5. 开始游戏（模拟解锁成就）
// 5. 开始游戏（先解锁成就→显示弹窗→延迟跳转）
    startGameBtn.addEventListener('click', async () => {
        const manager = new AchievementManager();
        await manager.load(); // 等待数据加载完成，避免解锁失败
    
    // 2. 解锁“第一步”成就（同步操作，确保解锁完成）
        const isUnlocked = manager.completeAchievement('first_step');
    
    // 3. 延迟500毫秒跳转（给弹窗显示留时间，同时确保成就已保存到localStorage）
        if (isUnlocked) {
            setTimeout(() => {
                window.location.href = 'game.html';
            }, 3000); // 500毫秒足够弹窗弹出，可根据需要调整
        } else {
            // 若成就已解锁（重复点击），直接跳转
            window.location.href = 'game.html';
        }
    });
    
    // 6. 键盘P键（显示/隐藏面板）
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'p') {
            if (achievementPanel.style.opacity === "0" || !achievementPanel.style.opacity) {
                showAchievementPanel();
            } else {
                hideAchievementPanel();
            }
        }
    });
});