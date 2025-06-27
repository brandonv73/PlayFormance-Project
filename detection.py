import psutil
import time
import win32api
from pathlib import Path
import pefile

# Procesos críticos del sistema
CRITICAL = {
    "csrss.exe", "winlogon.exe", "lsass.exe",
    "explorer.exe", "services.exe", "smss.exe",
    "svchost.exe", "wininit.exe",
    "system",          # PID 4 proxy
    "registry"         # procesos internos
}
SYSTEM_DIRS = (
    r"C:\Windows\System32",
    r"C:\Windows\SysWOW64"
)

def es_critico(proc):
    """Filtrar procesos que no tocamos"""
    name = (proc.info.get('name') or "").lower()
    if name in CRITICAL:
        return True
    try:
        path = proc.exe()
        if any(path.lower().startswith(sd.lower()) for sd in SYSTEM_DIRS):
            return True
    except Exception:
        return True
    return False

def firma_digital(path):
    """Devuelve CompanyName o, si es binario de Windows, 'Microsoft Corporation'."""
    # 1) Si está en Windows dir, lo marcamos Microsoft
    try:
        p = Path(path)
        if any(str(p).lower().startswith(sd.lower()) for sd in SYSTEM_DIRS):
            return "Microsoft Corporation"
    except Exception:
        pass

    # 2) Intento por Win32API
    try:
        trans = win32api.GetFileVersionInfo(path, r'\VarFileInfo\Translation')
        for lang, codepage in trans:
            block = r'\StringFileInfo\%04x%04x\CompanyName' % (lang, codepage)
            try:
                val = win32api.GetFileVersionInfo(path, block)
                if val and isinstance(val, str):
                    return val
            except Exception:
                continue
    except Exception:
        pass

    # 3) Fallback con pefile
    try:
        pe = pefile.PE(path, fast_load=True)
        pe.parse_data_directories(
            directories=[pefile.DIRECTORY_ENTRY['IMAGE_DIRECTORY_ENTRY_RESOURCE']]
        )
        for fileinfo in getattr(pe, 'FileInfo', []) or []:
            if fileinfo.Key == b'StringFileInfo':
                for st in fileinfo.StringTable:
                    comp = st.entries.get(b'CompanyName')
                    if comp:
                        return comp.decode(errors='ignore')
    except Exception:
        pass

    return None

def scan_candidates():
    """Escanea procesos, mide CPU/RAM y devuelve candidatos con firma real."""
    # 1) Primer pase para inicializar cpu_percent
    procs = list(psutil.process_iter(['pid', 'name']))
    for p in procs:
        try:
            p.cpu_percent(interval=None)
        except Exception:
            pass

    # 2) Espera para mediciones reales
    time.sleep(1)

    candidatos = []
    for proc in procs:
        try:
            if es_critico(proc):
                continue

            cpu = proc.cpu_percent(interval=None)
            ram = proc.memory_info().rss / (1024**2)  # MB
            path = proc.exe()
            signer = firma_digital(path) or "Desconocido"

            # Heurísticas
            idle = cpu == 0 and ram > 50
            third = signer and "Microsoft" not in signer

            if idle or third:
                candidatos.append({
                    'pid': proc.pid,
                    'name': proc.info.get('name'),
                    'cpu': cpu,
                    'ram': ram,
                    'path': path,
                    'signer': signer
                })
        except Exception:
            continue

    return candidatos
