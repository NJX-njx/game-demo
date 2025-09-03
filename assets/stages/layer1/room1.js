window.$game.dataManager.resolve(
    {
        playerSpawn: { x: 500, y: 300 },
        enemySpawns: [
            { x: 300, y: 0, type: "1" },
            { x: 800, y: 0, type: "1" }
        ],
        backgrounds: [
            { position: { x: 0, y: 0 }, size: { x: 1280, y: 720 }, type: "sky" },
            { position: { x: 0, y: 600 }, size: { x: 1280, y: 120 }, type: "mountain" }
        ],
        blocks: [
            { position: { x: 0, y: 700 }, size: { x: 1280, y: 20 }, type: "ground" },
            { position: { x: 0, y: 0 }, size: { x: 20, y: 720 }, type: "wall" },
            { position: { x: 1260, y: 0 }, size: { x: 20, y: 720 }, type: "wall" },
            { position: { x: 200, y: 600 }, size: { x: 100, y: 20 }, type: "platform" },
            { position: { x: 500, y: 500 }, size: { x: 200, y: 20 }, type: "platform" },
            { position: { x: 900, y: 400 }, size: { x: 150, y: 20 }, type: "platform" }
        ],
        textures: [
            // { position: { x: 100, y: 680 }, size: { x: 64, y: 64 }, type: "tree" },
            // { position: { x: 600, y: 480 }, size: { x: 64, y: 64 }, type: "rock" }
        ],
        interactions: [
            { position: { x: 1200, y: 700 }, size: { x: 40, y: 20 }, type: "exit", autoTrigger: true, event: "nextRoom" },
            { position: { x: 250, y: 600 }, size: { x: 40, y: 20 }, type: "npc", autoTrigger: false, event: "talk" }
        ]
    }
)
