
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50) UNIQUE NOT NULL,
    provincia VARCHAR(255) NOT NULL,
    tipo_usuario VARCHAR(50) NOT NULL,
    nombre_telegram VARCHAR(255),
    fecha_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(50) DEFAULT 'activo',
    verificado BOOLEAN DEFAULT FALSE
);

CREATE TABLE camioneros (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_vehiculo VARCHAR(100),
    capacidad_toneladas DECIMAL(10, 2),
    rating DECIMAL(3, 2) DEFAULT 5.00,
    total_viajes INTEGER DEFAULT 0
);
