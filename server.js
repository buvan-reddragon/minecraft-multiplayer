const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const WORLD = {
    width: 2400,
    height: 1600,

    // Main playable dock
    dock: {
        x: 250,
        y: 180,
        width: 1900,
        height: 1240
    }
};

// --------------------------------------------------
// SHIPPING YARD OBSTACLES
// --------------------------------------------------

const obstacles = [
    // Top container stacks
    { x: 430, y: 300, w: 260, h: 100 },
    { x: 760, y: 300, w: 220, h: 100 },
    { x: 1080, y: 300, w: 280, h: 100 },
    { x: 1450, y: 300, w: 250, h: 100 },

    // Left stacks
    { x: 380, y: 500, w: 120, h: 300 },
    { x: 580, y: 520, w: 130, h: 250 },

    // Center stacks
    { x: 950, y: 520, w: 250, h: 110 },
    { x: 1280, y: 520, w: 150, h: 260 },

    // Right stacks
    { x: 1600, y: 500, w: 260, h: 110 },
    { x: 1810, y: 650, w: 120, h: 280 },

    // Lower area
    { x: 450, y: 1000, w: 260, h: 110 },
    { x: 800, y: 900, w: 150, h: 250 },
    { x: 1050, y: 1050, w: 300, h: 110 },
    { x: 1450, y: 950, w: 180, h: 240 },
    { x: 1700, y: 1050, w: 270, h: 110 },

    // Bottom stacks
    { x: 650, y: 1250, w: 300, h: 90 },
    { x: 1150, y: 1250, w: 250, h: 90 },
    { x: 1500, y: 1250, w: 300, h: 90 }
];

// --------------------------------------------------
// PLAYERS
// --------------------------------------------------

const players = {};

const playerColors = [
    "#22c55e",
    "#ef4444",
    "#38bdf8",
    "#f59e0b",
    "#a855f7",
    "#ec4899",
    "#14b8a6",
    "#f97316"
];

// --------------------------------------------------
// HEALTH PICKUPS
// --------------------------------------------------

let hearts = [];

function randomDockPosition() {
    for (let attempt = 0; attempt < 100; attempt++) {

        const x =
            WORLD.dock.x + 80 +
            Math.random() * (WORLD.dock.width - 160);

        const y =
            WORLD.dock.y + 80 +
            Math.random() * (WORLD.dock.height - 160);

        if (!isInsideObstacle(x, y, 30)) {
            return { x, y };
        }
    }

    return {
        x: 1200,
        y: 800
    };
}

function createHeart() {

    const pos = randomDockPosition();

    hearts.push({
        id: Math.random().toString(36).slice(2),
        x: pos.x,
        y: pos.y,
        heal: 25
    });
}

// Initial hearts
for (let i = 0; i < 8; i++) {
    createHeart();
}

// New heart every 7 seconds
setInterval(() => {

    if (hearts.length < 12) {
        createHeart();
        broadcastHearts();
    }

}, 7000);

// --------------------------------------------------
// COLLISION
// --------------------------------------------------

function isInsideObstacle(x, y, radius = 20) {

    return obstacles.some(o => {

        return (
            x + radius > o.x &&
            x - radius < o.x + o.w &&
            y + radius > o.y &&
            y - radius < o.y + o.h
        );

    });
}

function isInsideDock(x, y, radius = 20) {

    return (
        x - radius >= WORLD.dock.x &&
        x + radius <= WORLD.dock.x + WORLD.dock.width &&
        y - radius >= WORLD.dock.y &&
        y + radius <= WORLD.dock.y + WORLD.dock.height
    );
}

function canMoveTo(x, y) {

    if (!isInsideDock(x, y, 20)) {
        return false;
    }

    if (isInsideObstacle(x, y, 20)) {
        return false;
    }

    return true;
}

// --------------------------------------------------
// SPAWN
// --------------------------------------------------

function findSpawnPoint() {

    for (let i = 0; i < 100; i++) {

        const p = randomDockPosition();

        if (!isInsideObstacle(p.x, p.y, 30)) {

            const tooClose = Object.values(players).some(player => {

                const dx = player.x - p.x;
                const dy = player.y - p.y;

                return Math.sqrt(dx * dx + dy * dy) < 160;
            });

            if (!tooClose) {
                return p;
            }
        }
    }

    return {
        x: 1200,
        y: 800
    };
}

// --------------------------------------------------
// LEVEL SYSTEM
// --------------------------------------------------

function calculateLevel(kills) {

    // 1 kill = level 1
    // 2 kills = level 2
    // etc.

    return kills;
}

// --------------------------------------------------
// PLAYER STATE
// --------------------------------------------------

function publicPlayer(player) {

    return {
        id: player.id,
        name: player.name,
        x: player.x,
        y: player.y,
        hp: player.hp,
        maxHp: player.maxHp,
        kills: player.kills,
        level: player.level,
        color: player.color,
        angle: player.angle,
        alive: player.alive
    };
}

// --------------------------------------------------
// HEART BROADCAST
// --------------------------------------------------

function broadcastHearts() {

    io.emit("hearts:update", hearts);
}

// --------------------------------------------------
// CONNECTION
// --------------------------------------------------

io.on("connection", socket => {

    console.log("Player connected:", socket.id);

    socket.on("player:join", name => {

        name = String(name || "Soldier")
            .replace(/[<>]/g, "")
            .trim()
            .slice(0, 14);

        if (!name) {
            name = "Soldier";
        }

        const spawn = findSpawnPoint();

        players[socket.id] = {

            id: socket.id,

            name,

            x: spawn.x,
            y: spawn.y,

            hp: 100,
            maxHp: 100,

            kills: 0,
            level: 0,

            angle: 0,

            alive: true,

            color:
                playerColors[
                    Object.keys(players).length %
                    playerColors.length
                ],

            lastShot: 0,

            input: {
                up: false,
                down: false,
                left: false,
                right: false
            }
        };

        socket.emit("world:init", {

            player: publicPlayer(players[socket.id]),

            world: WORLD,

            obstacles,

            hearts
        });

        io.emit("players:update", getAllPlayers());

        io.emit("system:message", {
            text: `${name} joined the shipping yard.`
        });

    });

    // --------------------------------------------------
    // MOVEMENT INPUT
    // --------------------------------------------------

    socket.on("player:input", input => {

        const player = players[socket.id];

        if (!player || !player.alive) {
            return;
        }

        player.input = {

            up: !!input.up,
            down: !!input.down,
            left: !!input.left,
            right: !!input.right
        };

        if (typeof input.angle === "number") {
            player.angle = input.angle;
        }
    });

    // --------------------------------------------------
    // SHOOT
    // --------------------------------------------------

    socket.on("player:shoot", data => {

        const shooter = players[socket.id];

        if (!shooter || !shooter.alive) {
            return;
        }

        const now = Date.now();

        // Fire rate
        if (now - shooter.lastShot < 180) {
            return;
        }

        shooter.lastShot = now;

        let angle = Number(data?.angle);

        if (!Number.isFinite(angle)) {
            angle = shooter.angle;
        }

        shooter.angle = angle;

        const range = 650;

        const endX =
            shooter.x + Math.cos(angle) * range;

        const endY =
            shooter.y + Math.sin(angle) * range;

        // Check enemy intersection
        let hitPlayer = null;
        let closestDistance = Infinity;

        for (const target of Object.values(players)) {

            if (
                target.id === shooter.id ||
                !target.alive
            ) {
                continue;
            }

            // Distance from target to shooting line
            const vx = endX - shooter.x;
            const vy = endY - shooter.y;

            const wx = target.x - shooter.x;
            const wy = target.y - shooter.y;

            const lengthSq = vx * vx + vy * vy;

            if (lengthSq === 0) {
                continue;
            }

            let t =
                (wx * vx + wy * vy) /
                lengthSq;

            t = Math.max(0, Math.min(1, t));

            const closestX =
                shooter.x + t * vx;

            const closestY =
                shooter.y + t * vy;

            const dx =
                target.x - closestX;

            const dy =
                target.y - closestY;

            const distance =
                Math.sqrt(dx * dx + dy * dy);

            const distanceFromShooter =
                Math.sqrt(
                    (target.x - shooter.x) ** 2 +
                    (target.y - shooter.y) ** 2
                );

            if (
                distance < 30 &&
                distanceFromShooter < range &&
                distanceFromShooter < closestDistance
            ) {

                hitPlayer = target;
                closestDistance = distanceFromShooter;
            }
        }

        // Send shooting effect to everybody
        io.emit("weapon:shot", {

            shooterId: shooter.id,

            x: shooter.x,
            y: shooter.y,

            angle
        });

        // Hit
        if (hitPlayer) {

            hitPlayer.hp -= 25;

            io.emit("combat:hit", {

                attackerId: shooter.id,
                targetId: hitPlayer.id,
                damage: 25,
                hp: hitPlayer.hp
            });

            if (hitPlayer.hp <= 0) {

                hitPlayer.hp = 0;
                hitPlayer.alive = false;

                shooter.kills += 1;

                shooter.level =
                    calculateLevel(shooter.kills);

                io.emit("player:killed", {

                    killerId: shooter.id,

                    victimId: hitPlayer.id,

                    killerName: shooter.name,

                    victimName: hitPlayer.name,

                    kills: shooter.kills,

                    level: shooter.level
                });

                // Respawn victim
                setTimeout(() => {

                    if (!players[hitPlayer.id]) {
                        return;
                    }

                    const spawn = findSpawnPoint();

                    hitPlayer.x = spawn.x;
                    hitPlayer.y = spawn.y;

                    hitPlayer.hp = 100;
                    hitPlayer.alive = true;

                    io.emit("player:respawn", {

                        id: hitPlayer.id,

                        x: hitPlayer.x,
                        y: hitPlayer.y,

                        hp: 100
                    });

                    io.emit("system:message", {

                        text:
                            `${hitPlayer.name} has respawned.`
                    });

                }, 2500);
            }
        }
    });

    // --------------------------------------------------
    // CHAT
    // --------------------------------------------------

    socket.on("chat:message", message => {

        const player = players[socket.id];

        if (!player) {
            return;
        }

        message = String(message || "")
            .replace(/[<>]/g, "")
            .trim()
            .slice(0, 120);

        if (!message) {
            return;
        }

        io.emit("chat:message", {

            id: player.id,

            name: player.name,

            color: player.color,

            message
        });

    });

    // --------------------------------------------------
    // DISCONNECT
    // --------------------------------------------------

    socket.on("disconnect", () => {

        const player = players[socket.id];

        if (player) {

            io.emit("system:message", {

                text:
                    `${player.name} left the shipping yard.`
            });

            delete players[socket.id];

            io.emit("players:update", getAllPlayers());
        }

        console.log("Player disconnected:", socket.id);
    });
});

// --------------------------------------------------
// UPDATE PLAYER MOVEMENT
// --------------------------------------------------

const TICK_RATE = 30;
const SPEED = 6;

setInterval(() => {

    for (const player of Object.values(players)) {

        if (!player.alive) {
            continue;
        }

        let dx = 0;
        let dy = 0;

        if (player.input.up) {
            dy -= 1;
        }

        if (player.input.down) {
            dy += 1;
        }

        if (player.input.left) {
            dx -= 1;
        }

        if (player.input.right) {
            dx += 1;
        }

        // Normalize diagonal movement
        if (dx !== 0 || dy !== 0) {

            const length =
                Math.sqrt(dx * dx + dy * dy);

            dx /= length;
            dy /= length;

            const newX =
                player.x + dx * SPEED;

            const newY =
                player.y + dy * SPEED;

            // Separate X/Y collision allows sliding
            if (canMoveTo(newX, player.y)) {
                player.x = newX;
            }

            if (canMoveTo(player.x, newY)) {
                player.y = newY;
            }
        }

        // Heart pickup
        for (let i = hearts.length - 1; i >= 0; i--) {

            const heart = hearts[i];

            const dist = Math.sqrt(
                (player.x - heart.x) ** 2 +
                (player.y - heart.y) ** 2
            );

            if (dist < 35 && player.hp < player.maxHp) {

                player.hp =
                    Math.min(
                        player.maxHp,
                        player.hp + heart.heal
                    );

                hearts.splice(i, 1);

                io.emit("heart:collected", {

                    playerId: player.id,

                    x: heart.x,
                    y: heart.y,

                    hp: player.hp
                });

                broadcastHearts();
            }
        }
    }

    io.emit("players:update", getAllPlayers());

}, 1000 / TICK_RATE);

// --------------------------------------------------
// GET PLAYERS
// --------------------------------------------------

function getAllPlayers() {

    const result = {};

    for (const id in players) {

        result[id] =
            publicPlayer(players[id]);
    }

    return result;
}

// --------------------------------------------------
// SERVER START
// --------------------------------------------------

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Arcadia Shipping Yard running on port ${PORT}`
    );

});