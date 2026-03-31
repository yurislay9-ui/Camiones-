
# Plan de Acción Detallado: Fase 2 - Lógica de Negocio y Matching

Este documento reemplaza y amplía la sección "Semana 2" del `PLAN_DETALLADO.md`. El objetivo de esta fase es implementar el núcleo funcional de la aplicación: la capacidad de los usuarios para publicar sus necesidades/disponibilidad y el sistema para encontrar coincidencias.

---

### Épica 1: Ingesta de Datos (Publicación de Cargas y Viajes)

**Objetivo:** Permitir que clientes y camioneros registren sus ofertas y demandas en el sistema a través del bot.

**Tareas Técnicas:**

1.  **Modificar Base de Datos (`init.sql`):**
    - **Crear tabla `cargas`:**
      ```sql
      CREATE TABLE cargas (
          id SERIAL PRIMARY KEY,
          cliente_id INTEGER REFERENCES usuarios(id),
          origen VARCHAR(255) NOT NULL,
          destino VARCHAR(255) NOT NULL,
          toneladas NUMERIC(5, 2) NOT NULL,
          fecha_maxima DATE NOT NULL,
          estado VARCHAR(50) DEFAULT 'PENDIENTE', -- PENDIENTE, ASIGNADA, COMPLETADA
          fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ```
    - **Crear tabla `viajes`:**
      ```sql
      CREATE TABLE viajes (
          id SERIAL PRIMARY KEY,
          camionero_id INTEGER REFERENCES usuarios(id),
          origen VARCHAR(255) NOT NULL,
          destino VARCHAR(255) NOT NULL,
          capacidad_toneladas NUMERIC(5, 2) NOT NULL,
          fecha_salida DATE NOT NULL,
          estado VARCHAR(50) DEFAULT 'DISPONIBLE', -- DISPONIBLE, EN_PROCESO, COMPLETADO
          fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ```

2.  **Implementar Comandos en el Bot (`bot-telegram`):**
    - **`/publicar_carga` (para Clientes):**
        - Iniciar una conversación para preguntar: Origen, Destino, Toneladas, Fecha máxima.
        - Validar los datos de entrada.
        - Guardar la información en la tabla `cargas`.
    - **`/publicar_viaje` (para Camioneros):**
        - Iniciar una conversación para preguntar: Origen, Destino, Capacidad en Toneladas, Fecha de salida.
        - Validar los datos de entrada.
        - Guardar la información en la tabla `viajes`.

---

### Épica 2: Servicio de Matching Automático

**Objetivo:** Crear un servicio independiente que encuentre coincidencias entre las cargas y los viajes disponibles.

**Tareas Técnicas:**

1.  **Crear Nuevo Microservicio (`matching-service`):**
    - Crear una nueva carpeta `fase-2/matching-service` con un proyecto Node.js/TypeScript.
    - Añadir este servicio al `docker-compose.yml`, conectándolo a la misma red y base de datos.

2.  **Modificar Base de Datos (`init.sql`):**
    - **Crear tabla `coincidencias`:**
      ```sql
      CREATE TABLE coincidencias (
          id SERIAL PRIMARY KEY,
          carga_id INTEGER REFERENCES cargas(id),
          viaje_id INTEGER REFERENCES viajes(id),
          estado VARCHAR(50) DEFAULT 'PROPUESTO', -- PROPUESTO, ACEPTADO_CLIENTE, ACEPTADO_CAMIONERO, CONFIRMADO, RECHAZADO
          fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ```

3.  **Implementar Lógica de Matching:**
    - El servicio ejecutará un "cron job" (tarea programada) cada 5 minutos.
    - **Algoritmo:**
        1.  Seleccionar todas las `cargas` con `estado = 'PENDIENTE'`.
        2.  Para cada carga, buscar `viajes` con `estado = 'DISPONIBLE'` que cumplan los criterios:
            - `viajes.origen` similar a `cargas.origen`.
            - `viajes.destino` similar a `cargas.destino`.
            - `viajes.capacidad_toneladas` >= `cargas.toneladas`.
            - `viajes.fecha_salida` <= `cargas.fecha_maxima`.
        3.  Si se encuentra una coincidencia, insertar un nuevo registro en la tabla `coincidencias`.
        4.  Actualizar el `estado` de la `carga` a `ASIGNADA` y el del `viaje` a `EN_PROCESO` para evitar que se vuelvan a emparejar.

---

### Épica 3: Flujo de Notificación y Confirmación

**Objetivo:** Notificar a los usuarios sobre las coincidencias y permitirles aceptar o rechazar la propuesta.

**Tareas Técnicas:**

1.  **Integración `matching-service` -> `bot-telegram`:**
    - Cuando el `matching-service` crea una coincidencia, debe usar la API de Telegram para enviar un mensaje directo tanto al cliente como al camionero.
    - El `matching-service` necesitará el `TELEGRAM_TOKEN` y el `telegram_id` de los usuarios involucrados (que obtendrá a través de las tablas `cargas`, `viajes` y `usuarios`).

2.  **Implementar Notificaciones en el Bot:**
    - Diseñar el mensaje de notificación. Debe ser claro y contener los detalles de la oferta.
    - El mensaje debe incluir dos botones inline: **"✅ Aceptar"** y **"❌ Rechazar"**.

3.  **Implementar Handlers de Callback:**
    - Crear `callback_query` handlers en el bot para los botones.
    - Al pulsar "Aceptar", se actualiza el estado en la tabla `coincidencias` (ej. a `ACEPTADO_CLIENTE`).
    - Si ambas partes aceptan, el estado final cambia a `CONFIRMADO`.
    - Si alguna parte rechaza, el estado cambia a `RECHAZADO`, y la `carga` y `viaje` correspondientes deben volver a su estado original (`PENDIENTE` y `DISPONIBLE`).

---

### Épica 4: Supervisión Administrativa (Pago Manual)

**Objetivo:** Notificar a un administrador cuando un acuerdo se ha confirmado para que gestione el pago.

**Tareas Técnicas:**

1.  **Añadir Configuración de Administrador:**
    - Añadir una variable `ADMIN_CHAT_ID` al fichero `.env` del bot.

2.  **Implementar Notificación al Administrador:**
    - Cuando el estado de una `coincidencia` cambie a `CONFIRMADO`, el bot debe enviar un mensaje detallado al `ADMIN_CHAT_ID`.
    - El mensaje debe incluir toda la información: detalles del cliente, del camionero, de la carga y del viaje, para que el administrador pueda proceder con la gestión manual del cobro.
