<?php

/**
 * Loads scenario content from scenarios.json and provides lookup by id.
 *
 * Scenario content is intentionally kept in version-controlled JSON rather
 * than the database — see repo-structure.md for the reasoning. This class
 * is the only place that touches the raw file.
 */
class ScenarioLoader
{
    private array $scenarios = [];

    public function __construct(string $jsonPath)
    {
        if (!file_exists($jsonPath)) {
            throw new RuntimeException("Scenario file not found: {$jsonPath}");
        }

        $raw = file_get_contents($jsonPath);
        $data = json_decode($raw, true);

        if (!is_array($data) || !isset($data['scenarios'])) {
            throw new RuntimeException('Scenario file is malformed.');
        }

        foreach ($data['scenarios'] as $scenario) {
            $this->scenarios[$scenario['id']] = $scenario;
        }
    }

    public function getScenario(string $id): ?array
    {
        return $this->scenarios[$id] ?? null;
    }

    /**
     * Lightweight summaries for a future scenario-select screen —
     * not used by the demo yet, but the API will want this soon.
     */
    public function allScenarioSummaries(): array
    {
        $summaries = [];

        foreach ($this->scenarios as $scenario) {
            $summaries[] = [
                'id'         => $scenario['id'],
                'title'      => $scenario['title'],
                'category'   => $scenario['category'],
                'difficulty' => $scenario['difficulty'],
            ];
        }

        return $summaries;
    }
}
