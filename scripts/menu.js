// scripts/menu.js
// 仅保留工具类 + 成就系统初始化入口

// ==============================================
// 1. 工具类（原代码保留，不修改）
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
// 2. 页面初始化（仅调用成就系统入口）
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("[menu.js] 主菜单基础初始化完成");

    // 调用成就系统初始化（依赖 AchievementSystem.js 暴露的全局函数）
    if (window.initAchievementSystem) {
        window.initAchievementSystem();
    } else {
        console.error("[menu.js] 请先加载 AchievementSystem.js！");
    }

    // （可选）后续可添加非成就相关逻辑（如主菜单导航、用户状态检查等）
});