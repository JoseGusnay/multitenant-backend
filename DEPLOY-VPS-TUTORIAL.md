# Guía Definitiva de Despliegue en Producción (VPS Saas)

Este documento detalla el paso a paso exacto para tomar este código fuente y desplegarlo desde cero en un nuevo Servidor Privado Virtual (VPS) de cualquier proveedor (Azure, AWS, DigitalOcean, etc.), obteniendo un entorno 100% automatizado con HTTPS y CI/CD.

---

## FASE 1: Preparación del Servidor (VPS)

1. **Crear la Máquina Virtual (VPS)**
   - Sistema Operativo recomendado: **Ubuntu 24.04 LTS** (o versiones recientes).
   - Abrir los puertos **80 (HTTP)** y **443 (HTTPS)** en el Firewall/Panel de Control del proveedor de nube (ej. Reglas Inbound en Azure o Security Groups en AWS). El puerto 22 (SSH) suele venir abierto por defecto.
   - Anota la **Dirección IP Pública** de la máquina.

2. **Configurar el Dominio (DNS)**
   - Ve a tu proveedor de dominio (Namecheap, GoDaddy, etc.).
   - Crea un **Registro tipo A** (A Record).
   - Nombre/Host: `api` (o `@` si es el dominio principal).
   - Valor/Destino: La IP Pública del VPS.
   - Guardar y esperar a la propagación DNS.

3. **Conexión por primera vez al VPS**
   - Desde tu computadora local, abre una terminal y conéctate:
     ```bash
     ssh -i "/ruta/a/tu/llave.pem" usuario@IP_DEL_VPS
     ```
     *(Nota: En Azure tu usuario lo creas tú, en AWS suele ser `ubuntu`, en DigitalOcean es `root`).*

---

## FASE 2: Instalación de Dependencias

Una vez dentro de la consola del VPS, ejecuta:

1. **Instalar Docker de forma automática:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
   ```

2. **Otorgar permisos de Docker a tu usuario:**
   Para evitar usar `sudo` en cada comando de Docker, agrega tu usuario al grupo:
   ```bash
   sudo usermod -aG docker tu_nombre_de_usuario
   ```
   *(Importante: Debes cerrar sesión del VPS escribiendo `exit` y volver a entrar por SSH para que esto tome efecto).*

---

## FASE 3: Clonación y Variables de Entorno

1. **Clonar el Repositorio Base:**
   Dile a tu VPS que descargue tu código original por primera vez en la raíz (`/home/usuario/`):
   ```bash
   git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git multitenant-backend
   cd multitenant-backend
   ```

2. **Crear el Archivo Secreto de Entorno (`.env`)**
   Crea y abre tu archivo con el editor de textos:
   ```bash
   nano .env
   ```
   Pega tu configuración de producción (Asegúrate de cambiar las contraseñas). El host de DB **debe** llamarse `postgres_master`:
   ```env
   DB_MIGRATION_TEMP_URL=postgres://postgres:CONTRASEÑA_SEGURA@postgres_master:5432/postgres
   DB_MASTER_URL=postgres://postgres:CONTRASEÑA_SEGURA@postgres_master:5432/postgres
   JWT_SECRET=UNA_CADENA_LARGA_DE_SEGURIDAD
   NODE_ENV=production
   SAAS_ADMIN_EMAIL=tu_correo_real@tuempresa.com
   SAAS_ADMIN_PASSWORD=Tu_Contraseña_Ultra_Segura_123!
   ```
   *Guarda con `Ctrl+O`, `Enter`, y sal con `Ctrl+X`.*

---

## FASE 4: Configurar Auto-Despliegue en GitHub (CI/CD)

1. En la página web de tu repositorio de GitHub, navega a **Settings > Secrets and variables > Actions**.
2. Crea los siguientes tres secretos (`New repository secret`):
   - `VPS_HOST`: Pon la IP Pública de tu VPS.
   - `VPS_USERNAME`: Pon tu usuario (el que usas en SSH, ej: `azureuser` o `ubuntu`).
   - `VPS_SSH_KEY`: Pega el texto COMPLETO de tu archivo `.pem` (o llave privada `id_rsa`), incluyendo los guiones de inicio y fin.

---

## FASE 5: Actualizar Configuración Local y Desplegar Magia

De vuelta en tu computadora Local (VS Code):

1. **Afina el Caddyfile**
   Asegúrate de que el documento `Caddyfile` en la raíz de tu proyecto tenga escrito tu dominio definitivo. Por ejemplo:
   ```caddyfile
   api.tu-dominio.com {
       reverse_proxy api:3000
   }
   ```

2. **Hacer el despliegue automático:**
   Dado que configuraste `.github/workflows/deploy.yml`, el acto de enviar código detona la instalación:
   ```bash
   git add .
   git commit -m "Despliegue a Produccion"
   git push
   ```

## Confirmación y Flujo de Trabajo
- Cuando GitHub termine de procesar tu *Action*, ¡el servidor está vivo!
- Si vas a `https://api.tu-dominio.com/api/health` verás el candado seguro de Let's Encrypt (gestionado por Caddy).
- **Semillas de la DB:** Al encender NestJS por primera vez, él solo creará las tablas (Migrations) y los roles base, generando automáticamente al súper-usuario dueño del SaaS (`saas_admin@tuempresa.com` / `Administrador1*`).

> ✅ **A partir de ahora, todo el mantenimiento en este VPS se reduce a programar en tu laptop y hacer `git push`. La máquina trabajará para ti.**
