const API = "/api";
let state = {
  experiments: [],
  descriptors: [],
  activeExperimentId: null,
  metrics: [],
  radarChart: null,
  barChart: null,
  uploadedOutput: null,
};

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  setupNav();
  setupUpload();
  setupDescriptors();
  setupModal();
  await Promise.all([loadExperiments(), loadDescriptors()]);
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function setupNav() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      document.getElementById(`view-${view}`).classList.add("active");
      if (view === "runs") loadAllRuns();
      if (view === "descriptors") renderDescriptors();
      if (view === "upload") refreshUploadSelects();
    });
  });
}

// ---------------------------------------------------------------------------
// Experiments
// ---------------------------------------------------------------------------

async function loadExperiments() {
  const res = await fetch(`${API}/experiments`);
  state.experiments = await res.json();
  renderExpList();
}

function renderExpList() {
  const list = document.getElementById("exp-list");
  list.innerHTML = state.experiments.map((e) => `
    <div class="exp-item ${e.id === state.activeExperimentId ? "active" : ""}" data-id="${e.id}">
      <span class="exp-name">${e.name}</span>
      <span class="exp-badge">${e.runCount}</span>
    </div>
  `).join("");
  list.querySelectorAll(".exp-item").forEach((el) => {
    el.addEventListener("click", () => selectExperiment(el.dataset.id));
  });

  document.getElementById("new-exp-btn").onclick = () => showNewExperimentModal();
}

async function selectExperiment(id) {
  state.activeExperimentId = id;
  renderExpList();
  switchView("dashboard");
  document.querySelector(".nav-btn[data-view=dashboard]").click();
  await loadDashboard(id);
}

async function loadDashboard(experimentId) {
  const exp = state.experiments.find((e) => e.id === experimentId);
  if (!exp) return;

  document.getElementById("dashboard-title").textContent = exp.name;
  document.getElementById("dashboard-actions").classList.remove("hidden");
  document.getElementById("delete-exp-btn").onclick = () => confirmDeleteExperiment(exp);

  const stats = state.experiments.find((e) => e.id === experimentId);
  renderStats(stats);

  const res = await fetch(`${API}/experiments/${experimentId}/metrics`);
  state.metrics = await res.json();

  if (state.metrics.length === 0) {
    document.getElementById("dashboard-empty").classList.remove("hidden");
    document.getElementById("dashboard-content").classList.add("hidden");
    return;
  }

  document.getElementById("dashboard-empty").classList.add("hidden");
  document.getElementById("dashboard-content").classList.remove("hidden");

  renderScoreCards(state.metrics);
  renderRadarChart(state.metrics);
  renderBarChart(state.metrics);
  renderMetricsTable(state.metrics);
}

function renderStats(stats) {
  const el = document.getElementById("exp-stats");
  el.classList.remove("hidden");
  el.innerHTML = [
    { label: "Versions", value: stats.descriptorCount ?? 0 },
    { label: "Cases", value: stats.caseCount ?? 0 },
    { label: "Total Runs", value: stats.runCount ?? 0 },
    { label: "Avg Score", value: stats.avgScore ? stats.avgScore.toFixed(1) + "/10" : "—" },
  ].map(({ label, value }) => `
    <div class="stat-card">
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  `).join("");
}

function scoreClass(s) {
  return s >= 7 ? "good" : s >= 5 ? "ok" : "bad";
}

function renderScoreCards(metrics) {
  document.getElementById("score-cards").innerHTML = metrics.map((m) => {
    const s = m.avgOverallScore ?? 0;
    const cls = scoreClass(s);
    return `
      <div class="score-card">
        <div class="sc-label" title="${m.label}">${m.label}</div>
        <div class="sc-value score-${cls}">${s.toFixed(1)}</div>
        <div class="sc-bar"><div class="sc-fill fill-${cls}" style="width:${s * 10}%"></div></div>
        <div style="font-size:0.7rem;color:var(--muted);margin-top:6px">${m.caseCount} cases · ${m.runCount} runs</div>
      </div>
    `;
  }).join("");
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

const CHART_COLORS = ["#38bdf8","#22c55e","#a78bfa","#fb923c","#f472b6","#34d399"];

const METRIC_GROUPS = {
  "Structure":    ["formatCompliance","wellFormedness","atomicity"],
  "AC Quality":   ["acMeasurability","gherkinCoverage","edgeCaseRatio","duplicateAc"],
  "Language":     ["vagueWordRatio","modalVerbStrength","passiveVoiceRatio","subordinateClauseDensity"],
  "Consistency":  ["storyIndependence","inputCoverage","terminologyConsistency","typeTokenRatio"],
  "Readability":  ["readability","gunningFog","smogIndex"],
  "Planning":     ["sizeDistribution","personaDiversity"],
};

const METRIC_LABELS = {
  formatCompliance:"Format Compliance",wellFormedness:"Well-Formedness",atomicity:"Atomicity",
  acMeasurability:"AC Measurability",gherkinCoverage:"Gherkin Coverage",edgeCaseRatio:"Edge Case Ratio",
  duplicateAc:"Duplicate AC",vagueWordRatio:"Vague Word Ratio",modalVerbStrength:"Modal Verb Strength",
  passiveVoiceRatio:"Passive Voice",subordinateClauseDensity:"Subord. Clauses",
  storyIndependence:"Story Independence",inputCoverage:"Input Coverage",
  terminologyConsistency:"Terminology",typeTokenRatio:"Type-Token Ratio",
  readability:"Readability (Flesch)",gunningFog:"Gunning Fog",smogIndex:"SMOG Index",
  sizeDistribution:"Size Distribution",personaDiversity:"Persona Diversity",
};

function renderRadarChart(metrics) {
  const allKeys = Object.values(METRIC_GROUPS).flat();
  const labels = allKeys.map((k) => METRIC_LABELS[k] ?? k);

  if (state.radarChart) state.radarChart.destroy();
  const ctx = document.getElementById("radar-chart").getContext("2d");
  state.radarChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels,
      datasets: metrics.map((m, i) => ({
        label: m.label,
        data: allKeys.map((k) => m.metrics[k] ?? 0),
        borderColor: CHART_COLORS[i % CHART_COLORS.length],
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + "22",
        borderWidth: 2,
        pointRadius: 2,
      })),
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#94a3b8", font: { size: 11 } } } },
      scales: { r: {
        min: 0, max: 10,
        ticks: { color: "#64748b", stepSize: 2, backdropColor: "transparent" },
        grid: { color: "#334155" },
        pointLabels: { color: "#94a3b8", font: { size: 9 } },
      }},
    },
  });
}

function renderBarChart(metrics) {
  const groupAverages = Object.entries(METRIC_GROUPS).map(([group, keys]) => ({
    group,
    averages: metrics.map((m) => {
      const scores = keys.map((k) => m.metrics[k] ?? 0);
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    }),
  }));

  if (state.barChart) state.barChart.destroy();
  const ctx = document.getElementById("bar-chart").getContext("2d");
  state.barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: groupAverages.map((g) => g.group),
      datasets: metrics.map((m, i) => ({
        label: m.label,
        data: groupAverages.map((g) => Math.round(g.averages[i] * 10) / 10),
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + "cc",
        borderRadius: 4,
      })),
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#94a3b8", font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: "#94a3b8" }, grid: { color: "#334155" } },
        y: { min: 0, max: 10, ticks: { color: "#64748b" }, grid: { color: "#334155" } },
      },
    },
  });
}

function renderMetricsTable(metrics) {
  const allKeys = Object.values(METRIC_GROUPS).flat();
  const maxPerKey = {};
  for (const key of allKeys) {
    maxPerKey[key] = Math.max(...metrics.map((m) => m.metrics[key] ?? 0));
  }
  const maxOverall = Math.max(...metrics.map((m) => m.avgOverallScore ?? 0));

  let html = `<table class="metrics-table"><thead><tr><th>Metric</th>${metrics.map((m) => `<th>${m.label}</th>`).join("")}</tr></thead><tbody>`;

  for (const [group, keys] of Object.entries(METRIC_GROUPS)) {
    html += `<tr class="group-row"><td colspan="${metrics.length + 1}">${group}</td></tr>`;
    for (const key of keys) {
      html += `<tr><td>${METRIC_LABELS[key] ?? key}</td>`;
      for (const m of metrics) {
        const s = m.metrics[key] ?? 0;
        const isMax = s === maxPerKey[key] && metrics.length > 1;
        const cls = scoreClass(s);
        html += `<td><span class="score-pill"><span class="score-dot" style="background:var(--${cls === "good" ? "green" : cls === "ok" ? "yellow" : "red"})"></span><span class="score-${cls}">${s.toFixed(1)}</span>${isMax ? '<span class="winner-marker">◀</span>' : ""}</span></td>`;
      }
      html += "</tr>";
    }
  }

  html += `<tr class="overall-row"><td>OVERALL</td>`;
  for (const m of metrics) {
    const s = m.avgOverallScore ?? 0;
    const isMax = s === maxOverall && metrics.length > 1;
    const cls = scoreClass(s);
    html += `<td><span class="score-pill"><span class="score-dot" style="background:var(--${cls === "good" ? "green" : cls === "ok" ? "yellow" : "red"})"></span><span class="score-${cls}">${s.toFixed(1)}</span>${isMax ? '<span class="winner-marker">◀</span>' : ""}</span></td>`;
  }
  html += `</tr></tbody></table>`;

  document.getElementById("metrics-table-wrap").innerHTML = html;
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

function setupUpload() {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");

  dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("dragover"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  });
  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => { if (fileInput.files[0]) readFile(fileInput.files[0]); });

  document.getElementById("upload-btn").addEventListener("click", doUpload);
}

function readFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      state.uploadedOutput = JSON.parse(e.target.result);
      document.getElementById("file-preview").textContent = `✓ ${file.name} loaded (${state.uploadedOutput.userStories?.length ?? 0} stories)`;
      document.getElementById("file-preview").classList.remove("hidden");
      document.getElementById("upload-output-json").value = "";
    } catch {
      setUploadStatus("Invalid JSON file", "error");
    }
  };
  reader.readAsText(file);
}

function refreshUploadSelects() {
  const expSel = document.getElementById("upload-exp-select");
  expSel.innerHTML = `<option value="">— select experiment —</option>` +
    state.experiments.map((e) => `<option value="${e.id}">${e.name}</option>`).join("");

  const descSel = document.getElementById("upload-desc-select");
  descSel.innerHTML = `<option value="">— none —</option>` +
    state.descriptors.map((d) => `<option value="${d.id}">${d.label ?? d.id}</option>`).join("");
}

async function doUpload() {
  const experimentId = document.getElementById("upload-exp-select").value;
  if (!experimentId) { setUploadStatus("Select an experiment first", "error"); return; }

  const caseId = document.getElementById("upload-case-id").value.trim();
  const caseName = document.getElementById("upload-case-name").value.trim();
  if (!caseId) { setUploadStatus("Case ID required", "error"); return; }

  let output = state.uploadedOutput;
  const rawJson = document.getElementById("upload-output-json").value.trim();
  if (!output && rawJson) {
    try { output = JSON.parse(rawJson); } catch { setUploadStatus("Invalid JSON", "error"); return; }
  }
  if (!output) { setUploadStatus("Provide BA output JSON", "error"); return; }

  // Ensure rawInput exists
  if (!output.rawInput) output.rawInput = { format: "free_text", content: "" };
  if (!output.generatedAt) output.generatedAt = new Date().toISOString();
  if (!output.modelUsed) output.modelUsed = "unknown";

  let descriptor = null;
  const descJson = document.getElementById("upload-desc-json").value.trim();
  const descId = document.getElementById("upload-desc-select").value;
  if (descJson) {
    try { descriptor = JSON.parse(descJson); } catch { setUploadStatus("Invalid descriptor JSON", "error"); return; }
  } else if (descId) {
    const found = state.descriptors.find((d) => d.id === descId);
    if (found) descriptor = found.descriptor;
  }

  const body = { output, caseId, caseName: caseName || caseId, descriptor };

  setUploadStatus("Uploading...", "");
  const res = await fetch(`${API}/experiments/${experimentId}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    const run = await res.json();
    setUploadStatus(`✓ Run added. Hard score: ${run.overall_score}/10`, "success");
    state.uploadedOutput = null;
    document.getElementById("file-preview").classList.add("hidden");
    await loadExperiments();
    if (state.activeExperimentId === experimentId) await loadDashboard(experimentId);
  } else {
    const err = await res.json();
    setUploadStatus(`Error: ${err.error}`, "error");
  }
}

function setUploadStatus(msg, type) {
  const el = document.getElementById("upload-status");
  el.textContent = msg;
  el.className = type;
}

// ---------------------------------------------------------------------------
// Descriptors
// ---------------------------------------------------------------------------

async function loadDescriptors() {
  const res = await fetch(`${API}/descriptors`);
  const rows = await res.json();
  state.descriptors = rows.map((r) => ({ id: r.id, label: r.label, descriptor: r.descriptor }));
}

function renderDescriptors() {
  const list = document.getElementById("desc-list");
  if (state.descriptors.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🤖</div><p>No descriptors yet. Add one below or upload with inline descriptor JSON.</p></div>`;
    return;
  }
  list.innerHTML = `<div class="desc-grid">${state.descriptors.map((d) => {
    const desc = d.descriptor ?? {};
    return `<div class="desc-card">
      <div class="dc-id">${d.id}</div>
      <div class="dc-label">${d.label ?? d.id}</div>
      <div class="dc-attr">Model: <span>${desc.model?.provider ?? ""}/${desc.model?.name ?? ""}</span></div>
      <div class="dc-attr">Prompt: <span>${desc.prompt?.version ?? ""}</span></div>
      <div class="dc-attr" style="margin-top:8px">
        ${(desc.prompt?.technique ?? []).map((t) => `<span class="tag">${t}</span>`).join("")}
        ${(desc.skills ?? []).map((s) => `<span class="tag skill">${s}</span>`).join("")}
        ${(desc.tools ?? []).map((t) => `<span class="tag tool">${t}</span>`).join("")}
      </div>
      ${desc.notes ? `<div class="dc-attr" style="margin-top:8px;font-style:italic">${desc.notes}</div>` : ""}
    </div>`;
  }).join("")}</div>`;

  document.getElementById("add-desc-btn").onclick = () => {
    document.getElementById("desc-form").classList.remove("hidden");
  };
}

function getChecked(containerId) {
  return [...document.querySelectorAll(`#${containerId} input[type=checkbox]:checked`)].map((el) => el.value);
}

function buildDescriptorFromForm() {
  const id = document.getElementById("df-id").value.trim();
  const label = document.getElementById("df-label").value.trim();
  const provider = document.getElementById("df-provider").value;
  const modelName = document.getElementById("df-model-name").value.trim();
  const tempRaw = document.getElementById("df-temperature").value.trim();
  const thinking = document.getElementById("df-thinking").checked;
  const isHumanVal = document.getElementById("df-is-human").value;
  const promptVersion = document.getElementById("df-prompt-version").value.trim();
  const language = document.getElementById("df-language").value;
  const techniques = getChecked("df-techniques");
  const fewShot = parseInt(document.getElementById("df-fewshot").value || "0");
  const refinements = parseInt(document.getElementById("df-refinements").value || "0");
  const skills = getChecked("df-skills");
  const tools = getChecked("df-tools");
  const notes = document.getElementById("df-notes").value.trim();

  const errors = [];
  if (!id) errors.push("ID is required");
  if (!modelName) errors.push("Model name is required");
  if (!promptVersion) errors.push("Prompt version is required");

  if (errors.length) return { errors };

  const descriptor = {
    id,
    ...(label && { label }),
    model: {
      provider,
      name: modelName,
      ...(tempRaw && { temperature: parseFloat(tempRaw) }),
      ...(thinking && { thinking: true }),
    },
    prompt: {
      version: promptVersion || "v1",
      technique: techniques.length ? techniques : ["zero-shot"],
      language,
      ...(fewShot > 0 && { fewShotCount: fewShot }),
      ...(refinements > 0 && { maxRefinementRounds: refinements }),
    },
    skills,
    tools,
    ...(isHumanVal && { isHuman: true, humanExperience: isHumanVal }),
    ...(notes && { notes }),
  };

  return { descriptor };
}

function resetDescriptorForm() {
  ["df-id","df-label","df-model-name","df-temperature","df-prompt-version","df-notes","df-fewshot","df-refinements"]
    .forEach((id) => { const el = document.getElementById(id); if (el) el.value = ""; });
  document.getElementById("df-thinking").checked = false;
  document.getElementById("df-provider").value = "anthropic";
  document.getElementById("df-language").value = "pl";
  document.getElementById("df-is-human").value = "";
  ["df-techniques","df-skills","df-tools"].forEach((id) => {
    document.querySelectorAll(`#${id} input[type=checkbox]`).forEach((el) => { el.checked = false; });
  });
  document.getElementById("desc-status").textContent = "";
}

async function saveDescriptor() {
  const { descriptor, errors } = buildDescriptorFromForm();
  if (errors) {
    document.getElementById("desc-status").innerHTML = `<span style="color:var(--red)">${errors.join("<br>")}</span>`;
    return;
  }

  const res = await fetch(`${API}/descriptors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(descriptor),
  });

  if (res.ok) {
    document.getElementById("desc-form").classList.add("hidden");
    resetDescriptorForm();
    await loadDescriptors();
    renderDescriptors();
  } else {
    const err = await res.json();
    const fieldErrors = err.fields ? `<br><small>${err.fields.join("<br>")}</small>` : "";
    document.getElementById("desc-status").innerHTML = `<span style="color:var(--red)">${err.error}${fieldErrors}</span>`;
  }
}

async function setupDescriptors() {
  document.getElementById("add-desc-btn").onclick = () => {
    document.getElementById("desc-form").classList.remove("hidden");
  };
  document.getElementById("save-desc-btn").onclick = saveDescriptor;
  document.getElementById("cancel-desc-btn").onclick = () => {
    document.getElementById("desc-form").classList.add("hidden");
    resetDescriptorForm();
  };
}

// ---------------------------------------------------------------------------
// All Runs
// ---------------------------------------------------------------------------

async function loadAllRuns() {
  const res = await fetch(`${API}/runs`);
  const runs = await res.json();
  const wrap = document.getElementById("runs-table-wrap");

  if (runs.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No runs yet.</p></div>`;
    return;
  }

  wrap.innerHTML = `<table class="runs-table">
    <thead><tr><th>Run At</th><th>Experiment</th><th>Case</th><th>Descriptor</th><th>Hard Score</th><th>Judge Score</th><th></th></tr></thead>
    <tbody>${runs.map((r) => `
      <tr>
        <td class="mono">${r.runAt.slice(0,19).replace("T"," ")}</td>
        <td>${r.experimentId ?? "—"}</td>
        <td>${r.caseName}</td>
        <td>${r.descriptor?.label ?? r.descriptorId ?? "—"}</td>
        <td><span class="score-${scoreClass(r.overall_score)}">${r.overall_score?.toFixed(1) ?? "—"}</span></td>
        <td>${r.judge_score ? r.judge_score.toFixed(1) : "—"}</td>
        <td><button class="btn-icon" title="Delete" data-id="${r.id}">🗑</button></td>
      </tr>
    `).join("")}</tbody>
  </table>`;

  wrap.querySelectorAll(".btn-icon").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await fetch(`${API}/runs/${btn.dataset.id}`, { method: "DELETE" });
      loadAllRuns();
    });
  });
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

function setupModal() {
  document.getElementById("modal-cancel").onclick = closeModal;
  document.getElementById("modal-overlay").onclick = (e) => { if (e.target === e.currentTarget) closeModal(); };
}

function showModal(title, body, onConfirm) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").textContent = body;
  document.getElementById("modal-confirm").onclick = () => { closeModal(); onConfirm(); };
  document.getElementById("modal-overlay").classList.remove("hidden");
}

function closeModal() { document.getElementById("modal-overlay").classList.add("hidden"); }

function showNewExperimentModal() {
  document.getElementById("modal-title").textContent = "New Experiment";
  document.getElementById("modal-body").innerHTML = `
    <input type="text" id="modal-exp-name" placeholder="Experiment name" style="margin-bottom:8px">
    <input type="text" id="modal-exp-desc" placeholder="Description (optional)">
  `;
  document.getElementById("modal-confirm").textContent = "Create";
  document.getElementById("modal-confirm").onclick = async () => {
    const name = document.getElementById("modal-exp-name").value.trim();
    if (!name) return;
    const res = await fetch(`${API}/experiments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: document.getElementById("modal-exp-desc").value }),
    });
    if (res.ok) {
      closeModal();
      await loadExperiments();
    }
  };
  document.getElementById("modal-cancel").textContent = "Cancel";
  document.getElementById("modal-overlay").classList.remove("hidden");
}

function confirmDeleteExperiment(exp) {
  showModal(
    "Delete experiment",
    `Delete "${exp.name}" and all its runs? This cannot be undone.`,
    async () => {
      await fetch(`${API}/experiments/${exp.id}`, { method: "DELETE" });
      state.activeExperimentId = null;
      document.getElementById("dashboard-title").textContent = "Select an experiment";
      document.getElementById("dashboard-actions").classList.add("hidden");
      document.getElementById("exp-stats").classList.add("hidden");
      document.getElementById("dashboard-empty").classList.remove("hidden");
      document.getElementById("dashboard-content").classList.add("hidden");
      await loadExperiments();
    }
  );
}

function switchView(view) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === view);
  });
}
