// 补充必要导入（根据项目目录调整路径）
import { inputManager } from "./InputManager";
import { game } from "../Game";
import { eventBus as bus, EventTypes } from "./EventBus";
import { textureManager } from "./TextureManager"; // 补充纹理管理器导入
import { dialogManager } from "./DialogManager"; // 补充对话管理器导入

class StatusMenuManager {
    static instance;
    
    constructor() {
        if (StatusMenuManager.instance) return StatusMenuManager.instance;
        StatusMenuManager.instance = this;
        
        // 1. DOM元素获取（容错处理，避免元素未找到报错）
        this.menuElement = document.getElementById('status-menu') || document.createElement('div');
        this.closeButton = document.getElementById('close-status') || document.createElement('button');
        this.resumeButton = document.getElementById('resume-game') || document.createElement('button');
        this.returnButton = document.getElementById('return-main') || document.createElement('button');
        this.soulCountElement = document.getElementById('soul-count') || document.createElement('div');
        this.itemsContainer = document.getElementById('items-container') || document.createElement('div');
        
        // 2. 状态管理
        this.isOpen = false;
        this.soulCount = 1560; // 初始灵魂值
        // 道具数据（与纹理配置匹配）
        this.items = [
            { id: 1, name: "治疗药剂", count: 3, icon: "potion_heal" }, // 需在Textures.json中配置"potion_heal"
            { id: 2, name: "魔法卷轴", count: 1, icon: "scroll_magic" },
            { id: 3, name: "铁钥匙", count: 2, icon: "key_iron" },
            { id: 4, name: "", count: 0, icon: "" } // 空槽位
        ];
        
        // 3. 绑定事件（容错处理，避免元素不存在报错）
        this.bindEvents();
        // 4. 初始化显示（确保页面加载后立即更新）
        this.updateSoulCount();
        this.updateItems();
    }
    
    // 事件绑定（添加容错）
    bindEvents() {
        // 关闭/继续按钮
        if (this.closeButton) this.closeButton.addEventListener('click', () => this.close());
        if (this.resumeButton) this.resumeButton.addEventListener('click', () => this.close());
        
        // 返回主菜单（可扩展实际逻辑，如跳转页面）
        if (this.returnButton) this.returnButton.addEventListener('click', () => {
            this.close();
            console.log("返回主菜单：跳转至首页");
            // 实际项目中可添加：window.location.href = "/index.html";
        });
        
        // 监听游戏tick（确保在inputManager.update后执行）
        bus.on({
            event: EventTypes.game.tick,
            handler: () => this.handleInput(),
            priority: 0.9 // 优先级低于inputManager.update（建议0.8），确保输入状态已更新
        });
    }
    
    // 输入处理（核心：解决对话与菜单ESC冲突）
    handleInput() {
        // 仅在输入更新后判断，且对话未运行时才响应ESC
        if (inputManager.isFirstDown('Esc')) {
            if (dialogManager.isRunning) {
                // 对话运行时，ESC优先关闭对话
                dialogManager.closeDialog();
            } else {
                // 对话未运行时，ESC切换菜单
                this.isOpen ? this.close() : this.open();
            }
        }
    }
    
    // 打开菜单（同步游戏状态）
    open() {
        if (this.isOpen || !this.menuElement) return;
        
        this.isOpen = true;
        this.menuElement.classList.add('active');
        
        // 暂停游戏+释放鼠标
        game.pause();
        if (document.pointerLockElement) {
            document.exitPointerLock().catch(err => console.log("释放鼠标失败：", err));
        }
        
        // 实时更新数据（避免菜单打开时数据过时）
        this.updateSoulCount();
        this.updateItems();
    }
    
    // 关闭菜单（恢复游戏状态）
    close() {
        if (!this.isOpen || !this.menuElement) return;
        
        this.isOpen = false;
        this.menuElement.classList.remove('active');
        
        // 恢复游戏+重新捕获鼠标
        game.continue();
        game.mouseManager.capture().catch(err => console.log("捕获鼠标失败：", err));
    }
    
    // 更新灵魂值（添加千分位格式化）
    updateSoulCount() {
        if (this.soulCountElement) {
            this.soulCountElement.textContent = this.soulCount.toLocaleString('zh-CN');
        }
    }
    
    // 更新道具显示（解决图标加载异常）
    updateItems() {
        if (!this.itemsContainer) return;
        this.itemsContainer.innerHTML = '';
        
        // 渲染已有道具
        this.items.forEach(item => {
            const slot = document.createElement('div');
            slot.className = `item-slot ${item.count === 0 ? 'empty' : ''}`;
            
            // 道具图标（容错：纹理不存在时显示默认图）
            const icon = document.createElement('div');
            icon.className = 'item-icon';
            if (item.icon) {
                const texture = textureManager.getTexture("items", item.icon); // 假设道具纹理在"items"分类下
                if (texture) {
                    icon.style.backgroundImage = `url(${texture.src || ''})`;
                } else {
                    icon.style.backgroundImage = "url(assets/imgs/default_item.png)"; // 默认图标路径
                }
            }
            
            // 道具名称+数量
            const name = document.createElement('div');
            name.className = 'item-name';
            name.textContent = item.name || '空槽位';
            
            const count = document.createElement('div');
            count.className = 'item-count';
            count.textContent = item.count > 0 ? `x${item.count}` : '';
            
            slot.appendChild(icon);
            slot.appendChild(name);
            slot.appendChild(count);
            this.itemsContainer.appendChild(slot);
        });
        
        // 填充剩余空槽位（确保共8个槽位）
        const totalSlots = 8;
        const emptySlots = totalSlots - this.items.length;
        for (let i = 0; i < emptySlots; i++) {
            const emptySlot = document.createElement('div');
            emptySlot.className = 'item-slot empty';
            
            const icon = document.createElement('div');
            icon.className = 'item-icon';
            
            const name = document.createElement('div');
            name.className = 'item-name';
            name.textContent = '空槽位';
            
            emptySlot.appendChild(icon);
            emptySlot.appendChild(name);
            this.itemsContainer.appendChild(emptySlot);
        }
    }
    
    // 外部调用：增加灵魂值
    addSouls(amount) {
        if (amount > 0) {
            this.soulCount += amount;
            if (this.isOpen) this.updateSoulCount();
        }
    }
    
    // 外部调用：添加道具（支持叠加）
    addItem(itemId, count = 1) {
        if (count <= 0 || !itemId) return;
        
        const existingItem = this.items.find(item => item.id === itemId);
        if (existingItem) {
            existingItem.count += count;
        } else {
            // 新增道具（默认图标，实际项目需从道具配置表获取）
            const newItem = {
                id: itemId,
                name: `道具${itemId}`,
                count: count,
                icon: `item_${itemId}` // 与纹理配置匹配
            };
            this.items.push(newItem);
        }
        
        if (this.isOpen) this.updateItems();
    }
}

export const statusMenuManager = new StatusMenuManager();