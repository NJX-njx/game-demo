import { dataManager } from "./DataManager";

class TextureManager {
    constructor() {
        if (TextureManager.instance) return TextureManager.instance;
        TextureManager.instance = this;
    }

    async load() {
        this.tempCanvas = document.querySelector("canvas#buffer");
        // 改成标准 JSON 文件
        this.texturesURL = await dataManager.loadJSON("assets/imgs/Textures.json");
        this.textures = {};
        const resources = new Map();

        const urls = [];
        for (const kind of Object.keys(this.texturesURL)) {
            for (const id of Object.keys(this.texturesURL[kind])) {
                urls.push(this.texturesURL[kind][id]);
            }
        }

        // 用 fetch + createImageBitmap
        const tasks = urls.map(async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to load image: ${url}`);
            const blob = await res.blob();
            const bitmap = await createImageBitmap(blob);
            resources.set(url, bitmap);
        });

        await Promise.all(tasks);

        for (const kind of Object.keys(this.texturesURL)) {
            this.textures[kind] = {};
            for (const id of Object.keys(this.texturesURL[kind])) {
                this.textures[kind][id] = resources.get(this.texturesURL[kind][id]);
            }
        }
    }

    getTexture(kind, id = "0") {
        if (this.textures[kind] && this.textures[kind][id]) {
            return this.textures[kind][id];
        } else {
            // console.warn(`TextureManager: 贴图不存在 kind='${kind}' id='${id}'`);//TODO:调试暂时关闭
            return null;
        }
    }
}

export const textureManager = new TextureManager();
