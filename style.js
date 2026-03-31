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
    <button class="btn restart" onclick="Restart()">Restart</button>
    <button class="btn ai" onclick="AI_Solve()" id="ai-solve">AI Solve</button>
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
    // 1. Kiểm tra logic nước (giữ nguyên logic cũ)
    let topA = water[a].findLastIndex(c => c !== "transparent");
    if (topA === -1) return; // Chai A rỗng (vô lý nhưng cứ check)

    let colorA = water[a][topA];
    let topB = water[b].findLastIndex(c => c !== "transparent");

    if (topB === 3) return; // B đầy
    if (topB !== -1 && water[b][topB] !== colorA) return; // Khác màu

    // Khóa click
    transferring = true;
    moves++;

    // Lấy DOM elements
    let tubeA = document.getElementById(`tube-${a}`);
    let tubeB = document.getElementById(`tube-${b}`);

    // --- BƯỚC 1: DI CHUYỂN CHAI A ĐẾN GẦN CHAI B ---

    // Lấy vị trí hiện tại của chai B từ CSS (vì dùng calc và px)
    // Ta cần ép kiểu để lấy số
    let rectB = tubeB.getBoundingClientRect();
    let rectA = tubeA.getBoundingClientRect();

    // Tính toán vị trí đích cho chai A (nằm bên trái và cao hơn chai B một chút)
    // Vì transform-origin là top-left, ta di chuyển miệng chai A đến gần miệng chai B
    let targetLeft = rectB.left - rectA.width / 2 - 10; // Nằm bên trái B 10px
    let targetTop = rectB.top - 50; // Nằm cao hơn B 50px để lấy đà đổ

    // Lưu lại vị trí cũ để reset
    let oldTop = tubeA.style.top;
    let oldLeft = tubeA.style.left;

    // Áp đặt vị trí mới (phải dùng pixel tuyệt đối)
    tubeA.style.top = `${targetTop}px`;
    tubeA.style.left = `${targetLeft}px`;
    tubeA.classList.remove("selected"); // Bỏ class selected cũ

    // --- BƯỚC 2: NGHIÊNG CHAI A VÀ ĐỔ NƯỚC (Sau khi di chuyển xong - 0.5s) ---
    setTimeout(() => {
        tubeA.classList.add("pouring");

        // --- BƯỚC 3: HIỆN DÒNG NƯỚC CHẢY (Sau khi nghiêng - 0.2s) ---
        setTimeout(() => {
            // Tính toán vị trí dòng nước (từ miệng chai A rơi xuống chai B)
            let rectA2 = tubeA.getBoundingClientRect();
            let rectB2 = tubeB.getBoundingClientRect();

            // Tâm miệng chai A (ổn định hơn khi xoay)
            let streamX = rectA2.left + rectA2.width * 0.75;
            let streamY = rectA2.top + 20;

            // Điểm nhận nước (miệng chai B)
            let targetY = rectB2.top + 10;

            // Chiều cao dòng nước
            // Chiều cao dòng nước rơi xuống miệng nước hiện tại của chai B
            // Nước trong B càng cao (topB lớn) thì dòng nước càng ngắn
            let waterLevelB = (3 - topB) * 30; // 30px mỗi khối
            let streamHeight = rectB.bottom - streamY - waterLevelB;

            streamElement.style.left = `${streamX}px`;
            streamElement.style.top = `${streamY}px`;
            streamElement.style.height = `${streamHeight}px`;
            streamElement.style.backgroundColor = colorA; // Dòng nước cùng màu
            streamElement.classList.add("active");

            streamX += 5;
            streamY += 10;

            // --- BƯỚC 4: CẬP NHẬT MẢNG WATER VÀ VẼ LẠI GIAO DIỆN (Khi đang đổ - 0.4s) ---
            setTimeout(() => {
                // Tắt dòng nước
                streamElement.classList.remove("active");
                streamElement.style.height = '0';

                // --- Logic tính toán lượng nước (Giữ nguyên của bạn) ---
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
                // --------------------------------------------------------

                ApplyInfo(); // Vẽ lại màu trong chai

                // --- BƯỚC 5: DI CHUYỂN CHAI A VỀ VỊ TRÍ CŨ (0.1s sau khi vẽ lại) ---
                setTimeout(() => {
                    let tubeA_New = document.getElementById(`tube-${a}`); // Lấy lại DOM sau ApplyInfo
                    tubeA_New.classList.remove("pouring");
                    tubeA_New.style.top = oldTop;
                    tubeA_New.style.left = oldLeft;

                    // Mở khóa click sau khi chai về chỗ cũ (0.5s nữa)
                    setTimeout(() => {
                        transferring = false;
                        Won();
                    }, 500);

                }, 100);

            }, 400); // Thời gian dòng nước chảy

        }, 200); // Thời gian chờ nghiêng chai xong

    }, 500); // Thời gian di chuyển chai A đến gần chai B
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