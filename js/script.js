// ============================================================
//  STATE & INIT
// ============================================================

var DEFAULT_LINKS = [
  { id: 1, name: 'Google',  url: 'https://google.com',      icon: '🔍' },
  { id: 2, name: 'YouTube', url: 'https://youtube.com',     icon: '▶️' },
  { id: 3, name: 'GitHub',  url: 'https://github.com',      icon: '🐙' },
  { id: 4, name: 'Gmail',   url: 'https://mail.google.com', icon: '✉️' },
  { id: 5, name: 'ChatGPT', url: 'https://chatgpt.com',     icon: '🤖' },
];

function safeJSON(key, fallback) {
  try {
    var v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveLinks() {
  try {
    localStorage.setItem('dashboard_links', JSON.stringify(state.links));
  } catch (e) {}
}

var state = {
  todos:           safeJSON('dashboard_todos', []),
  links:           safeJSON('dashboard_links', null),
  timerSeconds:    0,
  timerInterval:   null,
  timerRunning:    false,
  pomodoroMinutes: safeJSON('dashboard_pomodoro_duration', 25),
  sortPref:        safeJSON('dashboard_sort', 'default') || 'default',
  username:        localStorage.getItem('dashboard_username') || '',
  theme:           localStorage.getItem('dashboard_theme') || 'light',
};

state.timerSeconds = state.pomodoroMinutes * 60;

if (!state.links) {
  state.links = DEFAULT_LINKS.map(function (l) { return Object.assign({}, l); });
  saveLinks();
}

// ============================================================
//  THEME
// ============================================================

function loadTheme() {
  var btn = document.getElementById('theme-toggle');
  if (state.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (btn) btn.textContent = '☀️';
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (btn) btn.textContent = '🌙';
  }
}

function toggleTheme() {
  state.theme = (state.theme === 'dark') ? 'light' : 'dark';
  try { localStorage.setItem('dashboard_theme', state.theme); } catch (e) {}
  loadTheme();
}

// ============================================================
//  CLOCK & GREETING
// ============================================================

function getGreetingPrefix(hour) {
  if (hour >= 5  && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 21) return 'Good Evening';
  return 'Good Night';
}

function getGreetingEmoji(hour) {
  if (hour >= 5  && hour < 12) return '☀️';
  if (hour >= 12 && hour < 17) return '🌤️';
  if (hour >= 17 && hour < 21) return '🌆';
  return '🌙';
}

function updateClock() {
  var now  = new Date();
  var h    = now.getHours();
  var m    = now.getMinutes();
  var s    = now.getSeconds();
  var ampm = h >= 12 ? 'PM' : 'AM';
  var h12  = h % 12 || 12;
  var clockEl = document.getElementById('clock');
  if (clockEl) {
    clockEl.textContent = String(h12) + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0') + ' ' + ampm;
  }
  var days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var dateEl = document.getElementById('date');
  if (dateEl) {
    dateEl.textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
  }
  var greetingEl = document.getElementById('greeting');
  if (greetingEl) {
    if (state.username) {
      greetingEl.textContent = getGreetingPrefix(h) + ', ' + state.username + '! ' + getGreetingEmoji(h);
    } else {
      greetingEl.textContent = 'Welcome to Your Dashboard! 👋';
    }
  }
}

function showNameForm() {
  var row  = document.querySelector('.greeting-row');
  var form = document.getElementById('name-edit-form');
  var inp  = document.getElementById('name-input');
  if (row)  row.classList.add('hidden');
  if (form) form.classList.remove('hidden');
  if (inp)  { inp.value = state.username; inp.focus(); }
}

function hideNameForm() {
  var row  = document.querySelector('.greeting-row');
  var form = document.getElementById('name-edit-form');
  if (row)  row.classList.remove('hidden');
  if (form) form.classList.add('hidden');
}

function saveName() {
  var inp = document.getElementById('name-input');
  if (!inp) return;
  var val = inp.value.trim();
  if (!val) return;
  state.username = val;
  try { localStorage.setItem('dashboard_username', val); } catch (e) {}
  updateClock();
  hideNameForm();
}
// ============================================================
//  TIMER
// ============================================================

function renderTimer() {
  var mins = Math.floor(state.timerSeconds / 60);
  var secs = state.timerSeconds % 60;
  var el   = document.getElementById('timer-display');
  if (el) {
    el.textContent = String(mins).padStart(2,'0') + ':' + String(secs).padStart(2,'0');
  }
}

function beep() {
  try {
    var ctx  = new (window.AudioContext || window.webkitAudioContext)();
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1);
  } catch (e) {}
}

function startTimer() {
  if (state.timerRunning) return;
  if (state.timerSeconds === 0) return;
  clearInterval(state.timerInterval);
  var doneMsg = document.getElementById('timer-done-msg');
  if (doneMsg) doneMsg.classList.add('hidden');
  state.timerRunning = true;
  var display = document.getElementById('timer-display');
  var status  = document.getElementById('timer-status');
  if (display) display.classList.add('running');
  if (status)  status.textContent = 'Running';
  state.timerInterval = setInterval(function () {
    state.timerSeconds--;
    renderTimer();
    if (state.timerSeconds <= 0) {
      clearInterval(state.timerInterval);
      state.timerRunning = false;
      if (display) display.classList.remove('running');
      if (status)  status.textContent = 'Done!';
      beep();
      var msg = document.getElementById('timer-done-msg');
      if (msg) msg.classList.remove('hidden');
    }
  }, 1000);
}

function pauseTimer() {
  if (!state.timerRunning) return;
  clearInterval(state.timerInterval);
  state.timerRunning = false;
  var display = document.getElementById('timer-display');
  var status  = document.getElementById('timer-status');
  if (display) display.classList.remove('running');
  if (status)  status.textContent = 'Paused';
}

function resetTimer() {
  clearInterval(state.timerInterval);
  state.timerRunning = false;
  state.timerSeconds = state.pomodoroMinutes * 60;
  var display = document.getElementById('timer-display');
  var status  = document.getElementById('timer-status');
  var doneMsg = document.getElementById('timer-done-msg');
  if (display) display.classList.remove('running');
  if (status)  status.textContent = 'Ready';
  if (doneMsg) doneMsg.classList.add('hidden');
  renderTimer();
}

function updatePresetHighlight(minutes) {
  document.querySelectorAll('.preset-btn').forEach(function (btn) {
    btn.classList.toggle('active', parseInt(btn.dataset.minutes, 10) === minutes);
  });
}

function setDuration(minutesRaw) {
  if (state.timerRunning) return;
  var n = parseInt(minutesRaw, 10);
  if (isNaN(n) || n < 1 || n > 180) return;
  state.pomodoroMinutes = n;
  try { localStorage.setItem('dashboard_pomodoro_duration', n); } catch (e) {}
  resetTimer();
  updatePresetHighlight(n);
}
// ============================================================
//  TODOS
// ============================================================

function saveTodos() {
  try {
    localStorage.setItem('dashboard_todos', JSON.stringify(state.todos));
  } catch (e) {}
}

function updateTodoCount() {
  var total = state.todos.length;
  var done  = state.todos.filter(function (t) { return t.done; }).length;
  var el    = document.getElementById('todo-count');
  if (!el) return;
  if (total === 0) { el.textContent = 'No tasks yet'; return; }
  el.textContent = total + ' task' + (total !== 1 ? 's' : '') + ', ' + done + ' done';
}

function showTodoMsg(text, type, autoDismissMs) {
  var el = document.getElementById('todo-msg');
  if (!el) return;
  el.textContent = text;
  el.className   = 'todo-msg' + (type ? ' ' + type : '');
  if (autoDismissMs) {
    if (el._timer) clearTimeout(el._timer);
    el._timer = setTimeout(function () {
      el.textContent = '';
      el.className   = 'todo-msg';
    }, autoDismissMs);
  }
}

function isDuplicate(text, excludeId) {
  var norm = text.trim().toLowerCase();
  return state.todos.some(function (t) {
    return t.id !== excludeId && t.text.trim().toLowerCase() === norm;
  });
}

function addTodo(text) {
  var trimmed = text.trim();
  if (!trimmed) {
    showTodoMsg('⚠️ Task cannot be empty!', 'error', 3000);
    return;
  }
  if (isDuplicate(trimmed, null)) {
    showTodoMsg('⚠️ This task already exists!', 'error', 3000);
    return;
  }
  state.todos.push({ id: Date.now(), text: trimmed, done: false });
  saveTodos();
  renderTodos();
  showTodoMsg('✅ Task added!', 'success', 2000);
}

function renderTodos() {
  var display = state.todos.slice();

  switch (state.sortPref) {
    case 'name-az':
      display.sort(function (a, b) { return a.text.localeCompare(b.text); });
      break;
    case 'name-za':
      display.sort(function (a, b) { return b.text.localeCompare(a.text); });
      break;
    case 'incomplete-first':
      display.sort(function (a, b) { return (a.done ? 1 : 0) - (b.done ? 1 : 0); });
      break;
    case 'complete-first':
      display.sort(function (a, b) { return (b.done ? 1 : 0) - (a.done ? 1 : 0); });
      break;
    default:
      break;
  }

  var list = document.getElementById('todo-list');
  if (!list) return;
  list.innerHTML = '';

  display.forEach(function (todo) {
    var li = document.createElement('li');
    if (todo.done) li.classList.add('done');

    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = todo.done;
    cb.setAttribute('aria-label', 'Mark task done');
    cb.addEventListener('change', function () {
      var original = state.todos.find(function (t) { return t.id === todo.id; });
      if (original) original.done = cb.checked;
      saveTodos();
      renderTodos();
    });

    var span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;
    span.setAttribute('contenteditable', 'false');

    span.addEventListener('dblclick', function () {
      span.setAttribute('contenteditable', 'true');
      span.focus();
    });

    span.addEventListener('blur', function () {
      var newText = span.textContent.trim();
      if (!newText) {
        span.textContent = todo.text;
        span.setAttribute('contenteditable', 'false');
        return;
      }
      if (isDuplicate(newText, todo.id)) {
        span.textContent = todo.text;
        span.setAttribute('contenteditable', 'false');
        showTodoMsg('⚠️ A task with that name already exists!', 'error', 3000);
        return;
      }
      var original = state.todos.find(function (t) { return t.id === todo.id; });
      if (original) original.text = newText;
      span.setAttribute('contenteditable', 'false');
      saveTodos();
      renderTodos();
    });

    span.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); span.blur(); }
      if (e.key === 'Escape') { span.textContent = todo.text; span.setAttribute('contenteditable', 'false'); span.blur(); }
    });

    var del = document.createElement('button');
    del.className = 'todo-delete';
    del.textContent = '×';
    del.setAttribute('aria-label', 'Delete task');
    del.addEventListener('click', function () {
      state.todos = state.todos.filter(function (t) { return t.id !== todo.id; });
      saveTodos();
      renderTodos();
    });

    li.appendChild(cb);
    li.appendChild(span);
    li.appendChild(del);
    list.appendChild(li);
  });

  updateTodoCount();
}
// ============================================================
//  LINKS
// ============================================================

function renderLinks() {
  var grid = document.getElementById('links-grid');
  if (!grid) return;
  grid.innerHTML = '';

  state.links.forEach(function (link) {
    var card = document.createElement('div');
    card.className = 'link-card';

    var a = document.createElement('a');
    a.href   = link.url;
    a.target = '_blank';
    a.rel    = 'noopener noreferrer';
    a.setAttribute('aria-label', link.name);

    var iconEl = document.createElement('span');
    iconEl.className   = 'link-icon';
    iconEl.textContent = link.icon || '🔗';

    var lbl = document.createElement('span');
    lbl.className   = 'link-label';
    lbl.textContent = link.name;

    a.appendChild(iconEl);
    a.appendChild(lbl);

    var del = document.createElement('button');
    del.className   = 'link-delete';
    del.textContent = '×';
    del.setAttribute('aria-label', 'Delete link');
    del.addEventListener('click', function (e) {
      e.preventDefault();
      state.links = state.links.filter(function (l) { return l.id !== link.id; });
      saveLinks();
      renderLinks();
    });

    card.appendChild(a);
    card.appendChild(del);
    grid.appendChild(card);
  });
}

function addLink(name, url, icon) {
  if (!name || !url) return;
  state.links.push({ id: Date.now(), name: name, url: url, icon: icon || '🔗' });
  saveLinks();
  renderLinks();
}

// ============================================================
//  EVENT LISTENERS
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
  loadTheme();

  var editNameBtn   = document.getElementById('edit-name-btn');
  var nameSaveBtn   = document.getElementById('name-save-btn');
  var nameCancelBtn = document.getElementById('name-cancel-btn');
  var nameInput     = document.getElementById('name-input');

  if (editNameBtn)   editNameBtn.addEventListener('click', showNameForm);
  if (nameSaveBtn)   nameSaveBtn.addEventListener('click', saveName);
  if (nameCancelBtn) nameCancelBtn.addEventListener('click', hideNameForm);
  if (nameInput) {
    nameInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')  saveName();
      if (e.key === 'Escape') hideNameForm();
    });
  }

  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

  var timerStart = document.getElementById('timer-start');
  var timerPause = document.getElementById('timer-pause');
  var timerReset = document.getElementById('timer-reset');
  if (timerStart) timerStart.addEventListener('click', startTimer);
  if (timerPause) timerPause.addEventListener('click', pauseTimer);
  if (timerReset) timerReset.addEventListener('click', resetTimer);

  document.querySelectorAll('.preset-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setDuration(parseInt(btn.dataset.minutes, 10));
    });
  });

  var customSetBtn = document.getElementById('custom-set-btn');
  var customInput  = document.getElementById('custom-duration');
  if (customSetBtn) {
    customSetBtn.addEventListener('click', function () {
      if (customInput) setDuration(customInput.value);
    });
  }
  if (customInput) {
    customInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') setDuration(e.target.value);
    });
  }

  var todoAdd   = document.getElementById('todo-add');
  var todoInput = document.getElementById('todo-input');
  if (todoAdd) {
    todoAdd.addEventListener('click', function () {
      if (todoInput) { addTodo(todoInput.value); todoInput.value = ''; }
    });
  }
  if (todoInput) {
    todoInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { addTodo(e.target.value); e.target.value = ''; }
    });
  }

  var sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.value = state.sortPref;
    sortSelect.addEventListener('change', function () {
      state.sortPref = this.value;
      try { localStorage.setItem('dashboard_sort', state.sortPref); } catch (err) {}
      renderTodos();
    });
  }

  var addLinkBtn    = document.getElementById('add-link-btn');
  var addLinkForm   = document.getElementById('add-link-form');
  var linkNameInput = document.getElementById('link-name-input');
  var linkUrlInput  = document.getElementById('link-url-input');
  var linkSaveBtn   = document.getElementById('link-save-btn');
  var linkCancelBtn = document.getElementById('link-cancel-btn');

  if (addLinkBtn) {
    addLinkBtn.addEventListener('click', function () {
      if (addLinkForm) addLinkForm.classList.remove('hidden');
      if (linkNameInput) linkNameInput.focus();
    });
  }
  if (linkCancelBtn) {
    linkCancelBtn.addEventListener('click', function () {
      if (addLinkForm)   addLinkForm.classList.add('hidden');
      if (linkNameInput) linkNameInput.value = '';
      if (linkUrlInput)  linkUrlInput.value  = '';
    });
  }
  if (linkSaveBtn) {
    linkSaveBtn.addEventListener('click', function () {
      var name = linkNameInput ? linkNameInput.value.trim() : '';
      var url  = linkUrlInput  ? linkUrlInput.value.trim()  : '';
      if (name && url) {
        addLink(name, url, '🔗');
        if (addLinkForm)   addLinkForm.classList.add('hidden');
        if (linkNameInput) linkNameInput.value = '';
        if (linkUrlInput)  linkUrlInput.value  = '';
      }
    });
  }

  updatePresetHighlight(state.pomodoroMinutes);
  if (sortSelect) sortSelect.value = state.sortPref;
  updateClock();
  setInterval(updateClock, 1000);
  renderTimer();
  renderTodos();
  renderLinks();
});