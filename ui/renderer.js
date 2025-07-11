// renderer.js

// -------------- Elementos del DOM --------------
const scanBtn = document.getElementById("scanBtn");
const killBtn = document.getElementById("killBtn");
const logsBtn = document.getElementById("logsBtn");
const loader = document.getElementById("loader");
const msgDiv = document.getElementById("messages");
const tbody = document.querySelector("#candidatesTable tbody");
const modal = document.getElementById("logsModal");
const closeX = document.getElementById("closeLogs");
const logsPre = document.getElementById("logsContent");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const profileSelect = document.getElementById("profiles-select");
const applyProfileBtn = document.getElementById("applyProfileBtn");
const saveBtn = document.getElementById("saveProfileBtn");
const nameInput = document.getElementById("profileNameInput");
const statusBtn = document.getElementById("statusAnalysisBtn");
const reportBtn = document.getElementById("getReportBtn");
const compareBtn = document.getElementById("compareBtn");
const resetBtn = document.getElementById("resetAnalysisBtn");
const firstBtn = document.getElementById("firstAnalysisBtn");
const secondBtn = document.getElementById("secondAnalysisBtn");

// -------------- Estado global --------------
let currentSort = { key: null, asc: true };
let lastData = [];
let reportBefore = null;
let reportAfter = null;

// -------------- Bind de botones --------------
scanBtn.onclick = doScan;
logsBtn.onclick = doLogs;
closeX.onclick = () => modal.classList.add("hidden");

// -------------- Funciones auxiliares UI --------------
function showLoader() {
  loader.classList.remove("hidden");
}
function hideLoader() {
  loader.classList.add("hidden");
}
function showProgressBar() {
  progressContainer.classList.remove("hidden");
}
function hideProgressBar() {
  progressContainer.classList.add("hidden");
}
function showSuccess(msg) {
  msgDiv.className = "success";
  msgDiv.textContent = msg;
}
function showError(msg) {
  msgDiv.className = "error";
  msgDiv.textContent = msg;
}
function clearMsg() {
  msgDiv.className = "";
  msgDiv.textContent = "";
}

function showReportChart(report) {
  const ctx = document.getElementById("reportChart").getContext("2d");
  const summary = report.summary;
  const labels = [];
  const values = [];

  for (const key of Object.keys(summary)) {
    const avg = summary[key].avg;
    if (avg === "N/A") continue;
    labels.push(key.toUpperCase());
    values.push(avg);
  }

  // Elimina gráfico anterior si existe
  if (window.reportChartInstance) {
    window.reportChartInstance.destroy();
  }

  // Genera nuevo gráfico
  window.reportChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Promedio",
          data: values,
          backgroundColor: "#00b7ff",
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Rendimiento promedio",
        },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

// -------------- Escaneo de procesos --------------
async function doScan() {
  console.log("→ doScan() iniciado");
  showLoader();
  clearMsg();
  showProgressBar();

  const duration = parseFloat(document.getElementById("durationInput").value);
  const interval = parseFloat(document.getElementById("intervalInput").value);
  const steps = Math.max(1, Math.floor(duration / interval));
  let current = 0;

  progressBar.value = 0;
  progressBar.max = 100;

  const timer = setInterval(() => {
    current++;
    progressBar.value = Math.min((current / steps) * 100, 100);
  }, interval * 1000);

  const url = new URL("http://127.0.0.1:5000/scan");
  url.searchParams.set("duration", duration);
  url.searchParams.set("interval", interval);

  try {
    const resp = await fetch(url.href);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    lastData = data;
    sortAndRender();
    showSuccess(`Escaneo finalizado: ${data.length} procesos agrupados.`);
  } catch (e) {
    console.error("→ Error en scan:", e);
    showError(`Error al escanear: ${e.message}`);
  } finally {
    clearInterval(timer);
    hideLoader();
    hideProgressBar();
  }
}
resetBtn.onclick = async () => {
  if (!confirm("¿Seguro que querés reiniciar?")) return;
  await fetch("http://127.0.0.1:5000/analysis/reset", { method: "POST" });

  // Limpia variables y botones
  reportBefore = null;
  reportAfter = null;
  firstBtn.disabled = false;
  secondBtn.disabled = true;
  reportBtn.disabled = true;
  compareBtn.disabled = true;
  statusBtn.disabled = true;
  statusBtn.textContent = "⏳ 0%";

  // Destruye y limpia gráficos
  if (window.reportChartInstance) window.reportChartInstance.destroy();
  if (window.compareChartInstance) window.compareChartInstance.destroy();
  document
    .getElementById("reportChart")
    .getContext("2d")
    .clearRect(0, 0, 600, 400);
  document
    .getElementById("compareChart")
    .getContext("2d")
    .clearRect(0, 0, 600, 400);

  showSuccess("Estado reiniciado, listo para primer análisis.");
};

// -------------- Ver logs --------------
async function doLogs() {
  console.log("→ doLogs() iniciado");
  showLoader();
  clearMsg();
  try {
    const resp = await fetch("http://127.0.0.1:5000/logs");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    logsPre.textContent = text;
    modal.classList.remove("hidden");
  } catch (e) {
    console.error("Error cargando logs:", e);
    showError(`Error cargando logs: ${e.message}`);
  } finally {
    hideLoader();
  }
}

// -------------- Sorting & render --------------
function sortAndRender() {
  const sorted = [...lastData].sort((a, b) => {
    const valA = a[currentSort.key],
      valB = b[currentSort.key];
    if (typeof valA === "number") {
      return currentSort.asc ? valA - valB : valB - valA;
    }
    return currentSort.asc
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });
  renderTable(sorted);
}

function renderTable(data) {
  tbody.innerHTML = "";
  data.forEach((proc) => {
    const pidsArr = Array.isArray(proc.pids) ? proc.pids : [proc.pids];
    const fmtNum = (v) => (v == null ? "N/A" : v.toFixed(1));

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <input
          type="checkbox"
          class="select-proc"
          data-pids="${pidsArr.join(",")}"
          data-name="${proc.name}"
        />
      </td>
      <td>${proc.name}</td>
      <td>${pidsArr.join(", ")}</td>
      <td>${proc.max_cpu.toFixed(1)} %</td>
      <td>${proc.avg_cpu.toFixed(1)} %</td>
      <td>${proc.max_mem.toFixed(0)} MB</td>
      <td>${proc.avg_mem.toFixed(0)} MB</td>
    `;
    tbody.appendChild(tr);
  });

  // Toggle kill-btn
  document.querySelectorAll(".select-proc").forEach((cb) => {
    cb.addEventListener("change", () => {
      const anyChecked = [...document.querySelectorAll(".select-proc")].some(
        (c) => c.checked
      );
      killBtn.classList.toggle("hidden", !anyChecked);
    });
  });
}

// Mostrar reporte individual (antes o después)
reportBtn.onclick = () => {
  if (reportAfter) {
    console.table(reportAfter.summary);
    showReportChart(reportAfter);
  } else if (reportBefore) {
    console.table(reportBefore.summary);
    showReportChart(reportBefore);
  } else {
    showError("Primero ejecutá un análisis para ver su reporte.");
  }
};

// Comparar reportes
compareBtn.onclick = async () => {
  if (!reportBefore || !reportAfter) {
    return showError("Faltan uno o ambos reportes. Ejecutá ambos análisis.");
  }

  const res = await fetch("http://127.0.0.1:5000/analysis/compare");
  const data = await res.json();
  if (data.error) {
    return showError(data.error);
  }

  console.table(data.diff);
  showCompareChart(reportBefore, reportAfter);
};

firstBtn.onclick = async () => {
  firstBtn.disabled = true;
  statusBtn.disabled = false;
  statusBtn.textContent = "⏳ 0%";

  // Inicia análisis “Antes”
  await fetch("http://127.0.0.1:5000/analysis/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ duration: parseInt(durationInput.value) }),
  });

  // Monitorea progreso
  let running = true;
  while (running) {
    await new Promise((r) => setTimeout(r, 500));
    const stat = await (
      await fetch("http://127.0.0.1:5000/analysis/status")
    ).json();
    running = stat.running;
    statusBtn.textContent = `⏳ ${stat.progress || 0}%`;
  }

  // Al terminar
  statusBtn.textContent = "✅ Completado";
  reportBtn.disabled = false;
  secondBtn.disabled = false;
  showSuccess("Primer reporte (Antes) generado.");

  // Guarda y muestra
  const report = await (
    await fetch("http://127.0.0.1:5000/analysis/report")
  ).json();
  reportBefore = report;
  showReportChart(report);
};

secondBtn.onclick = async () => {
  secondBtn.disabled = true;
  statusBtn.disabled = false;
  statusBtn.textContent = "⏳ 0%";

  // Inicia análisis “Después”
  await fetch("http://127.0.0.1:5000/analysis/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ duration: parseInt(durationInput.value) }),
  });

  // Monitorea progreso
  let running = true;
  while (running) {
    await new Promise((r) => setTimeout(r, 500));
    const stat = await (
      await fetch("http://127.0.0.1:5000/analysis/status")
    ).json();
    running = stat.running;
    statusBtn.textContent = `⏳ ${stat.progress || 0}%`;
  }

  // Al terminar
  statusBtn.textContent = "✅ Completado";
  reportBtn.disabled = false;
  compareBtn.disabled = false;
  showSuccess("Segundo reporte (Después) generado.");

  // Guarda y muestra
  const report = await (
    await fetch("http://127.0.0.1:5000/analysis/report")
  ).json();
  reportAfter = report;
  showReportChart(report);
};

// -------------- Matar procesos --------------
killBtn.onclick = async () => {
  const selected = [...document.querySelectorAll(".select-proc:checked")];
  if (!selected.length) return;

  const allPids = selected
    .flatMap((cb) => cb.dataset.pids.split(","))
    .map((n) => parseInt(n, 10));

  if (!window.confirm(`¿Cerrar ${allPids.length} proceso(s)?`)) return;

  try {
    const { killed, errors } = await window.electronAPI.kill(allPids);
    showSuccess(`Procesos cerrados: ${killed.join(", ")}`);
    if (Object.keys(errors).length) showError(`Algunos no pudieron cerrarse.`);
    await doScan();
  } catch (e) {
    console.error("Error al cerrar procesos:", e);
    showError(`Error al cerrar procesos: ${e.message}`);
  }
};

// -------------- Aplicar perfil --------------
applyProfileBtn.onclick = async () => {
  const profileName = profileSelect.value;
  if (!profileName) {
    return showError("Seleccioná un perfil primero.");
  }
  if (!lastData.length) {
    return showError("Ejecutá Escanear antes de aplicar un perfil.");
  }

  try {
    const profile = await window.electronAPI.loadProfile(profileName);

    // Asegura compatibilidad con perfiles que son array de strings o de objetos
    const profNames = new Set(
      profile.processes.map((p) => (typeof p === "string" ? p : p.name))
    );

    let count = 0;
    document.querySelectorAll(".select-proc").forEach((cb) => {
      const match = profNames.has(cb.dataset.name);
      cb.checked = match;
      if (match) count++;
    });

    if (count === 0) {
      showError(
        `Ningún proceso actual coincide con el perfil "${profileName}".`
      );
    } else {
      showSuccess(
        `Perfil "${profileName}" aplicado (${count} procesos seleccionados).`
      );
    }
  } catch (err) {
    console.error("Error al aplicar perfil:", err);
    showError(`Error al aplicar perfil: ${err.message}`);
  }
}; // -------------- Guardar perfil --------------
saveBtn.onclick = async () => {
  const name = nameInput.value.trim();
  if (!name) return showError("Ingresá un nombre para el perfil.");
  const checked = [...document.querySelectorAll(".select-proc:checked")];
  if (!checked.length) return showError("Seleccioná al menos un proceso.");

  const processes = checked.map((cb) => cb.dataset.name);
  try {
    const res = await fetch("http://127.0.0.1:5000/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, processes }),
    });
    const result = await res.json();
    if (res.ok) {
      showSuccess(`Perfil "${name}" guardado.`);
      nameInput.value = "";
      loadProfiles();
    } else {
      showError(result.error || "Error al guardar perfil.");
    }
  } catch (e) {
    console.error("Error guardando perfil:", e);
    showError(`Error: ${e.message}`);
  }
};

// -------------- Cargar lista de perfiles --------------
async function loadProfiles() {
  try {
    const resp = await fetch("http://127.0.0.1:5000/profiles");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const { profiles } = await resp.json();
    profileSelect.innerHTML =
      '<option value="">-- Seleccionar perfil --</option>';
    profiles.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p.replace(".json", "");
      profileSelect.appendChild(opt);
    });
  } catch (e) {
    console.error("Error cargando perfiles:", e);
    showError("Error cargando perfiles");
  }
}

// -------------- Column sorting & resizing --------------
document.querySelectorAll("#candidatesTable th[data-sort]").forEach((th) => {
  th.style.cursor = "pointer";
  th.addEventListener("click", () => {
    const key = th.getAttribute("data-sort");
    currentSort.asc = currentSort.key === key ? !currentSort.asc : true;
    currentSort.key = key;
    sortAndRender();
  });
});

document.querySelectorAll("#candidatesTable th").forEach((th) => {
  let startX, startWidth;
  th.addEventListener("mousedown", (e) => {
    if (e.offsetX < th.offsetWidth - 6) return;
    startX = e.pageX;
    startWidth = th.offsetWidth;
    th.classList.add("resizing");
    const onMouseMove = (e2) => {
      const newW = startWidth + (e2.pageX - startX);
      th.style.width = `${newW}px`;
      const idx = Array.from(th.parentNode.children).indexOf(th);
      document.querySelectorAll("#candidatesTable col")[
        idx
      ].style.width = `${newW}px`;
    };
    const onMouseUp = () => {
      th.classList.remove("resizing");
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
});

// -------------- Inicialización --------------
window.addEventListener("DOMContentLoaded", () => {
  modal.classList.add("hidden");
  loadProfiles();
  doScan();
});
