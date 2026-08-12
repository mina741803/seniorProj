const API_BASE = "api";

let currentScenarioId = "phish-001";
let currentScore = 0;

const root = document.getElementById("game-root");
const scoreValue = document.getElementById("score-value");

async function loadScenario(scenarioId) {
    const res = await fetch(`${API_BASE}/get-scenario.php?scenario_id=${encodeURIComponent(scenarioId)}`);
    const data = await res.json();

    if (data.error) {
        root.innerHTML = `<p class="narrative">Error: ${data.error}</p>`;
        return;
    }

    currentScenarioId = data.scenario_id;
    renderNode(data.node_id, data.node, data.title);
}

function renderNode(nodeId, node, title) {
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
            btn.addEventListener("click", () => submitChoice(nodeId, index));
            choiceList.appendChild(btn);
        });

        root.appendChild(choiceList);
        return;
    }

    // Terminal outcome node
    const badge = document.createElement("div");
    badge.className = `outcome-badge outcome-${node.result}`;
    badge.textContent = node.result.toUpperCase();
    root.appendChild(badge);

    currentScore += node.score;
    scoreValue.textContent = currentScore;

    const restartBtn = document.createElement("button");
    restartBtn.className = "choice-button";
    restartBtn.textContent = "Play this scenario again";
    restartBtn.addEventListener("click", () => loadScenario(currentScenarioId));
    root.appendChild(restartBtn);
}

async function submitChoice(nodeId, choiceIndex) {
    const res = await fetch(`${API_BASE}/submit-choice.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            scenario_id: currentScenarioId,
            node_id: nodeId,
            choice_index: choiceIndex,
        }),
    });

    const data = await res.json();

    if (data.error) {
        root.innerHTML = `<p class="narrative">Error: ${data.error}</p>`;
        return;
    }

    renderNode(data.node_id, data.node);
}

loadScenario(currentScenarioId);
