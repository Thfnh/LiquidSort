// ==========================================
// 1. BIẾN TOÀN CỤC (GLOBAL VARIABLES)
// ==========================================
let game, level, color = ["red", "blue", "yellow", "green", "purple", "lightgrey", "lightblue", "orange", "brown", "pink"],
    water = [], w = [], currentLevel, clicked = [], transferring = false, won = false, moves = 0;

let testTubePosition = {
    0: [[-110, 130], [-20, 130], [70, 130], [-65, 320], [15, 320]],
    1: [[-110, 130], [-20, 130], [70, 130], [-110, 320], [-20, 320], [70, 320]],
    2: [[-140, 130], [-60, 130], [20, 130], [100, 130], [-110, 320], [-20, 320], [70, 320]],
    3: [[-140, 130], [-60, 130], [20, 130], [100, 130], [-140, 320], [-60, 320], [20, 320], [100, 320]],
    7: [[-140, 100], [-60, 100], [20, 100], [100, 100], [-140, 275], [-60, 275], [20, 275], [100, 275], [-140, 450], [-60, 450], [20, 450], [100, 450]],
};

let levelNames = ["Easy", "Medium", "Hard", "Very Hard", "Impossible"];

let history = [];
let aiRunning = false;
let soundEnabled = true;
let currentHintSolution = [];
let currentHintMove = null;
let hintIndex = 0;
let aiTimeout = null;
let stopAll = false;
let completedTubes = new Set();
let selectedAlgo = "DFS";
let confirmCallback = null;
let streamElement = null;


// ==========================================
// 2. KHỞI TẠO VÀ CÀI ĐẶT GIAO DIỆN (UI & SETTINGS)
// ==========================================
window.onload = function () {
    game = document.getElementById("game");
    level = document.getElementById("level");
    let savedSound = localStorage.getItem("sound");
    if (savedSound !== null) {
        soundEnabled = savedSound === "true";
    }
    updateSoundButton();
};

function scalePositions(scaleX = 1.8, scaleY = 1.2) {
    for (let key in testTubePosition) {
        testTubePosition[key] = testTubePosition[key].map(([x, y]) => [
            x * scaleX,
            y * scaleY
        ]);
    }
}

scalePositions();

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem("sound", soundEnabled);
    updateSoundButton();
}

function updateSoundButton() {
    let btn = document.getElementById("sound-toggle");
    if (!btn) return;
    btn.innerText = soundEnabled ? "ON" : "OFF";
}

function toggleSettings() {
    let panel = document.getElementById("settings-panel");
    panel.classList.toggle("active");
}

function showConfirm(message, callback) {
    let popup = document.getElementById("popup-confirm");
    let text = document.getElementById("popup-text");

    text.innerText = message;
    popup.style.display = "flex";

    confirmCallback = callback;
}

function confirmYes() {
    document.getElementById("popup-confirm").style.display = "none";
    if (confirmCallback) confirmCallback();
}

function confirmNo() {
    document.getElementById("popup-confirm").style.display = "none";
    confirmCallback = null;
}

function ShowRules() {
    document.getElementById("rules-page").style.display = "flex";
}

function HideRules() {
    document.getElementById("rules-page").style.display = "none";
}

function goHome() {
    showConfirm(
        "Quay về trang chính?\nTiến trình sẽ mất!",
        () => {
            window.location.href = "start.html";
        }
    );
}

function goToGame() {
    window.location.href = "game.html";
}


// ==========================================
// 3. QUẢN LÝ GAME & HIỂN THỊ (LEVEL & RENDERING)
// ==========================================
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
    let maxSteps = (x + 3) * (x >= 3 ? 30 : 15);

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

    let name = levelNames[Math.min(currentLevel, levelNames.length - 1)];
    level.innerHTML = `<div class="hud">
        <div>Level: ${name}</div>
        <div>Moves: ${moves}</div>
    </div>`;

    for (let i of testTubePosition[currentLevel]) {
        let html = `<div id="tube-${d}" class="test-tube" style="top:${i[1]}px; left: calc(50vw + ${i[0]}px);" onclick="Clicked(${d});">`;
        for (let j = 0; j < 4; j++) {
            html += `<div class="colors" style="background:${a[d][j]}; bottom:${j * 30}px;"></div>`;
        }
        html += `</div>`;
        level.innerHTML += html;
        d++;
    }

    level.innerHTML += `<div class="controls">
        <select id="algo-select" class="btn">
            <option value="DFS">AI: DFS</option>
            <option value="BFS">AI: BFS</option>
            <option value="A_STAR">AI: A*</option>
        </select>

        <button id="ai-solve" class="btn ai" onclick="AI_Solve()">AI Solve</button>
        <button class="btn hint" onclick="Hint()">Hint</button>
        <button class="btn undo" onclick="Undo()">Undo</button>
        <button class="btn restart" onclick="Restart()">Restart</button>
        <button class="btn home" onclick="goHome()">Home</button>
    </div>`;
    setTimeout(() => {
        let select = document.getElementById("algo-select");
        if (select) {
            select.value = selectedAlgo;
            select.onchange = function () {
                selectedAlgo = this.value;
            };
        }
    }, 0);

    InitStream();
    checkCompletedTubes();
}

function checkCompletedTubes() {
    for (let i = 0; i < water.length; i++) {
        let tube = water[i];
        let first = tube[0];

        let isComplete =
            first !== "transparent" &&
            tube.every(c => c === first);

        let el = document.getElementById(`tube-${i}`);
        if (!el) continue;

        if (isComplete) {
            if (!completedTubes.has(i)) {
                el.classList.add("completed");
                completedTubes.add(i);
            } else {
                el.classList.add("completed-static");
            }
        }
    }
}

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


// ==========================================
// 4. CƠ CHẾ CHƠI GAME & ĐIỀU KHIỂN LỊCH SỬ (GAMEPLAY MECHANICS)
// ==========================================
window.Clicked = function (x) {
    if (transferring || won || aiRunning) return;
    InitStream();

    let tubeElement = document.getElementById(`tube-${x}`);

    // clear tất cả selected
    document.querySelectorAll('.test-tube').forEach(t => {
        t.classList.remove("selected");
    });

    if (clicked.length === 0) {
        if (water[x].every(c => c === c[0] && c !== "transparent")) return;
        if (water[x].every(c => c === "transparent")) return;

        clicked = [x];
        tubeElement.classList.add("selected");

    } else {
        let from = clicked[0];

        if (from === x) {
            clicked = [];
            return;
        }
        AnimateAndTransfer(from, x);
        clicked = [];
    }
};

function isSameState(s1, s2) {
    return JSON.stringify(s1) === JSON.stringify(s2);
}

function isStateInSolutionPath(state, solution) {
    let current = w.map(r => [...r]); // trạng thái ban đầu

    for (let i = 0; i < solution.length; i++) {
        current = simulateMove(current, solution[i][0], solution[i][1]);

        if (isSameState(current, state)) {
            return i + 1; // vị trí đúng trong path
        }
    }

    return -1; // không nằm trong lời giải
}

function AnimateAndTransfer(a, b) {
    if (transferring) return;

    if (currentHintSolution && currentHintSolution.length > 0) {
        let nextState = simulateMove(water, a, b);
        let pos = isStateInSolutionPath(nextState, currentHintSolution);
        if (pos !== -1) {
            hintIndex = pos;
        } else {
            currentHintSolution = solveBFS(nextState);
            hintIndex = 0;
        }
    }

    saveState();
    let topA = water[a].findLastIndex(c => c !== "transparent");
    if (water[a].every(c => c === water[a][0] && c !== "transparent")) return;
    if (topA === -1) return;
    let colorA = water[a][topA];
    let topB = water[b].findLastIndex(c => c !== "transparent");
    if (topB === 3) return;
    if (topB !== -1 && water[b][topB] !== colorA) return;

    transferring = true;
    moves++;

    let tubeA = document.getElementById(`tube-${a}`);
    let tubeB = document.getElementById(`tube-${b}`);

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
            let leftA = parseFloat(tubeA.style.left);
            let topApx = parseFloat(tubeA.style.top);
            let leftB = parseFloat(tubeB.style.left);
            let topBpx = parseFloat(tubeB.style.top);

            let streamX = leftA + 45;
            let streamY = topApx + 20;
            let targetY2 = topBpx + 10;
            let streamHeight = targetY2 - streamY;
            streamHeight = Math.max(0, streamHeight);

            streamElement.style.position = "fixed";
            streamElement.style.left = `${streamX}px`;
            streamElement.style.top = `${streamY}px`;
            streamElement.style.height = `${streamHeight}px`;
            streamElement.style.backgroundColor = colorA;
            streamElement.classList.add("active");

            if (soundEnabled) {
                let s = document.getElementById("pourSound");
                s.currentTime = 0;
                s.play();
            }

            setTimeout(() => {
                streamElement.classList.remove("active");
                streamElement.style.height = "0";

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

function Transfer(a, b) {
    if (water[a].every(c => c === water[a][0] && c !== "transparent")) return;
    saveState();

    let topA = water[a].findLastIndex(c => c !== "transparent");
    if (topA === -1) return;
    let colorA = water[a][topA];
    let topB = water[b].findLastIndex(c => c !== "transparent");
    if (topB === 3) return;
    if (topB !== -1 && water[b][topB] !== colorA) return;

    transferring = true;
    moves++;

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

    setTimeout(() => {
        ApplyInfo();
        transferring = false;
        Won();
    }, 300);
}

function clearHighlight() {
    document.querySelectorAll('.test-tube').forEach(t => {
        t.classList.remove("highlight", "hint-from", "hint-to", "hint-soft-from", "hint-soft-to");
    });
}

function Won() {
    if (isVictory(water)) {
        won = true;

        let isLastLevel = currentLevel >= levelNames.length - 1;

        level.innerHTML = `<div class="win-screen">
            <h1> YOU WIN </h1>
            <p>Moves: ${moves}</p>
            ${!isLastLevel ? `<button onclick="OpenLevel(${currentLevel + 1})">Next Level</button>` : ""}
            <button onclick="Restart()">Play Again</button>
            <button onclick="goToGame()">Back</button>
        </div>`;

        if (soundEnabled) {
            document.getElementById("winSound").play();
        }
    }
}

function isVictory(state) {
    return state.every(t => {
        let first = t[0];
        if (first === "transparent") return true;
        return t.every(c => c === first);
    });
}

function saveState() {
    history.push(water.map(r => [...r]));
    if (history.length > 50) {
        history.shift();
    }
}

window.Undo = function () {
    if (history.length === 0) return;
    if (!transferring) {
        water = history.pop();
        currentHintSolution = [];
        currentHintMove = null;
        hintIndex = 0;

        ApplyInfo();
    }
};

function doRestart() {
    aiRunning = false;

    if (aiTimeout) {
        clearTimeout(aiTimeout);
        aiTimeout = null;
    }

    if (transferring) return;

    currentHintSolution = [];
    currentHintMove = null;
    hintIndex = 0;
    history = [];
    moves = 0;
    won = false;
    clicked = [];
    transferring = false;
    water = w.map(r => [...r]);

    completedTubes.clear();

    ApplyInfo();
}

window.Restart = function () {

    if (!won) {
        showConfirm(
            "Chơi lại level này?",
            () => doRestart()
        );
        return;
    }

    doRestart();
};


// ==========================================
// 5. HỆ THỐNG AI & TÌM KIẾM ĐƯỜNG ĐI (AI SYSTEM & PATHFINDING)
// ==========================================
function getHash(state) {
    let sorted = state.map(t => [...t]).sort((a, b) => a.join('').localeCompare(b.join('')));
    return sorted.map(t => t.map(c => c === "transparent" ? "0" : c[0]).join('')).join('|');
}

function canMove(state, from, to) {
    if (state[from].every(c => c === state[from][0] && c !== "transparent")) {
        return false;
    }
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

function solveBFS(initial, maxSteps = 50000) {
    let queue = [{ state: initial, path: [] }];
    let visited = new Set();
    visited.add(getHash(initial));

    let steps = 0;

    while (queue.length > 0) {
        if (steps++ > maxSteps) return null;

        let { state, path } = queue.shift();

        if (isVictory(state)) return path;

        for (let i = 0; i < state.length; i++) {
            for (let j = 0; j < state.length; j++) {
                if (i !== j && canMove(state, i, j)) {
                    let nextState = simulateMove(state, i, j);
                    let hash = getHash(nextState);

                    if (!visited.has(hash)) {
                        visited.add(hash);
                        queue.push({
                            state: nextState,
                            path: [...path, [i, j]]
                        });
                    }
                }
            }
        }
    }
    return null;
}

function aStarHeuristic(state) {
    let score = 0;
    state.forEach(tube => {
        let top = tube.findLastIndex(c => c !== "transparent");
        if (top === -1) return;

        let firstColor = tube[0];
        for (let i = 0; i <= top; i++) {
            if (tube[i] !== firstColor) {
                score += 10;
                break;
            }
        }
        if (top < 3) score += 5;
    });
    return score;
}

function solveAStar(initial) {
    let openList = [{ state: initial, path: [], g: 0, f: 0 }];
    let visited = new Map();

    while (openList.length > 0) {
        let currentIndex = 0;
        for (let i = 1; i < openList.length; i++) {
            if (openList[i].f < openList[currentIndex].f) {
                currentIndex = i;
            }
        }
        let current = openList.splice(currentIndex, 1)[0];

        if (isVictory(current.state)) return current.path;

        let hash = getHash(current.state);
        if (visited.has(hash) && visited.get(hash) <= current.g) continue;
        visited.set(hash, current.g);

        for (let i = 0; i < current.state.length; i++) {
            for (let j = 0; j < current.state.length; j++) {
                if (i !== j && canMove(current.state, i, j)) {
                    let nextState = simulateMove(current.state, i, j);
                    let g = current.g + 1;
                    let h = aStarHeuristic(nextState);

                    openList.push({
                        state: nextState,
                        path: [...current.path, [i, j]],
                        g: g,
                        f: g + h
                    });
                }
            }
        }
    }
    return null;
}

function solveDFS(initial, maxDepth = 50) {
    let visited = new Set();
    let path = [];
    let result = null;

    function dfs(state, depth) {
        if (depth > maxDepth) return false;
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
            if (dfs(simulateMove(state, m.i, m.j), depth + 1)) return true;
            path.pop();
        }

        return false;
    }

    dfs(initial, 0);
    return result;
}

window.AI_Solve = function () {
    if (transferring || won || aiRunning) return;
    aiRunning = true;

    let btn = document.getElementById("ai-solve");
    let algo = selectedAlgo;
    if (btn) btn.innerText = "Thinking (" + algo + ")...";

    setTimeout(() => {
        let sol;
        let startTime = performance.now();

        if (algo === "DFS") {
            sol = solveDFS(water);
        } else if (algo === "BFS") {
            sol = solveBFS(water);
        } else if (algo === "A_STAR") {
            sol = solveAStar(water);
        }

        let endTime = performance.now();
        console.log(`AI solved in ${(endTime - startTime).toFixed(2)}ms`);

        if (sol) {
            executeSolution(sol);
        } else {
            alert("Không tìm thấy đường đi!");
        }

        if (btn) btn.innerText = "AI Solve";
    }, 50);
};

function executeSolution(sol) {
    let i = 0;
    let speed = 900;

    function step() {
        if (i >= sol.length || won || !aiRunning) {
            aiRunning = false;
            return;
        }

        if (transferring) {
            aiTimeout = setTimeout(step, speed);
            return;
        }

        let [a, b] = sol[i];
        AnimateAndTransfer(a, b);
        i++;

        aiTimeout = setTimeout(step, speed);
    }

    aiRunning = true;
    step();
}


// ==========================================
// 6. HỆ THỐNG GỢI Ý (HINT SYSTEM)
// ==========================================
window.Hint = function () {
    if (transferring || won || aiRunning) return;

    clearHighlight();

    let btn = document.querySelector(".btn.hint");
    if (btn) btn.innerText = "Thinking...";

    setTimeout(() => {

        if (!currentHintSolution || currentHintSolution.length === 0) {
            currentHintSolution = solveBFS(water);
            hintIndex = 0;
        }

        if (!currentHintSolution || hintIndex >= currentHintSolution.length) {
            let fallback = getFallbackMove(water);

            if (fallback) {
                let [from, to] = fallback;
                currentHintMove = [from, to];

                let tubeA = document.getElementById(`tube-${from}`);
                let tubeB = document.getElementById(`tube-${to}`);

                if (tubeA && tubeB) {
                    tubeA.classList.add("hint-soft-from");
                    tubeB.classList.add("hint-soft-to");

                    setTimeout(() => {
                        tubeA.classList.remove("hint-soft-from");
                        tubeB.classList.remove("hint-soft-to");
                    }, 2000);
                }

                if (btn) btn.innerText = "Hint";
                return;
            }

            handleNoSolution();
            if (btn) btn.innerText = "Hint";
            return;
        }

        let [from, to] = currentHintSolution[hintIndex];
        currentHintMove = [from, to];

        let tubeA = document.getElementById(`tube-${from}`);
        let tubeB = document.getElementById(`tube-${to}`);

        if (tubeA && tubeB) {
            tubeA.classList.add("hint-soft-from");
            tubeB.classList.add("hint-soft-to");

            setTimeout(() => {
                tubeA.classList.remove("hint-soft-from");
                tubeB.classList.remove("hint-soft-to");
            }, 2000);
        }

        if (btn) btn.innerText = "Hint";

    }, 50);
};

function getFallbackMove(state) {
    let bestMove = null;
    let bestScore = -Infinity;

    for (let i = 0; i < state.length; i++) {
        for (let j = 0; j < state.length; j++) {
            if (i !== j && canMove(state, i, j)) {

                let score = 0;

                let A = state[i];
                let B = state[j];

                let topA = A.findLast(c => c !== "transparent");
                let topB = B.findLast(c => c !== "transparent");

                if (topA === topB) score += 10;

                if (B.every(c => c === "transparent")) score += 5;

                if (A.every(c => c === A[0])) score -= 5;

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = [i, j];
                }
            }
        }
    }

    return bestMove;
}

function handleNoSolution() {
    for (let i = 0; i < water.length; i++) {
        for (let j = 0; j < water.length; j++) {
            if (i !== j && canMove(water, i, j)) {
                let tubeA = document.getElementById(`tube-${i}`);
                let tubeB = document.getElementById(`tube-${j}`);
                if (tubeA && tubeB) {
                    tubeA.classList.add("hint-from");
                    tubeB.classList.add("hint-to");
                }
                return;
            }
        }
    }
    alert("Không còn nước đi hợp lệ!");
}