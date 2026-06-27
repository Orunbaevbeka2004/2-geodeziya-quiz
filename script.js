const TOTAL_TIME = 30;
let quiz = [];
let index = 0;
let score = 0;
let streak = 0;
let player = 'Player';
let selectedAnswers = [];
let timeLeft = TOTAL_TIME;
let timerId = null;
let answered = false;

const $ = (id) => document.getElementById(id);
const startScreen = $('start-screen');
const quizScreen = $('quiz-screen');
const resultScreen = $('result-screen');
const optionsBox = $('options');

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

function beep(type = 'ok') {
  if (!$('sound-toggle')?.checked) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = type === 'ok' ? 740 : 180;
    gain.gain.value = 0.05;
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 120);
  } catch (e) {}
}

function startQuiz() {
  player = $('player-name').value.trim() || 'Player';
  quiz = $('shuffle-toggle').checked ? shuffle(QUESTIONS) : [...QUESTIONS];
  index = 0;
  score = 0;
  streak = 0;
  selectedAnswers = [];
  $('player-label').textContent = player;
  $('score-label').textContent = '0';
  showScreen(quizScreen);
  renderQuestion();
}

function renderQuestion() {
  clearInterval(timerId);
  answered = false;
  timeLeft = TOTAL_TIME;
  const q = quiz[index];

  $('question-count').textContent = `Сұрақ ${index + 1} / ${quiz.length}`;
  $('streak-label').textContent = `🔥 Серия: ${streak}`;
  $('progress-bar').style.width = `${((index) / quiz.length) * 100}%`;
  $('question-text').textContent = q.question;
  $('feedback').className = 'feedback hidden';
  $('next-btn').classList.add('hidden');
  $('skip-btn').classList.remove('hidden');
  optionsBox.innerHTML = '';

  Object.entries(q.options).forEach(([letter, text]) => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.innerHTML = `<span class="letter">${letter}</span><span>${text}</span>`;
    btn.onclick = () => chooseAnswer(letter, btn);
    optionsBox.appendChild(btn);
  });

  updateTimer();
  timerId = setInterval(() => {
    timeLeft--;
    updateTimer();
    if (timeLeft <= 0) {
      chooseAnswer(null, null, true);
    }
  }, 1000);
}

function updateTimer() {
  $('timer-label').textContent = timeLeft;
  const offset = 113 - (timeLeft / TOTAL_TIME) * 113;
  $('timer-ring').style.strokeDashoffset = offset;
  $('timer-ring').style.stroke = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f59e0b' : '#22c55e';
}

function chooseAnswer(letter, clickedBtn, timeout = false) {
  if (answered) return;
  answered = true;
  clearInterval(timerId);

  const q = quiz[index];
  const isCorrect = letter === q.answer;
  const earned = isCorrect ? 500 + timeLeft * 20 + streak * 50 : 0;

  if (isCorrect) {
    score += earned;
    streak++;
    beep('ok');
  } else {
    streak = 0;
    beep('bad');
  }

  selectedAnswers.push({
    question: q.question,
    selected: letter,
    correct: q.answer,
    correctText: q.options[q.answer],
    selectedText: letter ? q.options[letter] : 'Уақыт бітті',
    isCorrect,
    points: earned
  });

  document.querySelectorAll('.option').forEach(btn => {
    btn.classList.add('disabled');
    const btnLetter = btn.querySelector('.letter').textContent;
    if (btnLetter === q.answer) btn.classList.add('correct');
    if (letter && btnLetter === letter && !isCorrect) btn.classList.add('wrong');
  });

  $('score-label').textContent = score;
  $('streak-label').textContent = `🔥 Серия: ${streak}`;
  const feedback = $('feedback');
  feedback.classList.remove('hidden');
  feedback.classList.add(isCorrect ? 'ok' : 'bad');
  feedback.textContent = isCorrect
    ? `Дұрыс! +${earned} ұпай`
    : timeout
      ? `Уақыт бітті. Дұрыс жауап: ${q.answer}) ${q.options[q.answer]}`
      : `Қате. Дұрыс жауап: ${q.answer}) ${q.options[q.answer]}`;

  $('next-btn').classList.remove('hidden');
  $('skip-btn').classList.add('hidden');
}

function nextQuestion() {
  if (!answered) return chooseAnswer(null, null);
  index++;
  if (index >= quiz.length) finishQuiz();
  else renderQuestion();
}

function finishQuiz() {
  clearInterval(timerId);
  $('progress-bar').style.width = '100%';
  const correctCount = selectedAnswers.filter(a => a.isCorrect).length;
  const percent = Math.round((correctCount / quiz.length) * 100);
  $('result-title').textContent = percent >= 80 ? 'Керемет нәтиже!' : percent >= 50 ? 'Жақсы нәтиже!' : 'Тағы дайындалу керек';
  $('final-score').textContent = `${correctCount} / ${quiz.length}`;
  $('final-details').textContent = `${player}, сен ${score} ұпай жинадың. Дұрыс жауап: ${percent}%`;
  saveLeaderboard(player, score, correctCount, percent);
  renderLeaderboard();
  renderReview();
  showScreen(resultScreen);
}

function saveLeaderboard(name, score, correct, percent) {
  const data = JSON.parse(localStorage.getItem('geoQuizLeaderboard') || '[]');
  data.push({ name, score, correct, percent, date: new Date().toLocaleDateString() });
  data.sort((a, b) => b.score - a.score);
  localStorage.setItem('geoQuizLeaderboard', JSON.stringify(data.slice(0, 10)));
}

function renderLeaderboard() {
  const data = JSON.parse(localStorage.getItem('geoQuizLeaderboard') || '[]');
  $('leaderboard-list').innerHTML = data.map(item => `<li><strong>${item.name}</strong> — ${item.score} ұпай (${item.correct}/30)</li>`).join('');
}

function renderReview() {
  const wrong = selectedAnswers.filter(a => !a.isCorrect);
  $('review-list').innerHTML = wrong.length
    ? wrong.map((a, i) => `<div class="review-item"><strong>${i + 1}. ${a.question}</strong><br>Сіздің жауап: ${a.selected || '-'} ${a.selectedText}<br>Дұрыс жауап: ${a.correct}) ${a.correctText}</div>`).join('')
    : '<p>Қате жоқ. Барлығы дұрыс!</p>';
}

$('start-btn').onclick = startQuiz;
$('restart-btn').onclick = () => showScreen(startScreen);
$('next-btn').onclick = nextQuestion;
$('skip-btn').onclick = () => chooseAnswer(null, null);
$('demo-btn').onclick = () => $('modal').classList.remove('hidden');
$('close-modal').onclick = () => $('modal').classList.add('hidden');
