"use strict";

const STORAGE_KEY = "car-race-sim.history.v1";
const MAX_HISTORY = 20;
const MIN_PARTICIPANTS = 2;
const MAX_PARTICIPANTS = 8;
const SPEEDS = {
  slow: { delay: 180, pace: [0.011, 0.021], label: "sereno" },
  normal: { delay: 112, pace: [0.014, 0.027], label: "normal" },
  fast: { delay: 72, pace: [0.021, 0.037], label: "rápido" },
};
const PALETTE = [
  { value: "#e4252a", label: "Rojo" }, { value: "#2563eb", label: "Azul" },
  { value: "#159d65", label: "Verde" }, { value: "#e9a11d", label: "Ámbar" },
  { value: "#8b5cf6", label: "Violeta" }, { value: "#ec4899", label: "Rosa" },
  { value: "#0f9da8", label: "Turquesa" }, { value: "#f97316", label: "Naranja" },
];
const CAR_DESIGNS = [
  { value: "formula", label: "Fórmula" }, { value: "gt", label: "GT" },
  { value: "rally", label: "Rally" }, { value: "classic", label: "Clásico" },
  { value: "truck", label: "Camión" },
];
const INITIAL_PARTICIPANTS = [
  { name: "Fonda", design: "formula", color: "#e4252a" },
  { name: "Burger", design: "gt", color: "#2563eb" },
  { name: "Tacos", design: "rally", color: "#159d65" },
  { name: "Sushi", design: "classic", color: "#e9a11d" },
];

const elements = {
  form: document.querySelector("#race-form"), participantList: document.querySelector("#participant-list"), participantCount: document.querySelector("#participant-count"),
  addParticipant: document.querySelector("#add-participant"), trackDistance: document.querySelector("#track-distance"), distanceOutput: document.querySelector("#distance-output"),
  laps: document.querySelector("#lap-count"), lapsOutput: document.querySelector("#laps-output"),
  speed: document.querySelector("#race-speed"), failureRate: document.querySelector("#failure-rate"), failureOutput: document.querySelector("#failure-output"),
  incidentRate: document.querySelector("#incident-rate"), incidentOutput: document.querySelector("#incident-output"), formMessage: document.querySelector("#form-message"),
  startButton: document.querySelector("#start-button"), pauseButton: document.querySelector("#pause-button"), restartButton: document.querySelector("#restart-button"),
  statusDot: document.querySelector("#status-dot"), statusText: document.querySelector("#race-status-text"), raceMessage: document.querySelector("#race-message"),
  track: document.querySelector("#race-track"), standings: document.querySelector("#standings-body"), lapCounter: document.querySelector("#tick-counter"),
  distanceCounter: document.querySelector("#distance-counter"), elapsedTime: document.querySelector("#elapsed-time"), results: document.querySelector("#results-panel"),
  historyList: document.querySelector("#history-list"), historySummary: document.querySelector("#history-summary"), historyStatsList: document.querySelector("#history-stats-list"),
  historyRacesPanel: document.querySelector("#history-races-panel"), historyStatsPanel: document.querySelector("#history-stats-panel"), historyTabs: document.querySelectorAll("[data-history-tab]"), clearHistory: document.querySelector("#clear-history"),
};

let editorParticipants = INITIAL_PARTICIPANTS.map((participant, index) => ({ ...participant, id: `editor-${index + 1}` }));
let race = null;
let timerId = null;
let activeHistoryTab = "races";
const timeoutIds = new Set();

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function randomId() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function formatDuration(milliseconds) {
  const tenths = Math.floor(milliseconds / 100) % 10;
  const seconds = Math.floor(milliseconds / 1000) % 60;
  const minutes = Math.floor(milliseconds / 60000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}
function formatDistance(metres) {
  if (metres < 1000) return `${metres} M`;
  return `${(metres / 1000).toFixed(metres % 1000 ? 1 : 0)} KM`;
}
function schedule(callback, delay) {
  const id = window.setTimeout(() => { timeoutIds.delete(id); callback(); }, delay);
  timeoutIds.add(id);
  return id;
}
function clearTimers() {
  window.clearInterval(timerId);
  timerId = null;
  timeoutIds.forEach(id => window.clearTimeout(id));
  timeoutIds.clear();
}
function getDesign(design) { return CAR_DESIGNS.some(item => item.value === design) ? design : "gt"; }
function getStateLabel(racer) {
  if (racer.status === "active") return "EN PISTA";
  if (racer.status === "finished") return "FINALIZÓ";
  if (racer.incident === "collision") return "CHOQUE";
  if (racer.incident === "off-track") return "PISTA";
  return "AVERÍA";
}
function getStateClass(status) { return status === "active" ? "active" : status === "finished" ? "finished" : "retired"; }

function renderVehicle(racer, modifier = "") {
  const design = getDesign(racer.design);
  const incident = racer.incident || "";
  return `<span class="vehicle vehicle--${design} ${modifier} ${incident}" style="--car-color:${racer.color}" aria-hidden="true">
    <i class="vehicle-body"></i><i class="vehicle-cabin"></i><i class="vehicle-wheel wheel-front"></i><i class="vehicle-wheel wheel-back"></i>
  </span>`;
}

function renderParticipantEditor() {
  elements.participantList.innerHTML = editorParticipants.map((participant, index) => {
    const colors = PALETTE.map(color => `<option value="${color.value}"${color.value === participant.color ? " selected" : ""}>${color.label}</option>`).join("");
    const designs = CAR_DESIGNS.map(design => `<option value="${design.value}"${design.value === getDesign(participant.design) ? " selected" : ""}>${design.label}</option>`).join("");
    return `<div class="participant-editor" data-id="${participant.id}">
      <span class="car-swatch" style="--car-color:${participant.color}" aria-hidden="true">${renderVehicle(participant, "vehicle--garage")}</span>
      <input class="participant-name" type="text" maxlength="20" value="${escapeHtml(participant.name)}" aria-label="Nombre del participante ${index + 1}" placeholder="Corredor ${index + 1}" />
      <select class="participant-design" aria-label="Diseño de auto para ${escapeHtml(participant.name || `corredor ${index + 1}`)}">${designs}</select>
      <select class="participant-color" aria-label="Color de ${escapeHtml(participant.name || `corredor ${index + 1}`)}">${colors}</select>
      <button class="remove-participant" type="button" aria-label="Eliminar ${escapeHtml(participant.name || `corredor ${index + 1}`)}">×</button>
    </div>`;
  }).join("");
  elements.participantCount.textContent = `${editorParticipants.length} / ${MAX_PARTICIPANTS}`;
  syncControlState();
}

function syncEditorParticipant(target) {
  const row = target.closest(".participant-editor");
  if (!row) return;
  const participant = editorParticipants.find(item => item.id === row.dataset.id);
  if (!participant) return;
  participant.name = row.querySelector(".participant-name").value;
  participant.design = row.querySelector(".participant-design").value;
  participant.color = row.querySelector(".participant-color").value;
  const swatch = row.querySelector(".car-swatch");
  swatch.style.setProperty("--car-color", participant.color);
  swatch.innerHTML = renderVehicle(participant, "vehicle--garage");
}

function setMessage(message = "") { elements.formMessage.textContent = message; }
function updateSettingOutputs() {
  elements.distanceOutput.textContent = `${elements.trackDistance.value} m`;
  elements.lapsOutput.textContent = elements.laps.value;
  elements.failureOutput.textContent = `${Number(elements.failureRate.value).toFixed(1)}%`;
  elements.incidentOutput.textContent = `${Number(elements.incidentRate.value).toFixed(1)}%`;
}

function getConfiguration() {
  const participants = editorParticipants.map(participant => ({ ...participant, name: participant.name.trim(), design: getDesign(participant.design) }));
  const names = participants.map(item => item.name.toLocaleLowerCase());
  if (participants.length < MIN_PARTICIPANTS || participants.length > MAX_PARTICIPANTS) throw new Error(`La parrilla debe tener entre ${MIN_PARTICIPANTS} y ${MAX_PARTICIPANTS} participantes.`);
  if (participants.some(item => !item.name)) throw new Error("Cada participante necesita un nombre.");
  if (new Set(names).size !== names.length) throw new Error("Los nombres de participantes deben ser distintos.");
  const distance = Number(elements.trackDistance.value);
  const laps = Number(elements.laps.value);
  return {
    participants, distance, laps, totalDistance: distance * laps, speed: elements.speed.value,
    failureRate: Number(elements.failureRate.value) / 100, incidentRate: Number(elements.incidentRate.value) / 100,
  };
}

function perTickRisk(raceRisk, expectedTicks = 56) {
  return 1 - Math.pow(1 - raceRisk, 1 / expectedTicks);
}

function createRace(config) {
  return {
    id: randomId(), phase: "countdown", countdown: 3, settings: config, tick: 0, elapsedMs: 0, finishCount: 0, winnerId: null, incidents: 0,
    failureTickRisk: perTickRisk(config.failureRate), incidentTickRisk: perTickRisk(config.incidentRate),
    latestEvent: { type: "launch", message: "Los autos toman sus posiciones en la parrilla." },
    racers: config.participants.map((participant, index) => ({
      ...participant, number: index + 1, position: 0, status: "active", finishOrder: null, finishedAt: null, incident: null, justCrashed: false,
      paceFactor: 0.84 + Math.random() * 0.32,
    })),
  };
}

function getRaceOrder(racers = race?.racers || []) {
  return [...racers].sort((a, b) => {
    const statusScore = { finished: 3, active: 2, retired: 1 };
    if (a.status !== b.status) return statusScore[b.status] - statusScore[a.status];
    if (a.status === "finished" && a.finishOrder !== b.finishOrder) return a.finishOrder - b.finishOrder;
    return b.position - a.position;
  });
}

function getLapFor(racer, settings) {
  if (racer.status === "finished") return settings.laps;
  return Math.min(settings.laps, Math.floor(racer.position / settings.distance) + 1);
}

function renderStraightCar(racer) {
  const crashed = racer.justCrashed ? "crashed" : "";
  const winner = race.winnerId === racer.id ? "winner" : "";
  const incidentEffect = racer.justCrashed ? `<i class="impact impact--${racer.incident}"></i>` : "";
  return `<span class="straight-car ${racer.status} ${crashed} ${winner}" data-racer-id="${racer.id}" title="${escapeHtml(racer.name)} · ${getStateLabel(racer)}">
    ${renderVehicle(racer, "vehicle--map")}${incidentEffect}<b>${String(racer.number).padStart(2, "0")}</b>
  </span>`;
}

function updateStraightTrack(track) {
  if (!race) {
    track.querySelector(".straight-intro")?.removeAttribute("hidden");
    track.querySelector(".track-event")?.remove();
    track.querySelector(".start-sequence")?.remove();
    return;
  }

  track.querySelector(".straight-intro")?.setAttribute("hidden", "");
  race.racers.forEach(racer => {
    const car = track.querySelector(`[data-racer-id="${racer.id}"]`);
    if (!car) return;
    const progress = 2 + Math.min(1, racer.position / race.settings.totalDistance) * 90;
    car.className = `straight-car ${racer.status} ${racer.justCrashed ? "crashed" : ""} ${race.winnerId === racer.id ? "winner" : ""}`;
    car.title = `${racer.name} · ${getStateLabel(racer)}`;
    car.style.setProperty("--progress", `${progress}%`);
    car.style.setProperty("--move-duration", `${Math.max(110, SPEEDS[race.settings.speed].delay)}ms`);
    const impact = car.querySelector(".impact");
    if (racer.justCrashed && !impact) car.insertAdjacentHTML("beforeend", `<i class="impact impact--${racer.incident}"></i>`);
    if (!racer.justCrashed) impact?.remove();
  });

  let event = track.querySelector(".track-event");
  if (!event) {
    event = document.createElement("div");
    track.append(event);
  }
  event.className = `track-event ${race.latestEvent.type}`;
  event.innerHTML = `<i></i><span>${escapeHtml(race.latestEvent.message)}</span>`;

  let sequence = track.querySelector(".start-sequence");
  if (race.phase === "countdown") {
    if (!sequence) {
      sequence = document.createElement("div");
      sequence.setAttribute("aria-live", "assertive");
      track.append(sequence);
    }
    sequence.className = `start-sequence ${race.countdown === "GO" ? "go" : ""}`;
    sequence.innerHTML = `<span>${race.countdown}</span><small>${race.countdown === "GO" ? "SALIDA" : "PREPARADOS"}</small>`;
  } else {
    sequence?.remove();
  }
}

function renderTrack() {
  if (race?.phase === "finished") {
    elements.track.innerHTML = renderVictoryStage(race);
    return;
  }
  const mode = race ? "race" : "preview";
  let track = elements.track.querySelector(".straight-track");
  const shouldBuild = !track || track.dataset.mode !== mode || (race && (track.dataset.raceId !== race.id || track.querySelectorAll(".straight-car").length !== race.racers.length));
  if (shouldBuild) {
    const lanes = race ? race.racers.map(racer => `<div class="straight-lane">
      <span class="lane-label">${String(racer.number).padStart(2, "0")}</span>
      <div class="lane-road">${renderStraightCar(racer)}</div>
    </div>`).join("") : "";
    elements.track.innerHTML = `<div class="straight-track" data-mode="${mode}" data-race-id="${race?.id || ""}">
      <div class="straight-header"><span>SALIDA</span><strong>RECTA ARRANKONES</strong><span>META</span></div>
      <div class="straight-lanes">${lanes}</div>
      <div class="straight-intro"><span>UNA PISTA · UN GANADOR</span><strong>RECTA ARRANKONES</strong><small>Selecciona la parrilla y enciende el semáforo.</small></div>
    </div>`;
    track = elements.track.querySelector(".straight-track");
  }
  updateStraightTrack(track);
}

function renderStandings() {
  if (!race) {
    elements.standings.innerHTML = '<div class="standing-row"><span class="standing-position">—</span><span class="standing-name">Parrilla pendiente</span><span></span><span></span></div>';
    return;
  }
  const ordered = getRaceOrder();
  elements.standings.innerHTML = ordered.map((racer, index) => {
    const position = racer.status === "finished" ? racer.finishOrder : index + 1;
    const progress = Math.min(Math.round(racer.position), race.settings.totalDistance);
    return `<div class="standing-row" role="row">
      <span class="standing-position">${String(position).padStart(2, "0")}</span>
      <span class="standing-name">${renderVehicle(racer, "vehicle--tiny")}<span>${escapeHtml(racer.name)}</span></span>
      <span class="standing-state ${getStateClass(racer.status)}">${getStateLabel(racer)}</span>
      <span class="standing-distance">V${getLapFor(racer, race.settings)} · ${Math.round(progress / race.settings.totalDistance * 100)}%</span>
    </div>`;
  }).join("");
}

function renderRace() {
  const selectedSettings = race?.settings || { distance: Number(elements.trackDistance.value), laps: Number(elements.laps.value) };
  const leader = race ? getRaceOrder()[0] : null;
  elements.lapCounter.textContent = `${leader ? getLapFor(leader, selectedSettings) : 1} / ${selectedSettings.laps}`;
  elements.distanceCounter.textContent = formatDistance(selectedSettings.totalDistance || selectedSettings.distance * selectedSettings.laps);
  elements.elapsedTime.textContent = formatDuration(race?.elapsedMs || 0);
  elements.track.closest(".race-card").querySelector("#race-title").textContent = "Recta Arrankones";
  renderTrack();
  renderStandings();
}

function setRaceStatus(phase) {
  elements.statusDot.className = `status-dot${phase ? ` ${phase}` : ""}`;
  const labels = { countdown: "SEMÁFORO EN CURSO", running: "CARRERA EN CURSO", paused: "CARRERA PAUSADA", finished: "BANDERA A CUADROS" };
  elements.statusText.textContent = labels[phase] || "LISTO PARA COMPETIR";
}

function syncControlState() {
  const active = race && ["countdown", "running", "paused"].includes(race.phase);
  const lockedInputs = elements.form.querySelectorAll("input, select, #add-participant, .remove-participant");
  lockedInputs.forEach(control => { control.disabled = Boolean(active); });
  elements.startButton.disabled = Boolean(active);
  elements.pauseButton.disabled = !race || !["running", "paused"].includes(race.phase);
  elements.pauseButton.textContent = race?.phase === "paused" ? "Reanudar" : "Pausar";
  elements.restartButton.disabled = !race;
  setRaceStatus(race?.phase);
}

function retireRacer(racer, incident, message) {
  racer.status = "retired";
  racer.incident = incident;
  racer.justCrashed = true;
  race.latestEvent = { type: incident, message };
  schedule(() => {
    if (!race || racer.status !== "retired") return;
    racer.justCrashed = false;
    renderTrack();
  }, 620);
}

function resolveTrackIncident() {
  const active = race.racers.filter(racer => racer.status === "active");
  if (race.tick < 8 || race.incidents > 0 || active.length === 0 || Math.random() >= race.incidentTickRisk) return;
  const threshold = race.settings.totalDistance * 0.012;
  const pairs = [];
  for (let first = 0; first < active.length; first += 1) {
    for (let second = first + 1; second < active.length; second += 1) {
      if (Math.abs(active[first].position - active[second].position) < threshold) pairs.push([active[first], active[second]]);
    }
  }
  if (pairs.length && Math.random() < 0.62) {
    const [first, second] = pairs[Math.floor(Math.random() * pairs.length)];
    race.incidents += 1;
    retireRacer(first, "collision", `¡Choque! ${first.name} y ${second.name} quedan fuera.`);
    second.status = "retired";
    second.incident = "collision";
    second.justCrashed = true;
    schedule(() => {
      if (!race || second.status !== "retired") return;
      second.justCrashed = false;
      renderTrack();
    }, 620);
    return;
  }
  const racer = active[Math.floor(Math.random() * active.length)];
  race.incidents += 1;
  retireRacer(racer, "off-track", `Salida de pista: ${racer.name} abandona la carrera.`);
}

function advanceRace() {
  if (!race || race.phase !== "running") return;
  race.tick += 1;
  race.elapsedMs += SPEEDS[race.settings.speed].delay;
  const pace = SPEEDS[race.settings.speed];
  const finishers = [];
  race.racers.forEach(racer => {
    if (racer.status !== "active") return;
    if (Math.random() < race.failureTickRisk) {
      retireRacer(racer, "mechanical", `Avería mecánica: ${racer.name} se detiene.`);
      return;
    }
    const randomPace = pace.pace[0] + Math.random() * (pace.pace[1] - pace.pace[0]);
    const shortTermVariation = 0.92 + Math.random() * 0.16;
    racer.position += race.settings.totalDistance * randomPace * racer.paceFactor * shortTermVariation;
    if (racer.position >= race.settings.totalDistance) finishers.push(racer);
  });
  resolveTrackIncident();
  finishers.filter(racer => racer.status === "active").sort((a, b) => b.position - a.position).forEach(racer => {
    racer.position = race.settings.totalDistance;
    racer.status = "finished";
    racer.finishOrder = ++race.finishCount;
    racer.finishedAt = race.elapsedMs;
    if (racer.finishOrder === 1) {
      race.winnerId = racer.id;
      race.latestEvent = { type: "winner", message: `¡${racer.name} toma la bandera a cuadros!` };
    }
  });
  renderRace();
  if (!race.racers.some(racer => racer.status === "active")) finishRace();
}

function startTimer() {
  window.clearInterval(timerId);
  timerId = window.setInterval(advanceRace, SPEEDS[race.settings.speed].delay);
}

function runStartSequence(step) {
  if (!race || race.phase !== "countdown") return;
  race.countdown = step;
  renderRace();
  if (step > 1) {
    schedule(() => runStartSequence(step - 1), 650);
    return;
  }
  schedule(() => {
    if (!race || race.phase !== "countdown") return;
    race.countdown = "GO";
    race.latestEvent = { type: "launch", message: "¡Salida limpia! La carrera está en marcha." };
    renderRace();
    schedule(() => {
      if (!race || race.phase !== "countdown") return;
      race.phase = "running";
      renderRace();
      syncControlState();
      startTimer();
    }, 440);
  }, 650);
}

function beginRace() {
  let config;
  try { config = getConfiguration(); } catch (error) { setMessage(error.message); return; }
  clearTimers();
  race = createRace(config);
  elements.results.hidden = true;
  elements.raceMessage.textContent = "Luces rojas: la salida comienza en tres segundos.";
  setMessage("");
  renderRace();
  syncControlState();
  runStartSequence(3);
}

function pauseOrResumeRace() {
  if (!race || !["running", "paused"].includes(race.phase)) return;
  if (race.phase === "running") {
    race.phase = "paused";
    window.clearInterval(timerId);
    elements.raceMessage.textContent = "Carrera pausada. La posición se conserva.";
  } else {
    race.phase = "running";
    elements.raceMessage.textContent = "Carrera reanudada.";
    startTimer();
  }
  syncControlState();
}

function renderVictoryStage(raceResult) {
  const finishers = getRaceOrder(raceResult.racers).filter(racer => racer.status === "finished").slice(0, 3);
  const podiumOrder = [
    { racer: finishers[2], position: 3, label: "TERCERO" },
    { racer: finishers[0], position: 1, label: "GANADOR" },
    { racer: finishers[1], position: 2, label: "SEGUNDO" },
  ];
  const slots = podiumOrder.map(({ racer, position, label }) => {
    if (!racer) return `<div class="victory-place victory-place--${position} is-empty"><span>${position}.º</span></div>`;
    return `<div class="victory-place victory-place--${position}">
      <span>${label}</span>${renderVehicle(racer, "vehicle--victory")}<strong>${escapeHtml(racer.name)}</strong><small>${position}.º LUGAR · ${formatDuration(racer.finishedAt || raceResult.elapsedMs)}</small>
    </div>`;
  }).join("");
  const winner = finishers[0];
  return `<section class="victory-stage" aria-live="polite">
    <div class="victory-heading"><p>RESULTADO OFICIAL</p><h3>${winner ? `${escapeHtml(winner.name)} GANA` : "SIN FINALISTAS"}</h3><span>BANDERA A CUADROS</span></div>
    <div class="victory-podium" aria-label="Podio: tercero, primero y segundo">${slots}</div>
  </section>`;
}

function serialiseRace(raceResult) {
  return {
    id: raceResult.id, date: new Date().toISOString(), duration: raceResult.elapsedMs, distance: raceResult.settings.distance,
    laps: raceResult.settings.laps, totalDistance: raceResult.settings.totalDistance,
    racers: getRaceOrder(raceResult.racers).map(racer => ({ name: racer.name, design: racer.design, color: racer.color, position: Math.round(racer.position), status: racer.status, incident: racer.incident, finishOrder: racer.finishOrder })),
  };
}

function readHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(history) ? history : [];
  } catch { return []; }
}
function saveHistory(result) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([result, ...readHistory()].slice(0, MAX_HISTORY)));
}

function finishRace() {
  if (!race || race.phase === "finished") return;
  window.clearInterval(timerId);
  timerId = null;
  race.phase = "finished";
  const result = serialiseRace(race);
  saveHistory(result);
  elements.results.hidden = true;
  elements.results.innerHTML = "";
  elements.raceMessage.textContent = "Resultado oficial registrado en el historial local.";
  renderRace();
  syncControlState();
  renderHistory();
}

function resetRace() {
  clearTimers();
  race = null;
  elements.results.hidden = true;
  elements.raceMessage.textContent = "Pista reiniciada. Puedes modificar la parrilla y los reglajes.";
  renderRace();
  syncControlState();
}

function renderHistory() {
  const history = readHistory();
  const stats = new Map();
  history.forEach(result => result.racers.forEach(racer => {
    const statistic = stats.get(racer.name) || { races: 0, wins: 0, retirements: 0 };
    statistic.races += 1;
    if (racer.finishOrder === 1) statistic.wins += 1;
    if (racer.status === "retired") statistic.retirements += 1;
    stats.set(racer.name, statistic);
  }));
  const totalRetirements = [...stats.values()].reduce((total, statistic) => total + statistic.retirements, 0);
  elements.historySummary.innerHTML = `<span class="stat-chip"><strong>${history.length}</strong> carreras</span><span class="stat-chip"><strong>${stats.size}</strong> corredores</span><span class="stat-chip"><strong>${totalRetirements}</strong> abandonos</span>`;
  const orderedStats = [...stats.entries()].sort(([, first], [, second]) => second.wins - first.wins || second.races - first.races);
  elements.historyStatsList.innerHTML = orderedStats.length ? orderedStats.map(([name, statistic], index) => `<div class="history-stat-row"><strong>${String(index + 1).padStart(2, "0")}</strong><span>${escapeHtml(name)}</span><span>${statistic.wins} vict. · ${statistic.races} carreras · ${statistic.retirements} ab.</span></div>`).join("") : '<p class="history-empty">Las estadísticas aparecerán después de la primera carrera.</p>';
  if (!history.length) {
    elements.historyList.innerHTML = '<p class="history-empty">Aún no hay resultados. La primera carrera aparecerá aquí al finalizar.</p>';
    elements.clearHistory.disabled = true;
    renderHistoryTabs();
    return;
  }
  elements.clearHistory.disabled = false;
  elements.historyList.innerHTML = history.map((result, index) => {
    const winner = result.racers.find(racer => racer.finishOrder === 1);
    const date = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.date));
    const distance = result.totalDistance || result.distance;
    const rows = result.racers.map((racer, position) => `<div class="history-result"><span>${position + 1}. ${renderVehicle(racer, "vehicle--history")} ${escapeHtml(racer.name)}</span><span>${getStateLabel(racer)} · ${racer.position} m</span></div>`).join("");
    return `<details class="history-item"${index === 0 ? " open" : ""}><summary><span class="history-date">${date}</span><span class="history-winner">${winner ? `${renderVehicle(winner, "vehicle--history")} ${escapeHtml(winner.name)}` : "Sin finalista"}</span><span class="history-meta">${formatDistance(distance)} · ${formatDuration(result.duration)}</span></summary><div class="history-results">${rows}</div></details>`;
  }).join("");
  renderHistoryTabs();
}

function renderHistoryTabs() {
  const isStats = activeHistoryTab === "stats";
  elements.historyRacesPanel.hidden = isStats;
  elements.historyStatsPanel.hidden = !isStats;
  elements.historyTabs.forEach(tab => {
    const active = tab.dataset.historyTab === activeHistoryTab;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
}

function setHistoryTab(tab) {
  activeHistoryTab = tab === "stats" ? "stats" : "races";
  renderHistoryTabs();
}

function bindEvents() {
  elements.addParticipant.addEventListener("click", () => {
    if (editorParticipants.length >= MAX_PARTICIPANTS) { setMessage(`El máximo es de ${MAX_PARTICIPANTS} participantes.`); return; }
    const index = editorParticipants.length;
    editorParticipants.push({ id: `editor-${randomId()}`, name: `Corredor ${index + 1}`, design: CAR_DESIGNS[index % CAR_DESIGNS.length].value, color: PALETTE[index % PALETTE.length].value });
    setMessage("");
    renderParticipantEditor();
  });
  elements.participantList.addEventListener("input", event => syncEditorParticipant(event.target));
  elements.participantList.addEventListener("change", event => syncEditorParticipant(event.target));
  elements.participantList.addEventListener("click", event => {
    const button = event.target.closest(".remove-participant");
    if (!button) return;
    const row = button.closest(".participant-editor");
    if (editorParticipants.length <= MIN_PARTICIPANTS) { setMessage(`Se requieren al menos ${MIN_PARTICIPANTS} participantes.`); return; }
    editorParticipants = editorParticipants.filter(participant => participant.id !== row.dataset.id);
    setMessage("");
    renderParticipantEditor();
  });
  [elements.trackDistance, elements.laps, elements.failureRate, elements.incidentRate].forEach(control => control.addEventListener("input", () => { updateSettingOutputs(); if (!race) renderRace(); }));
  elements.form.addEventListener("submit", event => { event.preventDefault(); beginRace(); });
  elements.pauseButton.addEventListener("click", pauseOrResumeRace);
  elements.restartButton.addEventListener("click", resetRace);
  elements.clearHistory.addEventListener("click", () => {
    if (!window.confirm("¿Borrar todas las carreras y estadísticas guardadas en este navegador?")) return;
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
  });
  elements.historyTabs.forEach(tab => tab.addEventListener("click", () => setHistoryTab(tab.dataset.historyTab)));
}

function initialise() {
  renderParticipantEditor();
  updateSettingOutputs();
  renderRace();
  renderHistory();
  syncControlState();
  bindEvents();
}

initialise();
