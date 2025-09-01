class Save{
    constructor(){
        this.base = { maxHP: 1000, atk: 100, moveSpeed: 1.0 };
        this.mod = { maxHPPct: 0, maxHPFlat: 0, atkPct: 0, atkFlat: 0, moveSpeedPct: 0 };
        this.items = [];
        this.itemsPool = [];
    }
}