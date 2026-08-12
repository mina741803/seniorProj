<?php

require_once __DIR__ . '/../../src/config.php';
require_once __DIR__ . '/../../src/Game/ScenarioLoader.php';

header('Content-Type: application/json');

$scenarioId = $_GET['scenario_id'] ?? 'phish-001';

try {
    $loader = new ScenarioLoader(SCENARIOS_PATH);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

$scenario = $loader->getScenario($scenarioId);

if ($scenario === null) {
    http_response_code(404);
    echo json_encode(['error' => "Scenario '{$scenarioId}' not found"]);
    exit;
}

$startNodeId = $scenario['start_node'];
$node = $scenario['nodes'][$startNodeId] ?? null;

if ($node === null) {
    http_response_code(500);
    echo json_encode(['error' => 'Scenario has no valid start node']);
    exit;
}

echo json_encode([
    'scenario_id' => $scenario['id'],
    'title'       => $scenario['title'],
    'category'    => $scenario['category'],
    'difficulty'  => $scenario['difficulty'],
    'node_id'     => $startNodeId,
    'node'        => $node,
]);
