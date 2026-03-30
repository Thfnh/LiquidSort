var game, level, color = ["red", "blue", "yellow", "green", "purple", "lightgrey", "lightblue", "orange", "brown", "pink"],
    water = [],
    w = [],
    currentLevel,
    clicked = [],
    transferring = false,
    won = false,
    moves = 0;

var testTubePosition = {
    0: [[-110, 130], [-20, 130], [70, 130], [-65, 320], [15, 320]],
    1: [[-110, 130], [-20, 130], [70, 130], [-110, 320], [-20, 320], [70, 320]],
    2: [[-140, 130], [-60, 130], [20, 130], [100, 130], [-110, 320], [-20, 320], [70, 320]],
    3: [[-140, 130], [-60, 130], [20, 130], [100, 130], [-140, 320], [-60, 320], [20, 320], [100, 320]],
    7: [[-140, 100], [-60, 100], [20, 100], [100, 100], [-140, 275], [-60, 275], [20, 275], [100, 275], [-140, 450], [-60, 450], [20, 450], [100, 450]],
}

window.onload = function () {
    game = document.getElementById("game");
    level = document.getElementById("level");
}

window.OpenLevel = function (x) {
    moves = 0;
    currentLevel = x;
    won = false;
    level.style.display = "block";
    level.innerHTML = "";
    water = [];
    let a = [], c = 0;
    for (let i = 0; i < x + 3; i++) {
        for (let j = 0; j < 4; j++) {
            a.push(color[i]);
        }
    }
    a = shuffle(a);
    for (let i = 0; i < x + 3; i++) {
        water[i] = [];
        for (let j = 0; j < 4; j++) {
            water[i].push(a[c]);
            c++;
        }
    }
    water.push(["transparent", "transparent", "transparent", "transparent"], ["transparent", "transparent", "transparent", "transparent"]);
    w = water.map((row) => [...row]);
    ApplyInfo();
}

function ApplyInfo(a = water) {
    if (!won) {
        let d = 0;
        let heading = ["EASY", "MEDIUM", "HARD", "VERY HARD", "", "", "", "IMPOSSIBLE"][currentLevel] || "LEVEL";
        level.innerHTML = `<div id='lvl-heading'>${heading}</div>`;

        for (let i of testTubePosition[currentLevel]) {
            // Tạo HTML cho 4 lớp màu, tính từ đáy (bottom) lên
            let tubeHTML = `<div class="test-tube" style="top:${i[1]}px; left: calc(50vw + ${i[0]}px);" onclick="Clicked(${d});">`;

            for (let j = 0; j < 4; j++) {
                // j=0 là đáy, j=3 là miệng ống
                let colorBase = a[d][j];
                let bottomPos = j * 30; // Mỗi lớp cao 30px, lớp sau đè lên lớp trước
                tubeHTML += `<div class="colors" style="background-color:${colorBase}; bottom:${bottomPos}px;"></div>`;
            }

            tubeHTML += `</div>`;
            level.innerHTML += tubeHTML;
            d++;
        }

        level.innerHTML += `
            <div id="restart" class="game-buttons" onclick="Restart();"> Restart </div>
            <div id="home" class="game-buttons" onclick="showMenu();"> Home </div>
            <div id="moves"> Moves: ${moves} </div>`;
    }
}

window.Clicked = function (x) {
    if (!transferring && !won) {
        if (clicked.length == 0) {
            if (water[x].every(c => c === "transparent")) return;
            clicked.push(x);
            document.getElementsByClassName("test-tube")[x].style.transform = "scale(1.08) translateY(-10px)";
        } else {
            let from = clicked[0];
            let to = x;
            clicked = [];
            document.getElementsByClassName("test-tube")[from].style.transform = "scale(1) rotate(0deg)";
            if (from !== to) {
                Transfer(from, to);
            }
        }
    }
}

function Transfer(a, b) {
    // Kiểm tra ống đích đầy hoặc ống đi trống
    if (water[b].filter(c => c !== "transparent").length >= 4) return;

    // Tìm màu trên cùng của ống A
    let topAIdx = -1;
    for (let i = 3; i >= 0; i--) {
        if (water[a][i] !== "transparent") { topAIdx = i; break; }
    }
    if (topAIdx === -1) return;
    let colorA = water[a][topAIdx];

    // Tìm màu trên cùng ống B để so sánh
    let topBIdx = -1;
    for (let i = 3; i >= 0; i--) {
        if (water[b][i] !== "transparent") { topBIdx = i; break; }
    }
    if (topBIdx !== -1 && water[b][topBIdx] !== colorA) return;

    transferring = true;
    moves++;


    // Logic chuyển dữ liệu (tạm giản lược để chạy ổn định)
    let count = 0;
    let availableB = 4 - (topBIdx + 1);

    for (let i = topAIdx; i >= 0; i--) {
        if (water[a][i] === colorA && count < availableB) {
            water[a][i] = "transparent";
            count++;
        } else break;
    }

    for (let i = 0; i < 4; i++) {
        if (water[b][i] === "transparent" && count > 0) {
            water[b][i] = colorA;
            count--;
        }
    }

    TransferAnim(a, b);
    setTimeout(() => {
        ApplyInfo();
        transferring = false;
        Won();
    }, 1500);
}

function TransferAnim(a, b) {
    let el = document.getElementsByClassName("test-tube")[a];
    el.style.zIndex = "100";
    el.style.transition = "all 0.5s ease";
    el.style.top = (testTubePosition[currentLevel][b][1] - 80) + "px";
    el.style.left = `calc(50vw + ${testTubePosition[currentLevel][b][0] - 50}px)`;
    el.style.transform = "rotate(70deg)";

    setTimeout(() => {
        el.style.transform = "rotate(0deg)";
        el.style.top = testTubePosition[currentLevel][a][1] + "px";
        el.style.left = `calc(50vw + ${testTubePosition[currentLevel][a][0]}px)`;
    }, 1000);
}

window.Restart = function () {
    moves = 0;
    water = w.map((a) => [...a]);
    won = false;
    ApplyInfo();
}

window.showMenu = function () {
    document.getElementById("level").style.display = "none";
}

function Won() {
    let isWon = true;
    for (let tube of water) {
        let first = tube[0];
        if (!tube.every(c => c === first)) {
            isWon = false;
            break;
        }
    }

    if (isWon) {
        won = true;
        level.innerHTML = `<div id="won">YOU WON!</div>
        <div class="game-buttons" onclick="Restart();">Restart</div>
        <div class="game-buttons" onclick="showMenu();">Home</div>`;
    }
}

function shuffle(x) {
    for (let i = x.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
}

window.ShowRules = function () {
    let rp = document.getElementById("rules-page");
    rp.style.display = "flex";
    setTimeout(() => rp.style.opacity = "1", 50);
}

window.HideRules = function () {
    let rp = document.getElementById("rules-page");
    rp.style.opacity = "0";
    setTimeout(() => rp.style.display = "none", 500);
}