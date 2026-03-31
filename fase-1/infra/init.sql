-- Archivo de inicialización para la base de datos de LogiCuba

-- Tabla de usuarios: Almacena la información básica de todos los usuarios (clientes y camioneros).
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50) UNIQUE NOT NULL,
    provincia VARCHAR(255) NOT NULL,
    tipo_usuario VARCHAR(50) NOT NULL, -- Puede ser 'cliente' o 'camionero'
    nombre_telegram VARCHAR(255), -- Nombre de usuario de Telegram
    fecha_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(50) DEFAULT 'activo', -- p.ej. 'activo', 'inactivo', 'bloqueado'
    verificado BOOLEAN DEFAULT FALSE
);

-- Tabla de camioneros: Almacena información específica de los camioneros.
CREATE TABLE camioneros (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_vehiculo VARCHAR(100),
    capacidad_toneladas DECIMAL(10, 2),
    rating DECIMAL(3, 2) DEFAULT 5.00, -- Rating promedio del camionero
    total_viajes INTEGER DEFAULT 0
);

-- Tabla de cargas: Publicaciones de los clientes que necesitan transportar mercancía.
CREATE TABLE cargas (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES usuarios(id),
    origen_provincia VARCHAR(255) NOT NULL,
    origen_direccion TEXT NOT NULL, -- Dirección específica de recogida
    destino_provincia VARCHAR(255) NOT NULL,
    destino_direccion TEXT NOT NULL, -- Dirección específica de entrega
    descripcion TEXT NOT NULL, -- Descripción de la mercancía
    peso_kg NUMERIC(10, 2) NOT NULL,
    fecha_limite DATE NOT NULL, -- Fecha límite para la entrega
    estado VARCHAR(50) DEFAULT 'PENDIENTE', -- PENDIENTE, ASIGNADA, COMPLETADA, CANCELADA
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de viajes: Publicaciones de los camioneros que ofrecen transporte.
CREATE TABLE viajes (
    id SERIAL PRIMARY KEY,
    camionero_id INTEGER NOT NULL REFERENCES usuarios(id),
    origen_provincia VARCHAR(255) NOT NULL,
    origen_municipio VARCHAR(255) NOT NULL,
    destino_provincia VARCHAR(255) NOT NULL,
    destino_municipio VARCHAR(255) NOT NULL,
    toneladas_disponibles NUMERIC(10, 2) NOT NULL,
    fecha_salida DATE NOT NULL,
    estado VARCHAR(50) DEFAULT 'DISPONIBLE', -- DISPONIBLE, EN_PROCESO, COMPLETADO
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de matches: Conecta una carga con un viaje y gestiona el estado del acuerdo y el pago.
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    carga_id INTEGER NOT NULL REFERENCES cargas(id),
    viaje_id INTEGER NOT NULL REFERENCES viajes(id),
    
    -- Ciclo de vida del estado del match:
    -- PROPUESTO: El matchmaking-service acaba de crear la coincidencia.
    -- NOTIFICADO: El bot ha notificado a ambos usuarios sobre la propuesta.
    -- ACEPTADO_POR_CLIENTE: El cliente ha aceptado, esperando al camionero.
    -- ACEPTADO_POR_CAMIONERO: El camionero ha aceptado, esperando al cliente.
    -- CONFIRMADO: Ambos han aceptado. El siguiente paso es el pago.
    -- PENDIENTE_PAGO: El bot ha solicitado el pago al cliente.
    -- PAGADO: El pagos-service ha validado la transacción.
    -- EN_PROGRESO: El viaje ha comenzado.
    -- COMPLETADO: El viaje ha finalizado con éxito.
    -- RECHAZADO: Uno de los usuarios ha rechazado la propuesta.
    -- CANCELADO: El match fue cancelado después de haber sido confirmado.
    estado VARCHAR(50) NOT NULL DEFAULT 'PROPUESTO',
    
    monto_acordado NUMERIC(10, 2), -- Tarifa del servicio LogiCuba para esta operación
    id_operacion_pago VARCHAR(255) UNIQUE, -- ID de la operación de Transfermóvil
    
    fecha_propuesta TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_confirmado TIMESTAMPTZ, -- Cuando ambos usuarios aceptan
    fecha_pago TIMESTAMPTZ, -- Cuando el servicio de pagos valida la transacción
    
    UNIQUE (carga_id, viaje_id) -- No puede haber dos matches para la misma carga y viaje
);

-- Índices para acelerar búsquedas comunes
CREATE INDEX idx_usuarios_telegram_id ON usuarios(telegram_id);
CREATE INDEX idx_cargas_estado ON cargas(estado);
CREATE INDEX idx_viajes_estado ON viajes(estado);
CREATE INDEX idx_matches_estado ON matches(estado);
