// ==== НАСТРОЙКА ПУТИ ====
const TOPIC_DIR = './questions';

// Точный список файлов из вашей папки questions/A_B/topics/
// (без расширения .json)
const TOPIC_FILES_HINT = {
  A_B: [
    'Безопасность движения и техника управления автомобилем',
    'Буксировка механических транспортных средств',
    'Движение в жилых зонах',
    'Движение по автомагистралям',
    'Движение через железнодорожные пути',
    'Дорожная разметка',
    'Дорожные знаки',
    'Начало движения, маневрирование',
    'Неисправности и условия допуска транспортных средств к эксплуатации',
    'Обгон, опережение, встречный разъезд',
    'Общие обязанности водителей',
    'Общие положения',
    'Оказание доврачебной медицинской помощи',
    'Остановка и стоянка',
    'Ответственность водителя',
    'Перевозка людей и грузов',
    'Пешеходные переходы и места остановок маршрутных транспортных средств',
    'Пользование внешними световыми приборами и звуковыми сигналами',
    'Применение аварийной сигнализации и знака аварийной остановки',
    'Применение специальных сигналов',
    'Приоритет маршрутных транспортных средств',
    'Проезд перекрестков',
    'Расположение транспортных средств на проезжей части',
    'Сигналы светофора и регулировщика',
    'Скорость движения',
    'Учебная езда и дополнительные требования к движению велосипедистов'
  ],
  C_D: [
    // Если для C_D файлы называются так же — они подхватятся автоматически.
    // Если нет — просто добавьте их сюда по аналогии.
  ],
};

// ---- состояние ----
const state = {
  category: 'A_B',
  topic: '',
  allQuestions: [],   // загруженные по теме
  queue: [],          // перемешанные
  index: 0,
  ok: 0,
  bad: 0,
  answered: false,
};

// ---- DOM ----
const $ = (id) => document.getElementById(id);
const screens = {
  start: $('screen-start'),
  quiz: $('screen-quiz'),
  result: $('screen-result'),
};
const topicSelect = $('topic');
const startBtn = $('start-btn');
const categorySelect = $('category');
const progressEl = $('progress');
const scoreOkEl = $('score-ok');
const scoreBadEl = $('score-bad');
const qText = $('q-text');
const qImage = $('q-image');
const answersEl = $('answers');
const hintEl = $('hint');
const nextBtn = $('next-btn');
const resultText = $('result-text');

// ---- утилиты ----
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Пытаемся загрузить JSON темы. Пробуем несколько вариантов пути.
async function tryFetchJson(paths) {
  for (const p of paths) {
    try {
      // Важно: кодируем пробелы и кириллицу в URL
      const r = await fetch(encodeURI(p));
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) return data;
        for (const v of Object.values(data)) {
          if (Array.isArray(v)) return v;
        }
      }
    } catch (_) {
      // пробуем следующий
    }
  }
  return null;
}

async function loadTopics() {
  const cat = categorySelect.value;
  const candidates = TOPIC_FILES_HINT[cat] || [];
  
  if (!candidates.length) {
    topicSelect.innerHTML = '<option value="">— нет тем для этой категории —</option>';
    startBtn.disabled = true;
    return;
  }

  topicSelect.innerHTML = '<option value="">— загрузка тем… —</option>';
  const loaded = [];

  for (const name of candidates) {
    const safe = name.replace(/\s+/g, '_');
    // Пробуем разные варианты путей (на случай, если структура отличается)
    const paths = [
      `${TOPIC_DIR}/${cat}/topics/${name}.json`,    // <-- наш основной путь
      `${TOPIC_DIR}/${cat}/topics/${safe}.json`,    // с подчёркиваниями вместо пробелов
      `${TOPIC_DIR}/${cat}/topic/${name}.json`,     // на всякий случай
      `${TOPIC_DIR}/${cat}/topic/${safe}.json`,
    ];
    const data = await tryFetchJson(paths);
    if (data && data.length) {
      loaded.push({ name, data });
    }
  }

  if (!loaded.length) {
    topicSelect.innerHTML = '<option value="">— не удалось загрузить темы —</option>';
    startBtn.disabled = true;
    return;
  }

  topicSelect.innerHTML =
    '<option value="">— выберите тему —</option>' +
    loaded
      .map((t, i) => `<option value="${i}">${t.name} (${t.data.length})</option>`)
      .join('');

  topicSelect._topics = loaded; // сохраняем для старта
  startBtn.disabled = true;
}

// ---- запуск тренировки ----
function startTraining() {
  const idx = topicSelect.value;
  if (idx === '') return;
  const topic = topicSelect._topics[Number(idx)];

  state.topic = topic.name;
  state.allQuestions = topic.data;
  state.queue = shuffle(topic.data);
  state.index = 0;
  state.ok = 0;
  state.bad = 0;
  state.answered = false;

  showScreen('quiz');
  renderQuestion();
}

function renderQuestion() {
  state.answered = false;
  hintEl.hidden = true;
  hintEl.textContent = '';
  nextBtn.disabled = true;

  const total = state.queue.length;
  const q = state.queue[state.index];

  progressEl.textContent = `Вопрос ${state.index + 1} / ${total}`;
  scoreOkEl.textContent = state.ok;
  scoreBadEl.textContent = state.bad;

  qText.textContent = q.question;

  if (q.image) {
    // Картинки тоже могут быть с кириллицей/пробелами
    qImage.src = encodeURI(q.image);
    qImage.hidden = false;
  } else {
    qImage.hidden = true;
    qImage.removeAttribute('src');
  }

  answersEl.innerHTML = '';
  q.answers.forEach((ans, i) => {
    const btn = document.createElement('button');
    btn.className = 'answer';
    btn.type = 'button';
    btn.textContent = `${i + 1}. ${ans.answer_text}`;
    btn.addEventListener('click', () => onAnswer(btn, ans.is_correct, q));
    answersEl.appendChild(btn);
  });
}

function onAnswer(btn, isCorrect, q) {
  if (state.answered) return;
  state.answered = true;

  [...answersEl.children].forEach((b) => (b.disabled = true));
  btn.classList.add(isCorrect ? 'correct' : 'wrong');

  if (isCorrect) {
    state.ok++;
    scoreOkEl.textContent = state.ok;
  } else {
    state.bad++;
    scoreBadEl.textContent = state.bad;
    
    // Подсветить правильный ответ
    const correctIndex = q.answers.findIndex((a) => a.is_correct);
    if (correctIndex >= 0) {
      answersEl.children[correctIndex].classList.add('correct');
    }
    showHint(q);
  }

  nextBtn.disabled = false;
  nextBtn.textContent = state.index + 1 < state.queue.length ? 'Дальше →' : 'Показать результат';
}

function showHint(q) {
  const parts = [];
  if (q.answer_tip) parts.push(q.answer_tip);
  if (q.correct_answer) parts.push(q.correct_answer);
  hintEl.textContent = parts.join('\n\n') || 'Правильный ответ подсвечен зелёным.';
  hintEl.hidden = false;
}

function nextQuestion() {
  if (state.index + 1 < state.queue.length) {
    state.index++;
    renderQuestion();
  } else {
    finish();
  }
}

function finish() {
  const total = state.queue.length;
  const percent = total ? Math.round((state.ok / total) * 100) : 0;
  resultText.textContent =
    `Тема: «${state.topic}»\n` +
    `Правильно: ${state.ok} из ${total} (${percent}%)\n` +
    `Ошибок: ${state.bad}`;
  showScreen('result');
}

// ---- события ----
categorySelect.addEventListener('change', loadTopics);
topicSelect.addEventListener('change', () => {
  startBtn.disabled = topicSelect.value === '';
});
startBtn.addEventListener('click', startTraining);
nextBtn.addEventListener('click', nextQuestion);
$('restart-btn').addEventListener('click', startTraining);
$('to-topics-btn').addEventListener('click', () => {
  showScreen('start');
});

// init
loadTopics();