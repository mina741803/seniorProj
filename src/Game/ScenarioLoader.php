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
     * Summaries used to build the client-side shuffled play order and to
     * compute the total possible score for the performance-percentage bar.
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
                'max_score'  => $this->maxScoreForScenario($scenario),
            ];
        }

        return $summaries;
    }

    /**
     * The highest score reachable in a scenario — the score of its best
     * outcome node. Used to compute "earned / max possible" as a percentage.
     */
    private function maxScoreForScenario(array $scenario): int
    {
        $max = 0;

        foreach ($scenario['nodes'] as $node) {
            if ($node['type'] === 'outcome' && $node['score'] > $max) {
                $max = $node['score'];
            }
        }

        return $max;
    }
}
