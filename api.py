from flask import Flask, jsonify, request
from flask_cors import CORS
import psutil
from detection import scan_candidates
from utils import log_action, log_error
from psutil import NoSuchProcess, TimeoutExpired

app = Flask(__name__)
CORS(app)

@app.route('/scan', methods=['GET'])
def api_scan():
    try:
        candidates = scan_candidates()
        return jsonify(candidates), 200
    except Exception as e:
        log_error(f"API /scan error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/kill', methods=['POST'])
def api_kill():
    data    = request.get_json(force=True)
    pids    = data.get('pids', [])
    dry_run = data.get('dry_run', False)
    killed  = []
    errors  = {}

    for pid in pids:
        try:
            if dry_run:
                log_action(f"[DRY-RUN] Simular cierre PID={pid}")
                killed.append(pid)
                continue

            proc = psutil.Process(pid)
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except TimeoutExpired:
                proc.kill()
            killed.append(pid)
            log_action(f"Terminó proceso PID={pid} ({proc.name()})")
        except NoSuchProcess:
            pass
        except Exception as e:
            errors[str(pid)] = str(e)
            log_error(f"API /kill error PID={pid}: {e}")

    return jsonify({'killed': killed, 'errors': errors}), 200

@app.route('/logs', methods=['GET'])
def api_logs():
    try:
        with open('gameoptimizer.log', 'r', encoding='utf-8') as f:
            lines = f.readlines()[-50:]
        return jsonify({'logs': lines}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Iniciando GameOptimizer API en http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=False)
