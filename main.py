import argparse
import schedule
import time
import psutil
from tabulate import tabulate
import inquirer
from psutil import NoSuchProcess, TimeoutExpired

from detection import scan_candidates
from utils import log_action, log_error

#  Dummy notifier para evitar errores de GUI 
class DummyNotifier:
    def show_toast(self, *args, **kwargs):
        pass

notifier = DummyNotifier()

#  Parseo de argumentos CLI 
parser = argparse.ArgumentParser(description="GameOptimizer Dynamic")
parser.add_argument(
    "--dry-run", action="store_true",
    help="Simula sin cerrar procesos"
)
parser.add_argument(
    "--interval", type=int, default=30,
    help="Intervalo del scheduler en minutos (default: 30)"
)
parser.add_argument(
    "--once", action="store_true",
    help="Ejecuta una sola vez y sale"
)
args = parser.parse_args()

#  Funciones de UI en consola 
def mostrar_candidatos(cands):
    headers = ["IDX", "PID", "Nombre", "CPU%", "RAM(MB)", "Firma"]
    rows = []
    for i, c in enumerate(cands):
        rows.append([
            i,
            c["pid"],
            c["name"],
            f"{c['cpu']:.1f}",
            f"{c['ram']:.1f}",
            c["signer"]
        ])
    print("\n Candidatos a optimizar:")
    print(tabulate(rows, headers, tablefmt="fancy_grid"))

def menu_interactivo(cands):
    choices = [
        f"{i} – {c['name']} (PID {c['pid']})"
        for i, c in enumerate(cands)
    ]
    pregunta = [
        inquirer.Checkbox(
            "to_kill",
            message="Seleccioná índices de procesos a cerrar",
            choices=choices
        )
    ]
    resp = inquirer.prompt(pregunta) or {}
    sel = resp.get("to_kill", [])
    return [int(item.split(" ")[0]) for item in sel]

#  Lógica de terminación con logging y dry-run 
def aplicar_terminacion(idxs, cands):
    if not idxs:
        print("■ No se seleccionó ningún proceso.")
        return

    # Construir conjunto de nombres seleccionados
    names_to_kill = {
        cands[i]["name"]
        for i in idxs
        if 0 <= i < len(cands)
    }

    for proc in psutil.process_iter(['pid', 'name']):
        name = proc.info.get('name')
        pid  = proc.info.get('pid')
        if name not in names_to_kill:
            continue

        if args.dry_run:
            log_action(f"[DRY-RUN] Simular cierre de PID={pid} ({name})")
            print(f"[DRY-RUN] Cerraría: {name} (PID {pid})")
            continue

        try:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except TimeoutExpired:
                proc.kill()
            print(f"✓ Cerrado: {name} (PID {pid})")
            log_action(f"Terminó proceso PID={pid} ({name})")
        except NoSuchProcess:
            # Ya fue cerrado, ignorar
            pass
        except Exception as e:
            print(f"❌ Error cerrando {name} (PID {pid}): {e}")
            log_error(f"Error cerrando PID={pid} ({name}): {e}")

    # dummy toast
    notifier.show_toast(
        "GameOptimizer",
        f"{'Simulación' if args.dry_run else 'Procesos terminados'}"
    )

#  Tarea principal 
def job():
    print("\n=== Escaneo dinámico — GameOptimizer ===")
    try:
        candidates = scan_candidates()
    except Exception as e:
        log_error(f"Error en scan_candidates: {e}")
        print(f" Error al escanear: {e}")
        return

    if not candidates:
        print(" No hay procesos candidatos a cerrar.")
        return

    mostrar_candidatos(candidates)
    seleccionados = menu_interactivo(candidates)
    aplicar_terminacion(seleccionados, candidates)

#  Entry point 
if __name__ == "__main__":
    # Primera ejecución inmediata
    job()

    if args.once:
        print("■ Ejecutado una vez. Saliendo.")
        exit(0)

    # Scheduler
    schedule.every(args.interval).minutes.do(job)
    print(f"\n⏳ Scheduler activo: cada {args.interval} minutos. (Ctrl+C para salir)\n")

    try:
        while True:
            schedule.run_pending()
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n Scheduler detenido. ¡Hasta la próxima!")
