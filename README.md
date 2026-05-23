# mis finanzas

App de finanzas personales con Banco Security, inversiones y dark mode azul.

## Requisitos

- Python 3.11+
- Node.js 18+
- Google Chrome (para el sync automático de bancos)

## Primera vez

### 1. Instalar dependencias

```bash
# Backend Python
cd backend
pip install -r requirements.txt

# Frontend (Next.js + open-banking-chile)
cd ../frontend
npm install
```

### 2. Levantar la app

Necesitas **dos terminales** abiertas al mismo tiempo:

**Terminal 1 — Backend:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Primera sesión

1. Crea tu **contraseña maestra** (protege todos tus datos)
2. Ve a **Config → Conectar banco** y sincroniza tus movimientos:
   - **Santander, BCI, Itaú, BancoEstado, y otros:** usa "Sync automático" — ingresa RUT y clave, Chrome se abre en segundo plano
   - **Banco Security:** usa "Importar CSV" — descarga el CSV desde bancosecurity.cl y súbelo aquí
3. Agrega tus inversiones en la tab **Inversiones** (ticker + fecha + precio de compra)
4. La app categoriza las transacciones automáticamente

## Bancos soportados (sync automático)

| Banco | ID |
|-------|----|
| Banco Falabella | `falabella` |
| Banco BICE | `bice` |
| Santander | `santander` |
| Banco Edwards | `edwards` |
| Scotiabank | `scotiabank` |
| Banco de Chile | `bchile` |
| BCI | `bci` |
| Itaú | `itau` |
| BancoEstado | `bestado` |
| Tarjeta Cencosud | `cencosud` |

> **Banco Security** no está aún en la librería. Se puede importar el CSV manualmente desde la web del banco. La contribución del scraper al proyecto [open-banking-chile](https://github.com/kaihv/open-banking-chile) está pendiente.

## Tabs

| Tab | Qué muestra |
|-----|-------------|
| Dashboard | Gasto del mes, heatmap anual, donut por categoría, últimas transacciones |
| Transacciones | Tabla completa con búsqueda y filtros |
| Cuentas | Saldo por cuenta y movimientos recientes |
| Inversiones | Portafolio, rendimiento, gráfico histórico (Yahoo Finance + Fintual) |
| Transferir | Preparar transferencias y abrir Banco Security |
| Config | Sincronizar banco, manejar cuentas y categorías |

## Seguridad

- La **contraseña maestra** se guarda como hash irreversible en `~/.finanzas_config` — nunca en texto plano
- La **sesión expira a los 30 minutos** de inactividad
- Las **credenciales bancarias nunca se guardan** — se usan solo durante el scraping y se descartan inmediatamente
- El scraping corre **100% local** en tu máquina con Chrome — ningún dato sale al exterior
- La **base de datos está en `.gitignore`** — nunca se sube a GitHub
- El backend solo acepta conexiones desde `localhost:3000`

## Cómo exportar CSV desde Banco Security

1. Inicia sesión en [bancosecurity.cl](https://www.bancosecurity.cl)
2. Selecciona tu cuenta → **Movimientos**
3. Filtra el rango de fechas que quieras
4. Haz clic en **Exportar → CSV**
5. Ve a **Config → Conectar banco → Importar CSV** y sube el archivo

## Documentación de la API

Con el backend corriendo, abre [http://localhost:8000/docs](http://localhost:8000/docs) para ver y probar todos los endpoints interactivamente.
