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
// 2. 页面初始化（调用成就系统和存档系统）
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("[menu.js] 主菜单基础初始化完成");

    // 初始化存档系统
    initSaveSystem();
    
    // 调用成就系统初始化（依赖 AchievementSystem.js 暴露的全局函数）
    if (window.initAchievementSystem) {
        window.initAchievementSystem();
    } else {
        console.error("[menu.js] 请先加载 AchievementSystem.js！");
    }
});

// ==============================================
// 3. 存档系统实现
// ==============================================
function initSaveSystem() {
    // 获取DOM元素
    const savePanel = document.getElementById('save-panel');
    const showSavesBtn = document.getElementById('show-saves');
    const closeSavePanelBtn = document.getElementById('close-save-panel');
    const saveBackdrop = document.getElementById('save-backdrop');
    const saveList = document.getElementById('save-list');

    // 显示存档面板
    showSavesBtn?.addEventListener('click', () => {
        savePanel.style.opacity = '1';
        savePanel.style.pointerEvents = 'auto';
        renderSaveSlots();
    });

    // 关闭存档面板
    closeSavePanelBtn?.addEventListener('click', closeSavePanel);
    saveBackdrop?.addEventListener('click', closeSavePanel);

    // ESC键关闭面板
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && savePanel.style.opacity === '1') {
            closeSavePanel();
        }
    });
}

function closeSavePanel() {
    const savePanel = document.getElementById('save-panel');
    savePanel.style.opacity = '0';
    savePanel.style.pointerEvents = 'none';
}

function renderSaveSlots() {
    const saveList = document.getElementById('save-list');
    const currentPlayer = JSON.parse(localStorage.getItem("present_data"));
    
    if (!currentPlayer?.saveSlots) {
        saveList.innerHTML = '<div class="no-saves">暂无存档</div>';
        return;
    }

    saveList.innerHTML = '';
    currentPlayer.saveSlots.forEach((save, index) => {
        if (!save) return;
        
        const saveSlot = document.createElement('div');
        saveSlot.className = 'save-slot';
        saveSlot.innerHTML = `
            <div class="save-preview"></div>
            <div class="save-info">
                <div class="save-time">${new Date(save.timestamp).toLocaleString()}</div>
                <div class="save-location">第${save.layer + 1}层 - 房间${save.room + 1}</div>
            </div>
            <button class="load-save-btn" data-slot="${index}">加载</button>
        `;
        
        saveSlot.querySelector('.load-save-btn').addEventListener('click', () => {
            // 仅记录选中的槽位并跳转，由游戏页负责读取并加载
            localStorage.setItem('selected_slot', String(index + 1));
            window.location.href = 'game.html';
        });
        
        saveList.appendChild(saveSlot);
    });
}

// 开始游戏按钮：如果未选择，优先进入最近一次使用的槽位，否则默认 1
(() => {
    const startBtn = document.getElementById('start-game');
    startBtn?.addEventListener('click', () => {
        const selected = localStorage.getItem('selected_slot');
        const slot = Math.max(1, parseInt(selected || '1', 10) || 1);
        localStorage.setItem('selected_slot', String(slot));
        window.location.href = 'game.html';
    });
})();