# PlayFormance

PlayFormance es una herramienta multiplataforma para maximizar el rendimiento de tu PC durante sesiones de gaming. Combina un backend en Python que detecta y gestiona procesos con heurísticas avanzadas, y un frontend de escritorio construido con Electron.

## 🚀 Características principales

- Detección dinámica de procesos “no imprescindibles”  
- Terminación y restauración segura de procesos para liberar CPU/RAM  
- Interfaz de escritorio (Electron + React) para control visual  
- API REST minimalista (Flask) para integraciones y automatizaciones  
- Integración opcional con OBS para pausar tareas durante streaming  
- Sistema de plugins: podés agregar nuevas reglas de optimización  

## 📥 Instalación

1. Cloná el repositorio  
   
   git clone https://github.com/tu-usuario/GameOptimizer.git
   cd GameOptimizer
   
2. Configurá el entorno de Python
   
   python3 -m venv .venv
   source .venv/bin/activate    # Linux / macOS
   .venv\Scripts\activate       # Windows
   pip install -r requirements.txt
   
3. Instalá dependencias del frontend
   cd client
   npm install
   npm run build
   cd ..

4. Levantá la aplicación
   - Backend: python app.py
   - Frontend: npm run electron (desde la carpeta raíz)
⚙️ Configuración
En config.yaml definí:
# Umbrales de uso para CPU y RAM
cpu_threshold: 70
ram_threshold: 80

# Lista negra/blanca de procesos
blacklist:
  - chrome.exe
whitelist:
  - steam.exe

# Webhook para integraciones (p. e. Slack, OBS)
webhook_url: "https://hooks.mi-servicio.com/..."

📋 Uso
- Abrí la UI y ajustá manualmente qué procesos pausar
- O bien, invocá la API:
curl -X POST http://localhost:5000/optimize
- Revisá logs en logs/optimizer.log para ver decisiones y tiempos
  
🧪 Testing y CI
- Tests de unidad en tests/ con pytest
- Linter: flake8 + eslint
- Workflows preconfigurados en .github/workflows/
  
🤝 Cómo contribuir
- Abrí un issue para proponer mejoras o reportar bugs
- Hacé un fork y creá un branch descriptivo (feat/nombre o fix/nombre)
- Subí tus cambios y abrí un Pull Request
- Pasá el CI y respondiste feedback de código
  
📄 Licencia
Este proyecto está bajo la licencia MIT.
Ver LICENSE.

---
