<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Trainer</title>
    <link rel="icon" type="image/svg+xml" href="assets/img/logo.svg">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <nav class="navbar">
        <div class="navbar-brand">
            <img src="assets/img/logo.svg" alt="Security Trainer logo" class="navbar-logo">
            <span class="navbar-wordmark">Security Trainer</span>
        </div>
        <button id="reset-button" class="reset-button" type="button">Reset</button>
    </nav>

    <main class="page-content">
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
