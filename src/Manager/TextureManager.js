export class TextureManager {
    constructor() { }

    async load() {
        this.tempCanvas = document.querySelector("canvas#buffer");
        this.texturesURL = await window.$game.dataManager.loadJSON("assets/imgs/Textures.js");
        this.textures = {};
        let resources = new Map();
        let urls = [];

        Object.keys(this.texturesURL).forEach(async (kind) => {
            Object.keys(this.texturesURL[kind]).forEach(async (id) => {
                urls.push(this.texturesURL[kind][id])
            });
        });

        const tasks = urls.map(async (url) => {
            const img = await window.$game.dataManager.loadImg(url);
            resources.set(url, await createImageBitmap(img));
        })

        await Promise.all(tasks)

        Object.keys(this.texturesURL).forEach(async (kind) => {
            this.textures[kind] = {};
            Object.keys(this.texturesURL[kind]).forEach(async (id) => {
                this.textures[kind][id] = resources.get(this.texturesURL[kind][id]);
            });
        });
        // console.log("texture: ", this.textures);
    }

    getTexture(kind, id = "0") {
        if (this.textures[kind] && this.textures[kind][id]) {
            return this.textures[kind][id];
        } else {
            console.warn(`TextureManager: 贴图不存在 kind='${kind}' id='${id}'`);
            return null;
        }
    }

    // /**
    //  *
    //  * @param {ImageBitmap} texture
    //  * @param {number} angle 0-180
    //  */
    // rotateTexture(texture, angle) {
    //     const ctx = this.tempCanvas.getContext("2d");
    //     this.tempCanvas.width = texture.width;
    //     this.tempCanvas.height = texture.height;

    //     ctx.translate(texture.width / 2, texture.height / 2);
    //     ctx.rotate(angle * Math.PI / 180);
    //     ctx.translate(-texture.width / 2, -texture.height / 2);

    //     ctx.drawImage(texture, 0, 0);

    //     return this.tempCanvas;
    // }
}
