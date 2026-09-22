const appRoot = document.getElementById('app-root');
const resetButton = document.getElementById('reset-button');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const overallScoreEl = document.getElementById('overall-score');

let currentQuestion = null; // {id, category, prompt, options}

// Inline SVG icons (hand-drawn, 24x24, stroke-based). They use currentColor, so
// the CSS controls their color. These are static constants, not user/DB data.
const svgIcon = (body) =>
  `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" ` +
  `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

const CATEGORY_ICONS = {
  // fish hook
  phishing: svgIcon('<circle cx="15" cy="4" r="1.5"/><path d="M15 5.5V14a5 5 0 0 1-10 0v-2.5l3 2.5"/>'),
  // phone handset
  vishing: svgIcon('<path d="M5 3h3.5l2 5-2.5 1.5a11 11 0 0 0 6.5 6.5l1.5-2.5 5 2V19a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>'),
  // text-message bubble
  smishing: svgIcon('<path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1z"/><path d="M8 9h8M8 12.5h5"/>'),
  // ID badge (impersonation)
  pretexting: svgIcon('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16a3 3 0 0 1 6 0M14 10h4M14 13.5h3"/>'),
  // door
  tailgating: svgIcon('<path d="M3 21h18M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><circle cx="14.5" cy="12" r="1" fill="currentColor"/>'),
  // briefcase
  bec: svgIcon('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12.5h18"/>'),
  // USB stick
  usb_media: svgIcon('<rect x="7" y="9" width="10" height="13" rx="2"/><path d="M9 9V3h6v6"/><path d="M11 5.5v1M13 5.5v1"/>'),
  // voice waveform
  ai_voice: svgIcon('<path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4"/>'),
  // padlock
  physical_security: svgIcon('<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5M12 15v2"/>'),
  // notification bell
  mfa_fatigue: svgIcon('<path d="M6 16V10a6 6 0 0 1 12 0v6l2 2H4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
};
// Fallback for any category added later without an icon: shield
const DEFAULT_ICON = svgIcon('<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>');

async function apiFetch(url, options) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Not authenticated');
  }
  return res;
}

function updateOverallUI(overall) {
  progressFill.style.width = overall.percent + '%';
  progressLabel.textContent = overall.percent + '%';
  overallScoreEl.textContent = `Score: ${overall.correct} / ${overall.answered}`;
}

async function loadCategories() {
  const res = await apiFetch('/api/categories');
  const data = await res.json();
  updateOverallUI(data.overall);
  renderCategoryGrid(data.categories);
}

function renderCategoryGrid(categories) {
  currentQuestion = null;
  const grid = document.createElement('div');
  grid.className = 'category-grid';

  categories.forEach((cat) => {
    const card = document.createElement('div');
    card.className = 'category-card' + (cat.complete ? ' complete' : '');
    card.innerHTML = `
      <span class="category-icon">${CATEGORY_ICONS[cat.id] || DEFAULT_ICON}</span>
      <div class="category-name">${cat.name}</div>
      <div class="category-meta">${cat.answered} / ${cat.total_questions} answered</div>
      ${cat.answered > 0 ? `<span class="category-badge">${cat.correct} correct</span>` : ''}
      ${cat.complete ? '<div class="category-meta" style="margin-top:8px;">Category complete</div>' : ''}
    `;
    card.addEventListener('click', () => enterCategory(cat.id));
    grid.appendChild(card);
  });

  appRoot.innerHTML = '';
  appRoot.appendChild(grid);
}

async function enterCategory(categoryId) {
  const res = await apiFetch(`/api/question/${categoryId}`);
  const data = await res.json();

  if (data.done) {
    renderCategoryComplete(data);
    return;
  }

  currentQuestion = data;
  renderQuestion(data);
}

function renderCategoryComplete(data) {
  appRoot.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'game-card';
  card.innerHTML = `
    <div class="category-complete-title">You've completed ${data.name}</div>
    <p class="explanation-text">There are no more questions left in this category for this session.</p>
    <button class="primary-button" id="back-to-categories">Back to categories</button>
  `;
  appRoot.appendChild(card);
  document.getElementById('back-to-categories').addEventListener('click', loadCategories);
}

function renderQuestion(question) {
  appRoot.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'game-card';

  const backButton = document.createElement('button');
  backButton.className = 'back-link';
  backButton.textContent = '\u2190 Back to categories';
  backButton.addEventListener('click', loadCategories);

  const scenario = document.createElement('div');
  scenario.className = 'scenario-text';
  scenario.textContent = question.prompt;

  const optionsList = document.createElement('div');
  optionsList.className = 'options-list';

  question.options.forEach((optionText, index) => {
    const btn = document.createElement('button');
    btn.className = 'option-button';
    btn.textContent = optionText;
    btn.addEventListener('click', () => submitAnswer(index, optionsList));
    optionsList.appendChild(btn);
  });

  card.appendChild(backButton);
  card.appendChild(scenario);
  card.appendChild(optionsList);
  appRoot.appendChild(card);
}

async function submitAnswer(selectedIndex, optionsListEl) {
  // Disable all option buttons immediately to prevent double-submission.
  const buttons = optionsListEl.querySelectorAll('.option-button');
  buttons.forEach((b) => (b.disabled = true));

  const res = await apiFetch('/api/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question_id: currentQuestion.id,
      selected_index: selectedIndex,
    }),
  });
  const result = await res.json();

  buttons.forEach((b, i) => {
    if (i === result.correct_index) b.classList.add('correct');
    else if (i === selectedIndex) b.classList.add('incorrect');
  });

  updateOverallUI(result.overall);
  renderResult(result, optionsListEl);
}

function renderResult(result, optionsListEl) {
  const card = optionsListEl.parentElement;

  const badge = document.createElement('div');
  badge.className = 'result-badge ' + (result.correct ? 'correct' : 'incorrect');
  badge.textContent = result.correct ? 'CORRECT' : 'INCORRECT';

  const explanation = document.createElement('div');
  explanation.className = 'explanation-text';
  explanation.textContent = result.explanation;

  const nextButton = document.createElement('button');
  nextButton.className = 'primary-button';
  nextButton.textContent = 'Next question';
  nextButton.addEventListener('click', () => enterCategory(currentQuestion.category));

  card.appendChild(badge);
  card.appendChild(explanation);
  card.appendChild(nextButton);
}

resetButton.addEventListener('click', async () => {
  await apiFetch('/api/reset', { method: 'POST' });
  loadCategories();
});

loadCategories();
