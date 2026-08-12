<?php

require_once __DIR__ . '/../../src/config.php';
require_once __DIR__ . '/../../src/Game/ScenarioLoader.php';

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);

$scenarioId  = $input['scenario_id']  ?? null;
$nodeId      = $input['node_id']      ?? null;
$choiceIndex = $input['choice_index'] ?? null;

if (!$scenarioId || !$nodeId || $choiceIndex === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing scenario_id, node_id, or choice_index']);
    exit;
}

try {
    $loader = new ScenarioLoader(SCENARIOS_PATH);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

$scenario = $loader->getScenario($scenarioId);

if ($scenario === null || !isset($scenario['nodes'][$nodeId])) {
    http_response_code(404);
    echo json_encode(['error' => 'Scenario or node not found']);
    exit;
}

$currentNode = $scenario['nodes'][$nodeId];

if ($currentNode['type'] !== 'decision' || !isset($currentNode['choices'][$choiceIndex])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid choice for this node']);
    exit;
}

$nextNodeId = $currentNode['choices'][$choiceIndex]['next'];
$nextNode = $scenario['nodes'][$nextNodeId] ?? null;

if ($nextNode === null) {
    http_response_code(500);
    echo json_encode(['error' => "Choice points to missing node '{$nextNodeId}'"]);
    exit;
}

echo json_encode([
    'scenario_id' => $scenario['id'],
    'node_id'     => $nextNodeId,
    'node'        => $nextNode,
    'is_terminal' => $nextNode['type'] === 'outcome',
]);
