import logging, os
from datetime import datetime

LOG_DIR = os.path.join(os.path.expanduser("~"), "GameOptimizerLogs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "actions.log")

# Configuración del logger
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

def log_action(action: str):
    logging.info(action)

def log_error(msg: str):
    logging.error(msg)