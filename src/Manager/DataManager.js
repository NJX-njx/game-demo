class DataManager {
    constructor() {
        if (DataManager.instance) return DataManager.instance;
        DataManager.instance = this;
    }

    async loadJSON(src) {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`Failed to load JSON: ${src}`);
        return await res.json();
    }

    async loadImg(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(new Error(`Failed to load image: ${src}`));
        });
    }
}

export const dataManager = new DataManager();
