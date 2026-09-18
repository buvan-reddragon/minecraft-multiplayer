const socket = io();

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// --------------------------------------------------
// GAME STATE
// --------------------------------------------------

let myId = null;
let myPlayer = null;

let players = {};
let hearts = [];

let world = null;
let obstacles = [];

let camera = {
    x: 0,
    y: 0
};

let mouse = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    down: false
};

let keys = {};

let effects = [];

let chatFocused = false;

// --------------------------------------------------
// DOM
// --------------------------------------------------

const namePortal =
    document.getElementById("name-portal");

const usernameInput =
    document.getElementById("username-input");

const joinBtn =
    document.getElementById("join-btn");

const chatInput =
    document.getElementById("chat-input");

const chatMessages =
    document.getElementById("chat-messages");

const hudName =
    document.getElementById("hud-name");

const hudLevel =
    document.getElementById("hud-level");

const hudKills =
    document.getElementById("hud-kills");

const hudHealth =
    document.getElementById("hud-health");

const hudHearts =
    document.getElementById("hud-hearts");

const hudPlayers =
    document.getElementById("hud-players");

const levelProgress =
    document.getElementById("level-progress");

// --------------------------------------------------
// JOIN
// --------------------------------------------------

joinBtn.addEventListener("click", joinGame);

usernameInput.addEventListener("keydown", e => {

    if (e.key === "Enter") {
        joinGame();
    }
});

function joinGame() {

    const name =
        usernameInput.value.trim() ||
        "Soldier";

    socket.emit("player:join", name);

    namePortal.style.display = "none";
}

// --------------------------------------------------
// SERVER WORLD
// --------------------------------------------------

socket.on("world:init", data => {

    myId = socket.id;

    world = data.world;

    obstacles = data.obstacles;

    hearts = data.hearts || [];

    myPlayer = data.player;

    players[myId] = data.player;

    resizeCanvas();

    addSystemMessage(
        "Welcome to the Shipping Yard."
    );
});

socket.on("players:update", data => {

    players = data;

    if (myId && players[myId]) {
        myPlayer = players[myId];
    }

    updateHUD();
});

socket.on("hearts:update", data => {

    hearts = data || [];
});

// --------------------------------------------------
// MOVEMENT
// --------------------------------------------------

window.addEventListener("keydown", e => {

    if (
        e.key === "w" ||
        e.key === "W" ||
        e.key === "ArrowUp"
    ) {
        keys.up = true;
    }

    if (
        e.key === "s" ||
        e.key === "S" ||
        e.key === "ArrowDown"
    ) {
        keys.down = true;
    }

    if (
        e.key === "a" ||
        e.key === "A" ||
        e.key === "ArrowLeft"
    ) {
        keys.left = true;
    }

    if (
        e.key === "d" ||
        e.key === "D" ||
        e.key === "ArrowRight"
    ) {
        keys.right = true;
    }
});

window.addEventListener("keyup", e => {

    if (
        e.key === "w" ||
        e.key === "W" ||
        e.key === "ArrowUp"
    ) {
        keys.up = false;
    }

    if (
        e.key === "s" ||
        e.key === "S" ||
        e.key === "ArrowDown"
    ) {
        keys.down = false;
    }

    if (
        e.key === "a" ||
        e.key === "A" ||
        e.key === "ArrowLeft"
    ) {
        keys.left = false;
    }

    if (
        e.key === "d" ||
        e.key === "D" ||
        e.key === "ArrowRight"
    ) {
        keys.right = false;
    }
});

// --------------------------------------------------
// MOUSE
// --------------------------------------------------

canvas.addEventListener("mousemove", e => {

    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

canvas.addEventListener("mousedown", e => {

    if (e.button === 0) {
        mouse.down = true;
        shoot();
    }
});

window.addEventListener("mouseup", e => {

    if (e.button === 0) {
        mouse.down = false;
    }
});

// --------------------------------------------------
// INPUT SEND
// --------------------------------------------------

setInterval(() => {

    if (!myPlayer || !myPlayer.alive) {
        return;
    }

    const angle = getMouseAngle();

    socket.emit("player:input", {

        up: !!keys.up,
        down: !!keys.down,
        left: !!keys.left,
        right: !!keys.right,

        angle
    });

}, 33);

function getMouseAngle() {

    if (!myPlayer) {
        return 0;
    }

    const screenX =
        myPlayer.x - camera.x;

    const screenY =
        myPlayer.y - camera.y;

    return Math.atan2(
        mouse.y - screenY,
        mouse.x - screenX
    );
}

// --------------------------------------------------
// SHOOT
// --------------------------------------------------

let lastClientShot = 0;

function shoot() {

    const now = Date.now();

    if (now - lastClientShot < 180) {
        return;
    }

    lastClientShot = now;

    socket.emit("player:shoot", {

        angle: getMouseAngle()
    });
}

// --------------------------------------------------
// WEAPON EFFECT
// --------------------------------------------------

socket.on("weapon:shot", data => {

    effects.push({

        type: "muzzle",

        x: data.x,
        y: data.y,

        angle: data.angle,

        life: 100
    });
});

socket.on("combat:hit", data => {

    effects.push({

        type: "hit",

        x:
            players[data.targetId]?.x || 0,

        y:
            players[data.targetId]?.y || 0,

        life: 300
    });

    if (data.targetId === myId) {

        addSystemMessage(
            `⚠ HIT! -${data.damage} HP`
        );
    }
});

// --------------------------------------------------
// KILL
// --------------------------------------------------

socket.on("player:killed", data => {

    if (data.killerId === myId) {

        addKillMessage(
            `💀 ELIMINATION! ${data.victimName}`
        );

        addSystemMessage(
            `🏆 LEVEL ${data.level} REACHED!`
        );
    }

    if (data.victimId === myId) {

        addSystemMessage(
            `☠ You were eliminated by ${data.killerName}`
        );
    }
});

socket.on("player:respawn", data => {

    if (data.id === myId) {

        addSystemMessage(
            "🪖 Respawned. Back into battle!"
        );
    }
});

// --------------------------------------------------
// HEART PICKUP
// --------------------------------------------------

socket.on("heart:collected", data => {

    effects.push({

        type: "heal",

        x: data.x,
        y: data.y,

        life: 700
    });

    if (data.playerId === myId) {

        addSystemMessage(
            `❤️ Health restored! ${data.hp}/100`
        );
    }
});

// --------------------------------------------------
// CHAT
// --------------------------------------------------

chatInput.addEventListener("focus", () => {
    chatFocused = true;
});

chatInput.addEventListener("blur", () => {
    chatFocused = false;
});

chatInput.addEventListener("keydown", e => {

    if (e.key === "Enter") {

        const message =
            chatInput.value.trim();

        if (message) {

            socket.emit(
                "chat:message",
                message
            );

            chatInput.value = "";
        }
    }
});

socket.on("chat:message", data => {

    const div =
        document.createElement("div");

    div.innerHTML =
        `<b style="color:${data.color}">
            ${escapeHTML(data.name)}
        </b>: ${escapeHTML(data.message)}`;

    chatMessages.appendChild(div);

    chatMessages.scrollTop =
        chatMessages.scrollHeight;

    while (chatMessages.children.length > 40) {
        chatMessages.removeChild(
            chatMessages.firstChild
        );
    }
});

socket.on("system:message", data => {

    addSystemMessage(data.text);
});

function addSystemMessage(text) {

    const div =
        document.createElement("div");

    div.style.color = "#94a3b8";

    div.textContent = text;

    chatMessages.appendChild(div);

    chatMessages.scrollTop =
        chatMessages.scrollHeight;
}

function addKillMessage(text) {

    const div =
        document.createElement("div");

    div.style.color = "#f59e0b";
    div.style.fontWeight = "bold";

    div.textContent = text;

    chatMessages.appendChild(div);

    chatMessages.scrollTop =
        chatMessages.scrollHeight;
}

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}

// --------------------------------------------------
// CAMERA
// --------------------------------------------------

function updateCamera() {

    if (!myPlayer || !world) {
        return;
    }

    camera.x =
        myPlayer.x -
        canvas.width / 2;

    camera.y =
        myPlayer.y -
        canvas.height / 2;

    camera.x =
        Math.max(
            0,
            Math.min(
                camera.x,
                world.width - canvas.width
            )
        );

    camera.y =
        Math.max(
            0,
            Math.min(
                camera.y,
                world.height - canvas.height
            )
        );
}

// --------------------------------------------------
// DRAW WORLD
// --------------------------------------------------

function drawWorld() {

    ctx.fillStyle = "#064e78";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawWater();

    if (!world) {
        return;
    }

    drawDock();

    drawDockBorder();

    drawShips();

    drawCranes();

    drawContainers();

    drawCrates();

    drawHelipad();

    drawHearts();

    drawPlayers();

    drawEffects();
}

// --------------------------------------------------
// WATER
// --------------------------------------------------

function drawWater() {

    const grid = 55;

    ctx.save();

    ctx.translate(
        -(camera.x % grid),
        -(camera.y % grid)
    );

    for (
        let x = -grid;
        x < canvas.width + grid;
        x += grid
    ) {

        for (
            let y = -grid;
            y < canvas.height + grid;
            y += grid
        ) {

            ctx.strokeStyle =
                "rgba(100,210,255,0.13)";

            ctx.lineWidth = 2;

            ctx.beginPath();

            ctx.arc(
                x + 20,
                y + 20,
                12,
                0,
                Math.PI
            );

            ctx.stroke();
        }
    }

    ctx.restore();
}

// --------------------------------------------------
// DOCK
// --------------------------------------------------

function drawDock() {

    const d = world.dock;

    ctx.fillStyle = "#475569";

    ctx.fillRect(
        d.x - camera.x,
        d.y - camera.y,
        d.width,
        d.height
    );

    // concrete lines
    ctx.strokeStyle =
        "rgba(255,255,255,0.08)";

    ctx.lineWidth = 2;

    for (
        let x = d.x;
        x < d.x + d.width;
        x += 80
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x - camera.x,
            d.y - camera.y
        );

        ctx.lineTo(
            x - camera.x,
            d.y + d.height - camera.y
        );

        ctx.stroke();
    }

    for (
        let y = d.y;
        y < d.y + d.height;
        y += 80
    ) {

        ctx.beginPath();

        ctx.moveTo(
            d.x - camera.x,
            y - camera.y
        );

        ctx.lineTo(
            d.x + d.width - camera.x,
            y - camera.y
        );

        ctx.stroke();
    }
}

// --------------------------------------------------
// DOCK BORDER
// --------------------------------------------------

function drawDockBorder() {

    const d = world.dock;

    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 10;

    ctx.strokeRect(
        d.x - camera.x,
        d.y - camera.y,
        d.width,
        d.height
    );

    ctx.strokeStyle =
        "rgba(245,158,11,0.4)";

    ctx.lineWidth = 3;

    ctx.strokeRect(
        d.x - camera.x + 15,
        d.y - camera.y + 15,
        d.width - 30,
        d.height - 30
    );
}

// --------------------------------------------------
// SHIPPING CONTAINERS
// --------------------------------------------------

function drawContainers() {

    const colors = [
        "#dc2626",
        "#2563eb",
        "#16a34a",
        "#f59e0b",
        "#7c3aed"
    ];

    obstacles.forEach((o, index) => {

        const x =
            o.x - camera.x;

        const y =
            o.y - camera.y;

        ctx.fillStyle =
            colors[index % colors.length];

        ctx.fillRect(
            x,
            y,
            o.w,
            o.h
        );

        ctx.strokeStyle =
            "rgba(0,0,0,0.7)";

        ctx.lineWidth = 4;

        ctx.strokeRect(
            x,
            y,
            o.w,
            o.h
        );

        // Container ribs
        ctx.strokeStyle =
            "rgba(255,255,255,0.16)";

        ctx.lineWidth = 2;

        for (
            let xx = x + 20;
            xx < x + o.w;
            xx += 30
        ) {

            ctx.beginPath();

            ctx.moveTo(
                xx,
                y
            );

            ctx.lineTo(
                xx,
                y + o.h
            );

            ctx.stroke();
        }

        ctx.fillStyle =
            "rgba(255,255,255,0.75)";

        ctx.font =
            "bold 12px monospace";

        ctx.fillText(
            "CARGO",
            x + 10,
            y + 20
        );
    });
}

// --------------------------------------------------
// CRATES
// --------------------------------------------------

function drawCrates() {

    const cratePositions = [

        [350, 360],
        [730, 700],
        [900, 400],
        [1500, 450],
        [2000, 450],
        [740, 1200],
        [1000, 1220],
        [1370, 850],
        [1850, 900],
        [2000, 1200]
    ];

    cratePositions.forEach(p => {

        const x =
            p[0] - camera.x;

        const y =
            p[1] - camera.y;

        ctx.fillStyle = "#92400e";

        ctx.fillRect(
            x,
            y,
            42,
            42
        );

        ctx.strokeStyle = "#f59e0b";

        ctx.lineWidth = 3;

        ctx.strokeRect(
            x,
            y,
            42,
            42
        );

        ctx.beginPath();

        ctx.moveTo(x, y);
        ctx.lineTo(x + 42, y + 42);

        ctx.moveTo(x + 42, y);
        ctx.lineTo(x, y + 42);

        ctx.stroke();
    });
}

// --------------------------------------------------
// CRANES
// --------------------------------------------------

function drawCranes() {

    const cranes = [

        { x: 300, y: 250 },
        { x: 2040, y: 250 },
        { x: 300, y: 1250 },
        { x: 2040, y: 1250 }
    ];

    cranes.forEach(c => {

        const x =
            c.x - camera.x;

        const y =
            c.y - camera.y;

        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 12;

        ctx.beginPath();

        ctx.moveTo(x, y + 180);
        ctx.lineTo(x, y);

        ctx.lineTo(x + 180, y);

        ctx.stroke();

        ctx.strokeStyle = "#92400e";
        ctx.lineWidth = 6;

        ctx.beginPath();

        ctx.moveTo(x + 130, y);
        ctx.lineTo(x + 130, y + 110);

        ctx.stroke();

        ctx.fillStyle = "#111827";

        ctx.fillRect(
            x - 25,
            y + 175,
            50,
            20
        );
    });
}

// --------------------------------------------------
// HELIPAD
// --------------------------------------------------

function drawHelipad() {

    const x =
        1120 - camera.x;

    const y =
        700 - camera.y;

    ctx.strokeStyle =
        "#fbbf24";

    ctx.lineWidth = 7;

    ctx.strokeRect(
        x,
        y,
        220,
        150
    );

    ctx.fillStyle =
        "rgba(245,158,11,0.12)";

    ctx.fillRect(
        x,
        y,
        220,
        150
    );

    ctx.fillStyle =
        "#f8fafc";

    ctx.font =
        "bold 80px Arial";

    ctx.textAlign = "center";

    ctx.fillText(
        "H",
        x + 110,
        y + 105
    );

    ctx.textAlign = "left";
}

// --------------------------------------------------
// SHIPS
// --------------------------------------------------

function drawShips() {

    const ships = [

        {
            x: 80,
            y: 350,
            w: 480,
            h: 150,
            angle: 0
        },

        {
            x: 1800,
            y: 30,
            w: 520,
            h: 150,
            angle: 0
        },

        {
            x: 40,
            y: 1100,
            w: 420,
            h: 130,
            angle: 0
        },

        {
            x: 1940,
            y: 1050,
            w: 450,
            h: 140,
            angle: 0
        }
    ];

    ships.forEach(ship => {

        const x =
            ship.x - camera.x;

        const y =
            ship.y - camera.y;

        ctx.save();

        ctx.translate(
            x + ship.w / 2,
            y + ship.h / 2
        );

        // Hull
        ctx.fillStyle = "#111827";

        ctx.beginPath();

        ctx.moveTo(
            -ship.w / 2,
            -ship.h / 2 + 20
        );

        ctx.lineTo(
            ship.w / 2 - 40,
            -ship.h / 2 + 20
        );

        ctx.lineTo(
            ship.w / 2,
            ship.h / 2
        );

        ctx.lineTo(
            -ship.w / 2 + 50,
            ship.h / 2
        );

        ctx.closePath();

        ctx.fill();

        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 4;

        ctx.stroke();

        // Deck
        ctx.fillStyle = "#64748b";

        ctx.fillRect(
            -ship.w / 2 + 35,
            -ship.h / 2 + 35,
            ship.w - 80,
            ship.h - 60
        );

        // Containers on ship
        const shipColors = [
            "#ef4444",
            "#2563eb",
            "#16a34a",
            "#f59e0b"
        ];

        for (
            let i = 0;
            i < 8;
            i++
        ) {

            ctx.fillStyle =
                shipColors[i % 4];

            ctx.fillRect(
                -ship.w / 2 + 60 + i * 48,
                -5,
                40,
                35
            );
        }

        ctx.restore();
    });
}

// --------------------------------------------------
// HEARTS
// --------------------------------------------------

function drawHeart(x, y, scale = 1) {

    ctx.save();

    ctx.translate(
        x,
        y
    );

    ctx.scale(
        scale,
        scale
    );

    ctx.fillStyle = "#ef4444";

    ctx.beginPath();

    ctx.moveTo(0, 14);

    ctx.bezierCurveTo(
        -35,
        -8,
        -20,
        -32,
        0,
        -16
    );

    ctx.bezierCurveTo(
        20,
        -32,
        35,
        -8,
        0,
        14
    );

    ctx.fill();

    ctx.strokeStyle = "#fecaca";
    ctx.lineWidth = 3;

    ctx.stroke();

    ctx.restore();
}

function drawHearts() {

    hearts.forEach(heart => {

        const x =
            heart.x - camera.x;

        const y =
            heart.y - camera.y;

        const pulse =
            1 +
            Math.sin(Date.now() / 180) *
            0.08;

        // Glow
        ctx.beginPath();

        ctx.fillStyle =
            "rgba(239,68,68,0.15)";

        ctx.arc(
            x,
            y,
            30,
            0,
            Math.PI * 2
        );

        ctx.fill();

        drawHeart(
            x,
            y,
            pulse
        );

        ctx.fillStyle = "#fee2e2";

        ctx.font =
            "bold 10px Arial";

        ctx.textAlign = "center";

        ctx.fillText(
            "+25",
            x,
            y + 32
        );

        ctx.textAlign = "left";
    });
}

// --------------------------------------------------
// PLAYERS
// --------------------------------------------------

function drawPlayers() {

    Object.values(players).forEach(player => {

        if (!player.alive) {
            return;
        }

        const x =
            player.x - camera.x;

        const y =
            player.y - camera.y;

        drawSoldier(
            player,
            x,
            y
        );
    });
}

function drawSoldier(player, x, y) {

    const isMe =
        player.id === myId;

    // Shadow
    ctx.fillStyle =
        "rgba(0,0,0,0.45)";

    ctx.beginPath();

    ctx.ellipse(
        x,
        y + 18,
        23,
        10,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Player ring
    ctx.strokeStyle =
        isMe
            ? "#22c55e"
            : "#ef4444";

    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        25,
        0,
        Math.PI * 2
    );

    ctx.stroke();

    // Body
    ctx.fillStyle =
        isMe
            ? "#166534"
            : "#7f1d1d";

    ctx.fillRect(
        x - 13,
        y - 2,
        26,
        25
    );

    // Head
    ctx.fillStyle =
        "#d1d5db";

    ctx.beginPath();

    ctx.arc(
        x,
        y - 12,
        12,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Helmet
    ctx.fillStyle =
        isMe
            ? "#14532d"
            : "#450a0a";

    ctx.beginPath();

    ctx.arc(
        x,
        y - 15,
        13,
        Math.PI,
        Math.PI * 2
    );

    ctx.fill();

    // Rifle
    ctx.save();

    ctx.translate(
        x,
        y
    );

    ctx.rotate(
        player.angle
    );

    ctx.fillStyle = "#111827";

    ctx.fillRect(
        7,
        -3,
        32,
        6
    );

    ctx.fillStyle = "#374151";

    ctx.fillRect(
        27,
        -1,
        18,
        3
    );

    ctx.restore();

    // Name
    ctx.textAlign = "center";

    ctx.font =
        "bold 12px Arial";

    ctx.fillStyle =
        isMe
            ? "#86efac"
            : "#fecaca";

    ctx.fillText(
        player.name,
        x,
        y - 48
    );

    // Level
    ctx.font =
        "bold 10px Arial";

    ctx.fillStyle = "#fbbf24";

    ctx.fillText(
        `LVL ${player.level}`,
        x,
        y - 35
    );

    // Health background
    ctx.fillStyle =
        "rgba(0,0,0,0.7)";

    ctx.fillRect(
        x - 25,
        y + 32,
        50,
        5
    );

    // Health
    ctx.fillStyle =
        player.hp > 50
            ? "#22c55e"
            : player.hp > 25
                ? "#f59e0b"
                : "#ef4444";

    ctx.fillRect(
        x - 25,
        y + 32,
        50 * (player.hp / player.maxHp),
        5
    );

    ctx.textAlign = "left";
}

// --------------------------------------------------
// EFFECTS
// --------------------------------------------------

function drawEffects() {

    effects =
        effects.filter(effect => {

            effect.life -= 16;

            const x =
                effect.x - camera.x;

            const y =
                effect.y - camera.y;

            if (effect.type === "muzzle") {

                ctx.save();

                ctx.translate(
                    x,
                    y
                );

                ctx.rotate(
                    effect.angle
                );

                ctx.fillStyle =
                    "#fbbf24";

                ctx.beginPath();

                ctx.moveTo(30, 0);
                ctx.lineTo(55, -8);
                ctx.lineTo(42, 0);
                ctx.lineTo(55, 8);

                ctx.closePath();

                ctx.fill();

                ctx.restore();
            }

            if (effect.type === "hit") {

                ctx.strokeStyle =
                    "#fef08a";

                ctx.lineWidth = 4;

                ctx.beginPath();

                ctx.arc(
                    x,
                    y,
                    20 +
                    (300 - effect.life) / 5,
                    0,
                    Math.PI * 2
                );

                ctx.stroke();
            }

            if (effect.type === "heal") {

                ctx.fillStyle =
                    "#22c55e";

                ctx.font =
                    "bold 20px Arial";

                ctx.textAlign = "center";

                ctx.fillText(
                    "+25 ❤️",
                    x,
                    y - (700 - effect.life) / 20
                );

                ctx.textAlign = "left";
            }

            return effect.life > 0;
        });
}

// --------------------------------------------------
// MINIMAP
// --------------------------------------------------

function drawMinimap() {

    if (!world) {
        return;
    }

    const size = 190;

    const padding = 20;

    const x =
        canvas.width -
        size -
        padding;

    const y =
        canvas.height -
        size -
        padding;

    // Panel
    ctx.fillStyle =
        "rgba(2,6,23,0.92)";

    ctx.fillRect(
        x,
        y,
        size,
        size
    );

    ctx.strokeStyle =
        "#38bdf8";

    ctx.lineWidth = 2;

    ctx.strokeRect(
        x,
        y,
        size,
        size
    );

    const scaleX =
        size / world.width;

    const scaleY =
        size / world.height;

    // Water
    ctx.fillStyle =
        "#075985";

    ctx.fillRect(
        x,
        y,
        size,
        size
    );

    // Dock
    const d = world.dock;

    ctx.fillStyle =
        "#64748b";

    ctx.fillRect(
        x + d.x * scaleX,
        y + d.y * scaleY,
        d.width * scaleX,
        d.height * scaleY
    );

    // Obstacles
    obstacles.forEach(o => {

        ctx.fillStyle =
            "#92400e";

        ctx.fillRect(
            x + o.x * scaleX,
            y + o.y * scaleY,
            o.w * scaleX,
            o.h * scaleY
        );
    });

    // Hearts
    hearts.forEach(h => {

        ctx.fillStyle =
            "#ef4444";

        ctx.beginPath();

        ctx.arc(
            x + h.x * scaleX,
            y + h.y * scaleY,
            2,
            0,
            Math.PI * 2
        );

        ctx.fill();
    });

    // Players
    Object.values(players).forEach(player => {

        if (!player.alive) {
            return;
        }

        const px =
            x + player.x * scaleX;

        const py =
            y + player.y * scaleY;

        if (player.id === myId) {

            ctx.fillStyle =
                "#22c55e";

            ctx.beginPath();

            ctx.moveTo(
                px,
                py - 7
            );

            ctx.lineTo(
                px - 5,
                py + 6
            );

            ctx.lineTo(
                px + 5,
                py + 6
            );

            ctx.closePath();

            ctx.fill();

        } else {

            ctx.fillStyle =
                "#ef4444";

            ctx.beginPath();

            ctx.arc(
                px,
                py,
                4,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    });

    // Compass
    ctx.fillStyle =
        "#e2e8f0";

    ctx.font =
        "bold 11px Arial";

    ctx.textAlign = "center";

    ctx.fillText(
        "N",
        x + size / 2,
        y + 13
    );

    ctx.fillText(
        "S",
        x + size / 2,
        y + size - 5
    );

    ctx.textAlign = "left";
}

// --------------------------------------------------
// HUD
// --------------------------------------------------

function updateHUD() {

    if (!myPlayer) {
        return;
    }

    if (hudName) {
        hudName.textContent =
            myPlayer.name;
    }

    if (hudLevel) {
        hudLevel.textContent =
            `LVL ${myPlayer.level}`;
    }

    if (hudKills) {
        hudKills.textContent =
            `KILLS ${myPlayer.kills}`;
    }

    if (hudHealth) {
        hudHealth.textContent =
            `${myPlayer.hp}/100`;
    }

    if (hudPlayers) {

        hudPlayers.textContent =
            `OPPONENTS ${Math.max(
                0,
                Object.keys(players).length - 1
            )}`;
    }

    if (hudHearts) {

        const heartsCount =
            Math.ceil(
                myPlayer.hp / 20
            );

        hudHearts.innerHTML =
            "♥".repeat(heartsCount) +
            '<span class="empty-heart">' +
            "♥".repeat(5 - heartsCount) +
            "</span>";
    }

    if (levelProgress) {

        levelProgress.textContent =
            `${myPlayer.kills} ELIMINATIONS`;
    }
}

// --------------------------------------------------
// GAME LOOP
// --------------------------------------------------

function gameLoop() {

    updateCamera();

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawWorld();

    drawMinimap();

    requestAnimationFrame(gameLoop);
}

gameLoop();

// --------------------------------------------------
// CANVAS
// --------------------------------------------------

function resizeCanvas() {

    canvas.width =
        window.innerWidth;

    canvas.height =
        window.innerHeight;
}

resizeCanvas();