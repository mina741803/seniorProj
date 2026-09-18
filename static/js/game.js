const appRoot = document.getElementById('app-root');
const resetButton = document.getElementById('reset-button');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const overallScoreEl = document.getElementById('overall-score');

let currentQuestion = null; // {id, category, prompt, options}

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
