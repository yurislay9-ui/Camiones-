# Plan de Trabajo Detallado del Proyecto LogiCuba

---

## **Fase 1: MVP Mínimo (Semanas 1-3)**
*   **Objetivo Principal:** Lanzar un producto funcional mínimo en Telegram para validar la idea de negocio con usuarios reales.

### **Semana 1: Infraestructura y Bot Básico**
*   **Tareas:**
    1.  **Oracle Cloud:**
        *   Crear cuenta en Oracle Cloud Free Tier.
        *   Provisionar una instancia de VM (ARM Ampere A1) con Oracle Linux.
        *   Configurar la Red Virtual en la Nube (VCN), subredes (1 pública, 1 privada) y Listas de Seguridad (permitir solo tráfico de Cloudflare y SSH).
        *   Instalar Docker y Docker Compose en la VM.
    2.  **Base de Datos y Caché:**
        *   Crear el archivo `docker-compose.yml` inicial con servicios para PostgreSQL y Redis.
        *   Escribir un script `init.sql` para crear las tablas principales (`camioneros`, `clientes`, `cargas`, `viajes`) con sus columnas y tipos de datos según el documento.
        *   Lanzar los contenedores.
    3.  **Cloudflare:**
        *   Configurar un dominio (ej. `logicuba.cu`).
        *   Crear un Cloudflare Tunnel para exponer de forma segura los servicios de la VM sin abrir puertos públicos.
    4.  **Bot de Telegram (Telegraf):**
        *   Registrar el bot en Telegram a través de `BotFather` para obtener el token.
        *   Crear un nuevo servicio en `docker-compose.yml` para el bot.
        *   Desarrollar la estructura básica del bot usando Telegraf y TypeScript.
        *   Implementar el comando `/start` y los flujos de registro para camioneros y clientes, guardando los datos en PostgreSQL.

### **Semana 2: Lógica de Negocio y Pagos Manuales**
*   **Tareas:**
    1.  **Lógica de Matching:**
        *   Desarrollar el módulo de matching en TypeScript. Este servicio se ejecutará en su propio contenedor Docker.
        *   La lógica debe:
            *   Consultar periódicamente las `cargas` pendientes y los `viajes` disponibles.
            *   Aplicar los criterios de matching: coincidencia geográfica (provincia), capacidad (toneladas) y temporalidad.
            *   Crear un registro en la tabla `matches` con estado `ENCONTRADO`.
        *   Integrar el servicio con el bot de Telegram para notificar a los camioneros sobre nuevos matches disponibles.
    2.  **Flujos de Publicación:**
        *   Implementar los comandos y conversaciones en el bot para que los camioneros publiquen viajes (`/publicar_viaje`) y los clientes publiquen cargas (`/publicar_carga`).
    3.  **Proceso de Pago Manual:**
        *   Crear un canal privado en Telegram para los administradores.
        *   Cuando un camionero acepte un match (`/aceptar_match`), el bot debe enviar una notificación detallada al canal de administradores.
        *   El administrador verifica el pago (que se realiza por fuera del sistema) y ejecuta un comando (`/confirmar_pago <ID_MATCH>`) en el bot.
        *   Al recibir la confirmación, el bot libera la información de contacto al camionero y al cliente.

### **Semana 3: Pruebas y Ajustes**
*   **Tareas:**
    1.  **Pruebas Internas (E2E):**
        *   El equipo de desarrollo debe probar todos los flujos de principio a fin varias veces.
    2.  **Programa de Beta Testers:**
        *   Reclutar un grupo de 5-10 camioneros y clientes reales.
        *   Crear un grupo de soporte en WhatsApp/Telegram para los testers.
        *   Realizar el onboarding y darles acceso al bot.
    3.  **Recopilación y Acción:**
        *   Recopilar activamente feedback, reportes de bugs y sugerencias.
        *   Priorizar y corregir los bugs más importantes.
        *   Realizar ajustes de usabilidad basados en los comentarios.

---

## **Fase 2: Automatización (Semanas 4-6)**
*   **Objetivo Principal:** Eliminar la intervención manual en los pagos e integrar WhatsApp como canal principal.

### **Semana 4: Automatización de Pagos (SMS)**
*   **Tareas:**
    1.  **Configuración del Receptor SMS (Xiaomi):**
        *   Instalar y configurar Termux y Termux:API en el dispositivo Android.
        *   Desarrollar el script (puede ser en Bash o Python) que use `termux-sms-list` y `termux-api-request` para:
            *   Leer nuevos SMS del número de Transfermóvil.
            *   Parsear el contenido con expresiones regulares para extraer: ID de operación, monto, y cuenta de destino.
            *   Enviar los datos extraídos a un endpoint seguro en el servidor de Oracle.
    2.  **Servicio de Validación de Pagos (Oracle Cloud):**
        *   Crear un nuevo microservicio `pagos-service`.
        *   Definir un endpoint de API REST (`/validate-payment`) protegido por una API Key.
        *   Implementar la lógica de validación de pagos que verifique: monto correcto, ID de operación único (para evitar reuso), cuenta de destino correcta y límite de tiempo.
        *   Si la validación es exitosa, actualizar el estado del match a `PAGO_CONFIRMADO` y disparar la liberación de datos de contacto.

### **Semana 5: Integración con WhatsApp**
*   **Tareas:**
    1.  **Gateway (Evolution API):**
        *   Añadir el contenedor de Evolution API al `docker-compose.yml`.
        *   Configurar y conectar el primer número de WhatsApp (previamente "calentado").
    2.  **Constructor de Flujos (Typebot):**
        *   Añadir el contenedor de Typebot al `docker-compose.yml`.
        *   Recrear todos los flujos de conversación de Telegram (registro, publicar carga/viaje, aceptar match) en la interfaz visual de Typebot.
        *   Configurar los webhooks en Typebot para que se comuniquen con los servicios de backend (lógica de matching, base de datos).
        *   Conectar Typebot con la instancia de Evolution API.

### **Semana 6: Integración Final y Pruebas**
*   **Tareas:**
    1.  **Integración Completa:**
        *   Asegurar que los flujos en WhatsApp se comunican correctamente con la lógica de negocio y el sistema de pagos automáticos.
    2.  **Pruebas End-to-End (E2E):**
        *   Realizar pruebas completas del ciclo de vida de una transacción a través de WhatsApp.
        *   Probar los casos de error: pago con monto incorrecto, SMS duplicado, fallo de conexión del receptor SMS, etc.
    3.  **Lanzamiento a Beta Testers:**
        *   Invitar al grupo de beta testers a usar el bot de WhatsApp.

---

## **Fase 3: Robustez (Semanas 7-10)**
*   **Objetivo Principal:** Hacer el sistema más seguro, resiliente y preparado para el crecimiento.

### **Semana 7: Anti-Ban y Alertas**
*   **Tareas:**
    1.  **Estrategias Anti-Ban:**
        *   Implementar delays aleatorios, rotación de textos, y simulación de "escribiendo..." en Typebot.
        *   Configurar límites de mensajes salientes por hora/día en Evolution API.
        *   Desarrollar el protocolo de rotación automática de números de WhatsApp en caso de detección de ban.
    2.  **Sistema de Alertas:**
        *   Crear un bot de Telegram exclusivo para administradores.
        *   Integrarlo con todos los microservicios para notificar eventos críticos en tiempo real: intentos de fraude, errores 5xx, servicios caídos, números baneados.

### **Semana 8: Resiliencia y Comunidad**
*   **Tareas:**
    1.  **Protocolo Offline:**
        *   Modificar el flujo para que al confirmar un pago, se envíe un único mensaje de WhatsApp/Telegram con un "snapshot" completo del viaje (datos del cliente, direcciones, descripción, etc.).
    2.  **Sistema de Calificación (Rating):**
        *   Modificar la DB para añadir campos de `rating` a camioneros y clientes.
        *   Al cambiar un match a estado `ENTREGADO`, disparar un flujo que pida a ambas partes calificar su experiencia (ej. con botones de 1 a 5 estrellas).

### **Semana 9: Modelo de Negocio y Backups**
*   **Tareas:**
    1.  **Modelo de Suscripción:**
        *   Implementar la lógica para un número limitado de matches gratuitos.
        *   Crear flujos en el bot para gestionar el pago de suscripciones "Premium" (ej. matches ilimitados).
    2.  **Backups Automáticos:**
        *   Crear un script (`backup.sh`) que use `pg_dump`, encripte el resultado con GPG, y lo suba a Oracle Cloud Object Storage.
        *   Configurar un `cronjob` en la VM para ejecutar este script diariamente.

### **Semana 10: Optimización y Monitoreo**
*   **Tareas:**
    1.  **Optimización de Base de Datos:**
        *   Analizar las consultas más frecuentes y lentas.
        *   Añadir los índices recomendados en el documento (ej. en las columnas de estado y geográficas).
    2.  **Monitoreo de Infraestructura:**
        *   Desplegar un stack de monitoreo básico (Prometheus + Grafana) a través de Docker.
        *   Configurar dashboards para visualizar el estado de los contenedores (CPU, RAM) y métricas clave del negocio (usuarios, matches/hora).

---

## **Fase 4: Crecimiento (Meses 4-12)**
*   **Objetivo Principal:** Expandir la base de usuarios, mejorar la gestión y asegurar la sostenibilidad a largo plazo.

### **Mes 4-5: Dashboard de Administración y Analíticas**
*   **Tareas:**
    *   Desarrollar una aplicación web de administración (ej. con Next.js o SvelteKit).
    *   Implementar autenticación segura para el equipo.
    *   Crear vistas para gestionar usuarios, ver transacciones, y resolver disputas o pagos fallidos manualmente.
    *   Integrar librerías de gráficos (ej. Chart.js) para visualizar KPIs: rutas más populares, ingresos, horas pico, etc.

### **Mes 6-8: Expansión y Marketing**
*   **Tareas:**
    *   Lanzar campañas en redes sociales (Facebook, Instagram) dirigidas a transportistas y dueños de negocios en Cuba.
    *   Realizar un "roadshow" digital o presencial para presentar el servicio en cooperativas y asociaciones de transporte.
    *   Monitorear la carga del servidor y escalar los recursos de la VM si es necesario.

### **Mes 9-10: Migración a API Oficial de WhatsApp**
*   **Tareas:**
    *   Completar el proceso de verificación de negocio con Meta.
    *   Solicitar acceso a la API Oficial de WhatsApp Business.
    *   Adaptar el código del backend para dejar de usar Evolution API y comunicarse directamente con la API de Meta. Esto incluye el uso de plantillas de mensajes (HSM).

### **Mes 11-12: Exploración de Nuevas Plataformas**
*   **Tareas:**
    *   Investigar y prototipar una Mini App de Telegram para ofrecer una experiencia de usuario más rica (mapas interactivos, subida de archivos mejorada).
    *   Evaluar el feedback y las métricas de uso para decidir sobre un desarrollo completo.
    *   Planificar el roadmap para el segundo año de operaciones.
