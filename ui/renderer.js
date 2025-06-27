const scanBtn = document.getElementById('scanBtn');
const killBtn = document.getElementById('killBtn');
const logsBtn = document.getElementById('logsBtn');
const loader  = document.getElementById('loader');
const msgDiv  = document.getElementById('messages');
const tbody   = document.querySelector('#candidatesTable tbody');
const modal   = document.getElementById('logsModal');
const closeX  = document.getElementById('closeLogs');
const logsPre = document.getElementById('logsContent');

let candidates = [];

async function doScan() {
  showLoader();
  clearMsg();
  try {
    candidates = await window.api.scan();
    renderTable(candidates);
    showSuccess(`Encontrados ${candidates.length} candidatos.`);
  } catch (e) {
    showError(`Error al escanear: ${e.message}`);
    tbody.innerHTML = '';
  } finally { hideLoader(); }
}

async function doKill() {
  const selected = Array.from(
    document.querySelectorAll('input[name="select"]:checked')
  ).map(cb => +cb.value);
  if (!selected.length) return;
  showLoader(); clearMsg();
  try {
    const { killed, errors } = await window.api.kill(selected);
    showSuccess(`Cerrados: ${killed.length}. Errores: ${Object.keys(errors).length}`);
    await doScan();
  } catch (e) {
    showError(`Error al cerrar: ${e.message}`);
  } finally { hideLoader(); }
}

async function doLogs() {
  showLoader();
  try {
    const lines = await window.api.logs();
    logsPre.textContent = lines.join('');
    modal.classList.remove('hidden');
  } catch (e) {
    showError(`Error cargando logs: ${e.message}`);
  } finally { hideLoader(); }
}

scanBtn.onclick = doScan;
killBtn.onclick = doKill;
logsBtn.onclick = doLogs;
closeX.onclick = () => modal.classList.add('hidden');

// Helper UI funcs (showLoader, hideLoader, showSuccess, showError, renderTable)...
