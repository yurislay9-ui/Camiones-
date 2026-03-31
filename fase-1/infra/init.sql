-- Script de Inicialización Profesional para LogiCuba v1.0
-- Define el esquema completo para el MVP funcional.

-- TIPOS ENUMERADOS (ENUMS)
-- Proporcionan integridad de datos y claridad.
CREATE TYPE TIPO_VEHICULO AS ENUM ('camion_grande', 'camion_mediano', 'camioneta', 'otro');
CREATE TYPE ESTADO_USUARIO AS ENUM ('activo', 'inactivo', 'suspendido', 'baneado');
CREATE TYPE CANAL_REGISTRO AS ENUM ('whatsapp', 'telegram', 'ambos');
CREATE TYPE ESTADO_CARGA AS ENUM ('buscando', 'match_encontrado', 'en_ruta', 'entregado', 'cancelado');
CREATE TYPE ESTADO_VIAJE AS ENUM ('disponible', 'match_encontrado', 'en_ruta', 'completado', 'cancelado');
CREATE TYPE ESTADO_MATCH AS ENUM ('encontrado', 'esperando_pago', 'pago_confirmado', 'en_recogida', 'en_ruta', 'entregado', 'cancelado', 'expirado');
CREATE TYPE TIPO_RUTA AS ENUM ('corta', 'media', 'larga');

-- TABLAS PRINCIPALES

CREATE TABLE camioneros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50) UNIQUE NOT NULL,
    tipo_vehiculo TIPO_VEHICULO,
    capacidad_ton DECIMAL(5, 2) NOT NULL,
    provincia_base VARCHAR(100) NOT NULL,
    estado ESTADO_USUARIO DEFAULT 'activo',
    fecha_registro TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50) UNIQUE NOT NULL,
    direccion TEXT,
    estado ESTADO_USUARIO DEFAULT 'activo',
    fecha_registro TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cargas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id),
    origen_provincia VARCHAR(100) NOT NULL,
    origen_direccion TEXT NOT NULL,
    destino_provincia VARCHAR(100) NOT NULL,
    destino_direccion TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    peso_kg DECIMAL(8, 2) NOT NULL,
    fecha_limite TIMESTAMPTZ NOT NULL,
    estado ESTADO_CARGA DEFAULT 'buscando',
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE viajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camionero_id UUID NOT NULL REFERENCES camioneros(id),
    origen_provincia VARCHAR(100) NOT NULL,
    destino_provincia VARCHAR(100) NOT NULL,
    fecha_salida DATE NOT NULL,
    espacio_disponible_ton DECIMAL(5, 2) NOT NULL,
    estado ESTADO_VIAJE DEFAULT 'disponible',
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carga_id UUID NOT NULL REFERENCES cargas(id),
    viaje_id UUID NOT NULL REFERENCES viajes(id),
    tarifa_cup INT NOT NULL,
    tipo_ruta TIPO_RUTA NOT NULL,
    estado ESTADO_MATCH DEFAULT 'encontrado',
    fecha_match TIMESTAMPTZ DEFAULT NOW(),
    fecha_limite_pago TIMESTAMPTZ
);

CREATE TABLE pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id),
    id_operacion_transfermovil VARCHAR(255) UNIQUE NOT NULL,
    monto_cup INT NOT NULL,
    cuenta_origen VARCHAR(255),
    fecha_sms TIMESTAMPTZ NOT NULL,
    sms_raw TEXT,
    validado BOOLEAN DEFAULT false,
    fecha_validacion TIMESTAMPTZ
);

-- ÍNDICES PARA OPTIMIZAR EL RENDIMIENTO
-- Crucial para una operación rápida a medida que los datos crecen.
CREATE INDEX ON camioneros (telefono);
CREATE INDEX ON clientes (telefono);
CREATE INDEX ON cargas (estado, origen_provincia, destino_provincia);
CREATE INDEX ON viajes (estado, origen_provincia, destino_provincia);
CREATE INDEX ON matches (estado);
CREATE INDEX ON pagos (id_operacion_transfermovil);
