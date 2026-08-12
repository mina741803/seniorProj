<?php

require_once __DIR__ . '/../../src/config.php';
require_once __DIR__ . '/../../src/Game/ScenarioLoader.php';

header('Content-Type: application/json');

try {
    $loader = new ScenarioLoader(SCENARIOS_PATH);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

echo json_encode(['scenarios' => $loader->allScenarioSummaries()]);
