// ============================================================
//  STATE / INIT
// ============================================================

var DEFAULT_LINKS = [
  { id: 1, name: "Google",  url: "https://google.com",      icon: "🔍" },
  { id: 2, name: "YouTube", url: "https://youtube.com",     icon: "▶️" },
  { id: 3, name: "GitHub",  url: "https://github.com",      icon: "🐙" },
  { id: 4, name: "Gmail",   url: "https://mail.google.com", icon: "✉️" },
  { id: 5, name: "ChatGPT", url: "https://chatgpt.com",     icon: "🤖" },
];

var state = {
  todos: JSON.parse(localStorage.getItem("dashboard_todos") || "[]"),
  links: JSON.parse(localStorage.getItem("dashboard_links") || "null"),
  timerSeconds: 25 * 60,
  timerInterval: null,
  timerRunning: false,
};

if (!state.links) {
  state.links = DEFAULT_LINKS.map(function(l){ return Object.assign({}, l); });
  saveLinks();
}

// ============================================================
//  CLOCK
// ============================================================

function updateClock() {
  var now  = new Date();
  var h    = now.getHours();
  var m    = now.getMinutes();
  var s    = now.getSeconds();
  var ampm = h >= 12 ? "PM" : "AM";
  var h12  = h % 12 || 12;
  document.getElementById("clock").textContent =
    String(h12) + ":" + String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0") + " " + ampm;
  var days   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  var months = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
  document.getElementById("date").textContent =
    days[now.getDay()] + ", " + months[now.getMonth()] + " " + now.getDate() + ", " + now.getFullYear();
  var greeting;
  if      (h >= 5  && h < 12) greeting = "Good Morning ☀️";
  else if (h >= 12 && h < 17) greeting = "Good Afternoon 🌤️";
  else if (h >= 17 && h < 21) greeting = "Good Evening 🌆";
  else                         greeting = "Good Night 🌙";
  document.getElementById("greeting").textContent = greeting;
}
updateClock();
setInterval(updateClock, 1000);
// ============================================================
//  TIMER
// ============================================================

function renderTimer() {
  var m = Math.floor(state.timerSeconds / 60);
  var s = state.timerSeconds % 60;
  document.getElementById("timer-display").textContent =
    String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}

function beep() {
  try {
    var ctx  = new (window.AudioContext || window.webkitAudioContext)();
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine"; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1);
  } catch(e) {}
}

function startTimer() {
  if (state.timerRunning || state.timerSeconds === 0) return;
  state.timerRunning = true;
  document.getElementById("timer-display").classList.add("running");
  document.getElementById("timer-status").textContent = "Running";
  state.timerInterval = setInterval(function() {
    state.timerSeconds--;
    renderTimer();
    if (state.timerSeconds <= 0) {
      clearInterval(state.timerInterval);
      state.timerRunning = false;
      document.getElementById("timer-display").classList.remove("running");
      document.getElementById("timer-status").textContent = "Done!";
      beep();
      alert("Focus session complete! Great work.");
    }
  }, 1000);
}

function pauseTimer() {
  if (!state.timerRunning) return;
  clearInterval(state.timerInterval);
  state.timerRunning = false;
  document.getElementById("timer-display").classList.remove("running");
  document.getElementById("timer-status").textContent = "Paused";
}

function resetTimer() {
  clearInterval(state.timerInterval);
  state.timerRunning = false;
  state.timerSeconds = 25 * 60;
  renderTimer();
  document.getElementById("timer-display").classList.remove("running");
  document.getElementById("timer-status").textContent = "Ready";
}

// ============================================================
//  TODOS
// ============================================================

function saveTodos() {
  localStorage.setItem("dashboard_todos", JSON.stringify(state.todos));
}

function updateTodoCount() {
  var total = state.todos.length;
  var done  = state.todos.filter(function(t){ return t.done; }).length;
  var el    = document.getElementById("todo-count");
  if (total === 0) { el.textContent = "No tasks yet"; return; }
  el.textContent = total + " task" + (total !== 1 ? "s" : "") + ", " + done + " done";
}

function renderTodos() {
  var list = document.getElementById("todo-list");
  list.innerHTML = "";
  state.todos.forEach(function(todo) {
    var li = document.createElement("li");
    if (todo.done) li.classList.add("done");
    var cb = document.createElement("input");
    cb.type = "checkbox"; cb.checked = todo.done;
    cb.setAttribute("aria-label", "Mark task done");
    cb.addEventListener("change", function() { todo.done = cb.checked; saveTodos(); renderTodos(); });
    var span = document.createElement("span");
    span.className = "todo-text"; span.textContent = todo.text;
    span.setAttribute("contenteditable", "false");
    span.addEventListener("dblclick", function() {
      span.setAttribute("contenteditable", "true"); span.focus();
    });
    span.addEventListener("blur", function() {
      var t = span.textContent.trim();
      if (t) { todo.text = t; } else { span.textContent = todo.text; }
      span.setAttribute("contenteditable", "false"); saveTodos();
    });
    span.addEventListener("keydown", function(e) {
      if (e.key === "Enter") { e.preventDefault(); span.blur(); }
    });
    var del = document.createElement("button");
    del.className = "todo-delete"; del.textContent = "×";
    del.setAttribute("aria-label", "Delete task");
    del.addEventListener("click", function() {
      state.todos = state.todos.filter(function(t){ return t.id !== todo.id; });
      saveTodos(); renderTodos();
    });
    li.appendChild(cb); li.appendChild(span); li.appendChild(del);
    list.appendChild(li);
  });
  updateTodoCount();
}

function addTodo(text) {
  if (!text) return;
  state.todos.push({ id: Date.now(), text: text, done: false });
  saveTodos(); renderTodos();
}

// ============================================================
//  LINKS
// ============================================================

function saveLinks() {
  localStorage.setItem("dashboard_links", JSON.stringify(state.links));
}

function renderLinks() {
  var grid = document.getElementById("links-grid");
  grid.innerHTML = "";
  state.links.forEach(function(link) {
    var card = document.createElement("div");
    card.className = "link-card";
    var a = document.createElement("a");
    a.href = link.url; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.setAttribute("aria-label", link.name);
    var iconEl = document.createElement("span");
    iconEl.className = "link-icon"; iconEl.textContent = link.icon || "🔗";
    var lbl = document.createElement("span");
    lbl.className = "link-label"; lbl.textContent = link.name;
    a.appendChild(iconEl); a.appendChild(lbl);
    var del = document.createElement("button");
    del.className = "link-delete"; del.textContent = "×";
    del.setAttribute("aria-label", "Delete link");
    del.addEventListener("click", function(e) {
      e.preventDefault();
      state.links = state.links.filter(function(l){ return l.id !== link.id; });
      saveLinks(); renderLinks();
    });
    card.appendChild(a); card.appendChild(del); grid.appendChild(card);
  });
}

function addLink(name, url, icon) {
  if (!name || !url) return;
  state.links.push({ id: Date.now(), name: name, url: url, icon: icon || "🔗" });
  saveLinks(); renderLinks();
}

// ============================================================
//  EVENT LISTENERS + BOOT
// ============================================================

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("timer-start").addEventListener("click", startTimer);
  document.getElementById("timer-pause").addEventListener("click", pauseTimer);
  document.getElementById("timer-reset").addEventListener("click", resetTimer);

  document.getElementById("todo-add").addEventListener("click", function() {
    var inp = document.getElementById("todo-input");
    var txt = inp.value.trim();
    if (txt) { addTodo(txt); inp.value = ""; }
  });
  document.getElementById("todo-input").addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      var txt = e.target.value.trim();
      if (txt) { addTodo(txt); e.target.value = ""; }
    }
  });

  document.getElementById("add-link-btn").addEventListener("click", function() {
    document.getElementById("add-link-form").classList.remove("hidden");
    document.getElementById("link-name-input").focus();
  });
  document.getElementById("link-cancel-btn").addEventListener("click", function() {
    document.getElementById("add-link-form").classList.add("hidden");
    document.getElementById("link-name-input").value = "";
    document.getElementById("link-url-input").value = "";
  });
  document.getElementById("link-save-btn").addEventListener("click", function() {
    var name = document.getElementById("link-name-input").value.trim();
    var url  = document.getElementById("link-url-input").value.trim();
    if (name && url) {
      addLink(name, url, "🔗");
      document.getElementById("add-link-form").classList.add("hidden");
      document.getElementById("link-name-input").value = "";
      document.getElementById("link-url-input").value = "";
    }
  });

  renderTimer();
  renderTodos();
  renderLinks();
});