// scripts/AchievementSystem.js
// 依赖：需先加载 menu.js 中的 Store/Auth 工具类

// ==============================================
// 1. 成就数据模型（原menu.js抽离）
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
// 2. 成就奖励分发器（原menu.js抽离，修复存储键语法错误）
// ==============================================
class AchievementRewardDistributor {
    constructor() {
        this.user = Auth.getToken();
        this.userResources = {
            items: [],
            claimdAchievementIds: [] // 保留用户原拼写，如需修正可改为 claimedAchievementIds
        };
        this.loadResources();
    }

    // 加载用户资源（修复：模板字符串语法错误 ${}）
    loadResources() {
        try {
            const storedKey = `user_resources_${this.user}`; // 原错误：user_resources_$(this.user)
            const storedData = Store.get(storedKey);
            if (storedData) {
                this.userResources = JSON.parse(storedData);
            }
        } catch (error) {
            console.error("成就奖励：加载资源失败", error);
            this.userResources = {
                items: [],
                claimdAchievementIds: []
            };
        }
    }

    // 保存用户资源（修复：模板字符串语法错误）
    saveResources() {
        try {
            const storedKey = `user_resources_${this.user}`; // 原错误：user_resources_$(this.user)
            Store.set(storedKey, JSON.stringify(this.userResources));
        } catch (error) {
            console.error("成就奖励：保存资源失败", error);
        }
    }

    // 补全成就-奖励映射规则（用户原代码为空，补充示例）
    getRewardRule(achievementId) {
        const rewardRules = {
            "first_step": { items: "新手徽章" }, // 第一步：新手徽章
            "item_collector": { items: "收藏家勋章" }, // 物品收藏家：勋章
            "combat_expert": { items: "战斗大师徽章" }, // 战斗专家：徽章
            "Hachiime": { items: "猫咪伙伴" }, // 哈吉米：猫咪伙伴
            "legend": { items: "传奇皇冠" } // 传奇人物：皇冠
        };
        return rewardRules[achievementId] || null;
    }

    // 分发奖励（原逻辑保留）
    distributeReward(achievement) {
        if (this.userResources.claimdAchievementIds.includes(achievement.id)) {
            return null;
        }
        const reward = this.getRewardRule(achievement.id);
        if (!reward) {
            return null;
        }
        this.userResources.claimdAchievementIds.push(achievement.id);
        // 处理道具奖励（按规则补充）
        if (reward.items) {
            this.userResources.items.push(reward.items);
        }
        this.saveResources();
        console.log(`[成就奖励] 解锁「${achievement.title}」获得：${reward.items}`);
        return reward;
    }

    getUserResources() {
        return JSON.parse(JSON.stringify(this.userResources));
    }
}

// ==============================================
// 3. 成就核心管理器（原menu.js抽离）
// ==============================================
class AchievementManager {
    constructor() {
        this.achievements = [];
        this.user = Auth.getToken();
        this.rewardDistributor = new AchievementRewardDistributor();
        this.init();
    }

    async init() {
        const isDebug = false;
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
            ),
            new Achievement(
                "Hachiime",
                "哈吉米",
                "成为爱猫人士",
                "在游戏中收集5只猫咪",
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

    getAll() { return [...this.achievements]; }
    getCompleted() { return this.achievements.filter(ach => ach._completed); }
    getIncomplete() { return this.achievements.filter(ach => !ach._completed); }

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
        this.rewardDistributor.distributeReward(achievement);
    }

    showAchievementPopup(achievement) {
        const toast = document.getElementById('achievement-toast');
        const toastTitle = document.getElementById('toast-title');
        const toastDesc = document.getElementById('toast-desc');
        if (!toast || !toastTitle || !toastDesc) return; // 兼容DOM不存在场景

        toastTitle.textContent = achievement.title;
        toastDesc.textContent = achievement.desc;
        toast.style.transform = "translateX(0)";
        setTimeout(() => {
            toast.style.transform = "translateX(calc(100% + 24px))";
        }, 2000);
    }
}

// ==============================================
// 4. 成就展示器（原menu.js抽离）
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

        // 空状态处理
        if (achievements.length === 0) {
            const emptyEle = document.createElement("div");
            emptyEle.className = "col-span-full text-center py-12 text-light/60";
            emptyEle.style.color = "rgba(248, 250, 252, 0.6)";
            emptyEle.innerHTML = `<span style="font-size: 40px; display: block; margin-bottom: 8px;">🔍</span> 没有符合条件的成就`;
            this.container.appendChild(emptyEle);
            return;
        }

        // 排序：已解锁在前
        const sortedAchievements = [...achievements].sort((a, b) => {
            if (a._completed && !b._completed) return -1;
            if (!a._completed && b._completed) return 1;
            return a.id.localeCompare(b.id);
        });

        // 渲染成就项
        sortedAchievements.forEach(achievement => {
            this.container.appendChild(this.generateAchievementItem(achievement));
        });
    }

    generateAchievementItem(achievement) {
        const ele = document.createElement("div");
        ele.className = `achievement-item ${achievement._completed ? 'completed' : 'incomplete'}`;

        const iconSymbol = achievement._completed ? '🏆' : '🔒';
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
// 5. 成就系统初始化（原menu.js中成就相关事件绑定抽离）
// ==============================================
let achievementDisp; // 全局变量，用于事件中复用

// 成就系统入口函数（暴露给window，供menu.js调用）
function initAchievementSystem() {
    // 1. 初始化成就展示器
    const achievementListContainer = document.getElementById('achievement-list');
    if (achievementListContainer) {
        achievementDisp = new AchievementDisp(achievementListContainer);
        achievementDisp.disp(); // 默认渲染全部成就
    }

    // 2. 缓存成就相关DOM元素
    const achievementPanel = document.getElementById('achievement-panel');
    const panelContent = achievementPanel ? achievementPanel.querySelector('.panel-content') : null;
    const closePanelBtn = document.getElementById('close-panel');
    const panelBackdrop = document.getElementById('panel-backdrop');
    const showAchievementsBtn = document.getElementById('show-achievements');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const startGameBtn = document.getElementById('start-game');

    // 3. 成就面板显示/隐藏逻辑
    function showAchievementPanel() {
        if (!achievementPanel || !panelContent) return;
        achievementPanel.style.opacity = "1";
        achievementPanel.style.pointerEvents = "auto";
        setTimeout(() => {
            panelContent.style.transform = "scale(1)";
        }, 50);
        if (achievementDisp) achievementDisp.disp(achievementDisp.currentFilter);
    }

    function hideAchievementPanel() {
        if (!achievementPanel || !panelContent) return;
        panelContent.style.transform = "scale(0.95)";
        setTimeout(() => {
            achievementPanel.style.opacity = "0";
            achievementPanel.style.pointerEvents = "none";
        }, 300);
    }

    // 4. 绑定成就相关事件
    // 显示面板
    if (showAchievementsBtn) {
        showAchievementsBtn.addEventListener('click', showAchievementPanel);
    }
    // 关闭面板（按钮+背景）
    if (closePanelBtn) {
        closePanelBtn.addEventListener('click', hideAchievementPanel);
    }
    if (panelBackdrop) {
        panelBackdrop.addEventListener('click', hideAchievementPanel);
    }
    // 成就筛选
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (achievementDisp) {
                achievementDisp.disp(btn.getAttribute('data-filter'));
            }
        });
    });
    // 开始游戏：解锁“第一步”成就
    if (startGameBtn) {
        startGameBtn.addEventListener('click', async () => {
            const manager = new AchievementManager();
            await manager.load();
            const isUnlocked = manager.completeAchievement('first_step');
            if (isUnlocked) {
                setTimeout(() => {
                    window.location.href = 'game.html';
                }, 3000);
            } else {
                window.location.href = 'game.html';
            }
        });
    }
    // 键盘P键：快速开关面板
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'p' && achievementPanel && panelContent) {
            if (achievementPanel.style.opacity === "0" || !achievementPanel.style.opacity) {
                showAchievementPanel();
            } else {
                hideAchievementPanel();
            }
        }
    });

    console.log("[AchievementSystem] 成就系统初始化完成");
}

// 暴露入口函数到window，供menu.js调用
window.initAchievementSystem = initAchievementSystem;