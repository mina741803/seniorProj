const API_BASE = "api";

const DIFFICULTY_ORDER = ["easy", "medium", "hard"];
const RESULT_LABELS = { good: "CORRECT", bad: "INCORRECT", neutral: "NEUTRAL" };

let manifest = [];        // full scenario summaries from the server
let sessionOrder = [];    // shuffled scenario ids for this playthrough
let sessionIndex = 0;
let earnedScore = 0;
let maxPossibleScore = 0;

const root = document.getElementById("game-root");
const progressFill = document.getElementById("progress-fill");
const progressLabel = document.getElementById("progress-label");
const resetButton = document.getElementById("reset-button");

// Fisher-Yates shuffle — used per difficulty tier so category order stays unpredictable.
function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// Easy tier fully shuffled, then medium tier fully shuffled, then hard tier —
// categories are interleaved randomly within each tier rather than grouped.
function buildSessionOrder() {
    const order = [];
    DIFFICULTY_ORDER.forEach((difficulty) => {
        const tier = manifest.filter((s) => s.difficulty === difficulty);
        order.push(...shuffle(tier));
    });
    return order.map((s) => s.id);
}

function startNewSession() {
    sessionOrder = buildSessionOrder();
    sessionIndex = 0;
    earnedScore = 0;
    maxPossibleScore = manifest.reduce((sum, s) => sum + s.max_score, 0);
    updateProgressBar();
    loadCurrentScenario();
}

function updateProgressBar() {
    const rawPercent = maxPossibleScore > 0
        ? Math.round((earnedScore / maxPossibleScore) * 100)
        : 0;
    const clamped = Math.max(0, Math.min(100, rawPercent));
    progressFill.style.width = `${clamped}%`;
    progressLabel.textContent = `${clamped}%`;
}

async function loadCurrentScenario() {
    if (sessionIndex >= sessionOrder.length) {
        renderCompletionScreen();
        return;
    }

    const scenarioId = sessionOrder[sessionIndex];
    const res = await fetch(`${API_BASE}/get-scenario.php?scenario_id=${encodeURIComponent(scenarioId)}`);
    const data = await res.json();

    if (data.error) {
        root.innerHTML = `<p class="narrative">Error: ${data.error}</p>`;
        return;
    }

    renderNode(data.node_id, data.node, data.title, scenarioId);
}

function renderNode(nodeId, node, title, scenarioId) {
    root.innerHTML = "";

    if (title) {
        const heading = document.createElement("p");
        heading.className = "scenario-title";
        heading.textContent = title;
        root.appendChild(heading);
    }

    const narrative = document.createElement("p");
    narrative.className = "narrative";
    narrative.textContent = node.type === "outcome" ? node.feedback : node.narrative;
    root.appendChild(narrative);

    if (node.type === "decision") {
        const choiceList = document.createElement("div");
        choiceList.className = "choice-list";

        node.choices.forEach((choice, index) => {
            const btn = document.createElement("button");
            btn.className = "choice-button";
            btn.textContent = choice.text;
            btn.addEventListener("click", () => submitChoice(scenarioId, nodeId, index));
            choiceList.appendChild(btn);
        });

        root.appendChild(choiceList);
        return;
    }

    // Terminal outcome node
    const badge = document.createElement("div");
    badge.className = `outcome-badge outcome-${node.result}`;
    badge.textContent = RESULT_LABELS[node.result] || node.result.toUpperCase();
    root.appendChild(badge);

    earnedScore += node.score;
    updateProgressBar();

    const nextBtn = document.createElement("button");
    nextBtn.className = "choice-button next-button";
    nextBtn.textContent = sessionIndex + 1 >= sessionOrder.length ? "Finish" : "Next scenario";
    nextBtn.addEventListener("click", () => {
        sessionIndex += 1;
        loadCurrentScenario();
    });
    root.appendChild(nextBtn);
}

async function submitChoice(scenarioId, nodeId, choiceIndex) {
    const res = await fetch(`${API_BASE}/submit-choice.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            scenario_id: scenarioId,
            node_id: nodeId,
            choice_index: choiceIndex,
        }),
    });

    const data = await res.json();

    if (data.error) {
        root.innerHTML = `<p class="narrative">Error: ${data.error}</p>`;
        return;
    }

    renderNode(data.node_id, data.node, null, scenarioId);
}

function renderCompletionScreen() {
    root.innerHTML = "";

    const heading = document.createElement("p");
    heading.className = "scenario-title";
    heading.textContent = "Training complete";
    root.appendChild(heading);

    const message = document.createElement("p");
    message.className = "narrative";
    message.textContent = `Nice work — you made it through every scenario with a final performance score of ${progressLabel.textContent}. Hit Reset above to shuffle a new run.`;
    root.appendChild(message);
}

async function init() {
    const res = await fetch(`${API_BASE}/list-scenarios.php`);
    const data = await res.json();
    manifest = data.scenarios;
    startNewSession();
}

resetButton.addEventListener("click", startNewSession);

init();
