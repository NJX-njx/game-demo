class DataManager {
    constructor() { }
    async loadJSON(src) {
        let jsonp = document.createElement('script');
        jsonp.src = src;
        let json = await new Promise((resolve) => {
            this.resolve = resolve;
            document.getElementById('resource').appendChild(jsonp);
        });
        return json;
    }
    async loadImg(src) {
        let img = await new Promise(resolve => {
            let img = new Image();
            img.src = src;
            document.getElementById('resource').appendChild(img);
            img.onload = () => resolve(img);
        });
        return img;
    }
}
