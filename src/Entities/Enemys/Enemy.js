import { Enemy_1 } from "./Enemy_1";
import { Enemy_2 } from "./Enemy_2";
import { Enemy_balingzhe } from "./Enemy_balingzhe";

export function spawnEnemy(type, position, size) {
    switch (type) {
        case "1":
            return new Enemy_1(position, size);
        case "2":
            return new Enemy_2(position, size);
        case "balingzhe":
            return new Enemy_balingzhe(position, size);
        default:
            console.warn(`未知敌人类型: ${type}，使用默认Enemy1`);
            return new Enemy_1(position, size);
    }
}