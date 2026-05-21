# mis finanzas

App de finanzas personales con Banco Security, inversiones y dark mode azul.

## Requisitos

- Python 3.11+
- Node.js 18+
- Cuenta en [fintoc.com](https://app.fintoc.com/) (gratis) para conectar el banco

## Primera vez

### 1. Configurar variables de entorno

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Edita `backend/.env` y agrega tu clave de Fintoc:
```
FINTOC_SECRET_KEY=sk_live_XXXXXXXXXXXXXXXX
```

Edita `frontend/.env.local` y agrega tu clave pública de Fintoc:
```
NEXT_PUBLIC_FINTOC_PUBLIC_KEY=pk_live_XXXXXXXXXXXXXXXX
```

### 2. Instalar dependencias

```bash
# Backend Python
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

## Levantar la app

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
2. Ve a **Config → Conectar banco** y conecta Banco Security con el Widget de Fintoc
3. Agrega tus inversiones en la tab **Inversiones** (ticker + fecha + precio de compra)
4. La app sincroniza tus transacciones y las categoriza automáticamente

## Tabs

| Tab | Qué muestra |
|-----|-------------|
| Dashboard | Gasto del mes, heatmap anual, donut por categoría, últimas transacciones |
| Transacciones | Tabla completa con búsqueda y filtros |
| Cuentas | Saldo por cuenta y movimientos recientes |
| Inversiones | Portafolio, rendimiento, gráfico histórico (Yahoo Finance + Fintual) |
| Transferir | Preparar transferencias y abrir Banco Security |
| Config | Conectar banco, manejar cuentas y categorías |

## Seguridad

- La **contraseña maestra** se guarda como hash irreversible en `~/.finanzas_config` — nunca en texto plano
- La **sesión expira a los 30 minutos** de inactividad
- Tus **credenciales bancarias nunca pasan por esta app** — Fintoc las maneja en su propia ventana segura
- La **base de datos y el `.env` están en `.gitignore`** — nunca se suben a GitHub
- El backend solo acepta conexiones desde `localhost:3000`

## Documentación de la API

Con el backend corriendo, abre [http://localhost:8000/docs](http://localhost:8000/docs) para ver y probar todos los endpoints interactivamente.
