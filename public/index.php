<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Awareness Trainer</title>
    <link rel="icon" type="image/svg+xml" href="assets/img/logo.svg">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <img src="assets/img/logo.svg" alt="Security Awareness Trainer logo" class="brand-logo">

    <main class="game-shell">
        <header class="game-header">
            <h1>Security Awareness Trainer</h1>
            <button id="reset-button" class="reset-button" type="button">Reset</button>
        </header>

        <div class="progress-track">
            <div id="progress-fill" class="progress-fill"></div>
            <span id="progress-label" class="progress-label">0%</span>
        </div>

        <div id="game-root" class="game-card">
            <p class="narrative">Loading scenario…</p>
        </div>
    </main>

    <script src="assets/js/game.js"></script>
</body>
</html>
