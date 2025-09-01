class SaveManager {
    constructor() {
        this.saveKeyBase = "Purana_Save"; // 存档在 localStorage 的键名
        this.saveNum = 0; // 存档编号（可用于多存档槽位）
    }

    /** 保存存档数据 */
    save(data, id) {
        try {
            localStorage.setItem(this.saveKeyBase+id, JSON.stringify(data));
            console.log("✅ 存档成功", data);
        } catch (e) {
            console.error("❌ 存档失败", e);
        }
    }

    /** 读取存档 */
    load(id) {
        try {
            const raw = localStorage.getItem(this.saveKeyBase+id);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error("❌ 存档读取失败", e);
            return null;
        }
    }

    /** 删除存档 */
    clear(id) {
        localStorage.removeItem(this.saveKeyBase+id);
        console.log("🗑 存档"+id+"已删除");
    }

    /** 导出存档为 JSON 文件 */
    export(id) {
        const data = this.load(id);
        if (!data) {
            alert("没有存档可导出！");
            return;
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = this.saveKey + ".json";
        a.click();
        URL.revokeObjectURL(url);
        console.log("⬇ 存档已导出");
    }

    /** 导入存档（传入文件对象） */
    import(file, callback, id) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                this.save(data, id);
                console.log("⬆ 存档已导入", data);
                if (callback) callback(true, data);
            } catch (e) {
                console.error("❌ 导入失败", e);
                if (callback) callback(false, null);
            }
        };
        reader.readAsText(file);
    }
}
