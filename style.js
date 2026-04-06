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
};

window.onload = function () {
    game = document.getElementById("game");
    level = document.getElementById("level");
};

window.OpenLevel = function (x) {
    moves = 0;
    currentLevel = x;
    won = false;
    level.style.display = "block";
    level.innerHTML = "";

    let numFullTubes = x + 3;
    let tempWater = [];

    for (let i = 0; i < numFullTubes; i++) {
        tempWater[i] = [color[i], color[i], color[i], color[i]];
    }

    tempWater.push(["transparent", "transparent", "transparent", "transparent"]);
    tempWater.push(["transparent", "transparent", "transparent", "transparent"]);

    let shuffleSteps = 0;
    let maxSteps = (x + 3) * 15;

    while (shuffleSteps < maxSteps) {
        let from = Math.floor(Math.random() * tempWater.length);
        let to = Math.floor(Math.random() * tempWater.length);

        if (from !== to) {
            let topA = tempWater[from].findLastIndex(c => c !== "transparent");
            let topB = tempWater[to].findLastIndex(c => c !== "transparent");

            if (topA !== -1 && topB < 3) {
                let c = tempWater[from][topA];
                tempWater[from][topA] = "transparent";
                tempWater[to][topB + 1] = c;
                shuffleSteps++;
            }
        }
    }

    water = tempWater;
    w = water.map(r => [...r]);
    ApplyInfo();
};

function ApplyInfo(a = water) {
    if (won) return;

    let d = 0;
    level.innerHTML = `<div id='lvl-heading'>LEVEL</div>`;

    for (let i of testTubePosition[currentLevel]) {

        let html = `<div id="tube-${d}" class="test-tube" style="top:${i[1]}px; left: calc(50vw + ${i[0]}px);" onclick="Clicked(${d});">`;

        for (let j = 0; j < 4; j++) {
            html += `<div class="colors" style="background:${a[d][j]}; bottom:${j * 30}px;"></div>`;
        }

        html += `</div>`;
        level.innerHTML += html;
        d++;
    }

    level.innerHTML += `
<div class="controls">
    <button class="btn restart" onclick="Restart()"> Restart</button>
    <button class="btn ai" onclick="AI_Solve()" id="ai-solve"> AI Solve</button>
</div>
<div id="moves">Moves: ${moves}</div>`;
}

let streamElement = null;

// Hàm khởi tạo dòng nước (gọi 1 lần khi load game hoặc trong ApplyInfo lần đầu)
function InitStream() {
    if (!document.getElementById('pouring-stream')) {
        streamElement = document.createElement('div');
        streamElement.id = 'pouring-stream';
        streamElement.className = 'pouring-stream';
        level.appendChild(streamElement);
    } else {
        streamElement = document.getElementById('pouring-stream');
    }
}

const originalApplyInfo = ApplyInfo;
ApplyInfo = function (a) {
    originalApplyInfo(a);
    InitStream(); // Đảm bảo div stream luôn tồn tại
}

function AnimateAndTransfer(a, b) {
    let topA = water[a].findLastIndex(c => c !== "transparent");
    if (topA === -1) return;

    let colorA = water[a][topA];
    let topB = water[b].findLastIndex(c => c !== "transparent");

    if (topB === 3) return;
    if (topB !== -1 && water[b][topB] !== colorA) return;

    transferring = true;
    moves++;

    let tubeA = document.getElementById(`tube-${a}`);
    let tubeB = document.getElementById(`tube-${b}`);

    // === MOVE A NEAR B ===
    let rectB = tubeB.getBoundingClientRect();
    let rectA = tubeA.getBoundingClientRect();

    let targetLeft = rectB.left - rectA.width / 2 - 10;
    let targetTop = rectB.top - 50;

    let oldTop = tubeA.style.top;
    let oldLeft = tubeA.style.left;

    tubeA.style.top = `${targetTop}px`;
    tubeA.style.left = `${targetLeft}px`;
    tubeA.classList.remove("selected");

    setTimeout(() => {
        tubeA.classList.add("pouring");

        setTimeout(() => {

            // ===== FIX CHUẨN DÒNG NƯỚC =====
            let leftA = parseFloat(tubeA.style.left);
            let topApx = parseFloat(tubeA.style.top);

            let leftB = parseFloat(tubeB.style.left);
            let topBpx = parseFloat(tubeB.style.top);

            // điểm đổ (miệng chai A)
            let streamX = leftA + 45;
            let streamY = topApx + 20;

            // điểm nhận (chai B)
            let targetY2 = topBpx + 10;

            let streamHeight = targetY2 - streamY;
            streamHeight = Math.max(0, streamHeight);

            streamElement.style.position = "fixed";
            streamElement.style.left = `${streamX}px`;
            streamElement.style.top = `${streamY}px`;
            streamElement.style.height = `${streamHeight}px`;
            streamElement.style.backgroundColor = colorA;
            streamElement.classList.add("active");

            setTimeout(() => {

                streamElement.classList.remove("active");
                streamElement.style.height = "0";

                // ===== LOGIC NƯỚC =====
                let count = 0;
                let space = 3 - topB;

                for (let i = topA; i >= 0 && water[a][i] === colorA && count < space; i--) {
                    water[a][i] = "transparent";
                    count++;
                }

                for (let i = 0; i < 4 && count > 0; i++) {
                    if (water[b][i] === "transparent") {
                        water[b][i] = colorA;
                        count--;
                    }
                }

                ApplyInfo();

                setTimeout(() => {
                    let tubeA_New = document.getElementById(`tube-${a}`);
                    tubeA_New.classList.remove("pouring");
                    tubeA_New.style.top = oldTop;
                    tubeA_New.style.left = oldLeft;

                    setTimeout(() => {
                        transferring = false;
                        Won();
                    }, 400);

                }, 100);

            }, 400);

        }, 200);

    }, 500);
}

window.Clicked = function (x) {
    if (transferring || won) return;

    // Đảm bảo dòng nước đã tồn tại
    InitStream();

    let tubeElement = document.getElementById(`tube-${x}`);

    if (clicked.length === 0) {
        // --- CHỌN CHAI ĐẦU TIÊN ---
        if (water[x].every(c => c === "transparent")) return; // Chai rỗng

        clicked.push(x);
        tubeElement.classList.add("selected");
    } else {
        // --- CHỌN CHAI THỨ HAI ---
        let from = clicked[0];
        let fromElement = document.getElementById(`tube-${from}`);

        if (from === x) {
            // Click lại chai cũ -> Hủy chọn
            fromElement.classList.remove("selected");
            clicked = [];
        } else {
            // Thực hiện chuyển nước với animation mới
            AnimateAndTransfer(from, x);
            clicked = []; // Reset ngay để tránh click bậy
        }
    }
};

function Transfer(a, b) {
    // 1. Kiểm tra điều kiện lấy nước từ chai A
    let topA = water[a].findLastIndex(c => c !== "transparent");
    if (topA === -1) return;

    let colorA = water[a][topA];

    // 2. Kiểm tra điều kiện đổ nước vào chai B
    let topB = water[b].findLastIndex(c => c !== "transparent");
    if (topB === 3) return; // Chai B đã đầy
    if (topB !== -1 && water[b][topB] !== colorA) return; // Khác màu không đổ được

    // Bắt đầu quá trình chuyển (Khóa click để tránh lỗi)
    transferring = true;
    moves++;

    // 3. Tính toán số lượng khối màu có thể chuyển
    let count = 0;
    let space = 3 - topB;

    // Lấy màu ra khỏi chai A
    for (let i = topA; i >= 0 && water[a][i] === colorA && count < space; i--) {
        water[a][i] = "transparent";
        count++;
    }

    // Đổ màu vào chai B
    let actualCount = count; // Lưu lại số lượng để xử lý logic nếu cần
    for (let i = 0; i < 4 && count > 0; i++) {
        if (water[b][i] === "transparent") {
            water[b][i] = colorA;
            count--;
        }
    }

    // 4. Cập nhật giao diện sau một khoảng delay nhỏ để khớp với Animation CSS
    // Khoảng 300ms là thời gian vừa đủ để mắt người thấy chai nhấc lên rồi nước mới đổi
    setTimeout(() => {
        ApplyInfo(); // Vẽ lại các chai với màu mới

        // Mở khóa cho phép click lượt tiếp theo
        transferring = false;

        // Kiểm tra xem đã thắng chưa sau khi animation kết thúc
        Won();
    }, 300);
}

function Won() {
    if (isVictory(water)) {
        won = true;
        level.innerHTML = `<h1>YOU WIN</h1>`;
    }
}

function isVictory(state) {
    return state.every(t => t.every(c => c === t[0]));
}

// ================= AI =================

// normalize state (quan trọng)
function getHash(state) {
    let sorted = state.map(t => [...t]).sort((a, b) =>
        a.join('').localeCompare(b.join(''))
    );

    return sorted.map(t =>
        t.map(c => c === "transparent" ? "0" : c[0]).join('')
    ).join('|');
}

function canMove(state, from, to) {
    let A = state[from];
    let B = state[to];

    let topA = A.findLastIndex(c => c !== "transparent");
    if (topA === -1) return false;

    let topB = B.findLastIndex(c => c !== "transparent");
    if (topB === 3) return false;

    if (topB === -1) return true;
    return B[topB] === A[topA];
}

function simulateMove(state, from, to) {
    let s = state.map(t => [...t]);

    let A = s[from];
    let B = s[to];

    let topA = A.findLastIndex(c => c !== "transparent");
    let color = A[topA];

    let count = 0;
    for (let i = topA; i >= 0 && A[i] === color; i--) count++;

    let topB = B.findLastIndex(c => c !== "transparent");
    let space = 3 - topB;
    let move = Math.min(count, space);

    for (let i = 0; i < move; i++) {
        A[topA - i] = "transparent";
        B[topB + 1 + i] = color;
    }

    return s;
}

function heuristic(state, from, to) {
    let A = state[from];
    let B = state[to];

    let topA = A.findLast(c => c !== "transparent");
    let topB = B.findLast(c => c !== "transparent");

    let score = 0;
    if (topA === topB) score += 10;
    if (B.every(c => c === "transparent")) score += 2;

    return score;
}

function solveDFS(initial) {
    let visited = new Set();
    let path = [];
    let result = null;

    function dfs(state, depth) {
        if (depth > 80) return false;

        let hash = getHash(state);
        if (visited.has(hash)) return false;
        visited.add(hash);

        if (isVictory(state)) {
            result = [...path];
            return true;
        }

        let moves = [];

        for (let i = 0; i < state.length; i++) {
            for (let j = 0; j < state.length; j++) {
                if (i !== j && canMove(state, i, j)) {
                    moves.push({ i, j, score: heuristic(state, i, j) });
                }
            }
        }

        moves.sort((a, b) => b.score - a.score);

        for (let m of moves) {
            path.push([m.i, m.j]);

            if (dfs(simulateMove(state, m.i, m.j), depth + 1))
                return true;

            path.pop();
        }

        return false;
    }

    dfs(initial, 0);
    return result;
}

window.AI_Solve = function () {
    if (transferring || won) return;

    let btn = document.getElementById("ai-solve");
    if (btn) btn.innerText = "Thinking...";

    setTimeout(() => {
        let sol = solveDFS(water);

        if (sol) {
            executeSolution(sol);
        } else {
            alert("Không giải được!");
        }

        if (btn) btn.innerText = "AI Solve";
    }, 50);
};

function executeSolution(sol) {
    let i = 0;

    let interval = setInterval(() => {
        if (i >= sol.length || won) {
            clearInterval(interval);
            return;
        }

        let [a, b] = sol[i];
        Transfer(a, b);
        i++;
    }, 200);
}