-- =========================================
-- CREACIÓN DE BASE DE DATOS
-- =========================================
CREATE DATABASE IF NOT EXISTS sistema_rutinas
CHARACTER SET utf8mb4
COLLATE utf8mb4_general_ci;

USE sistema_rutinas;

-- =========================================
-- TABLA: USUARIOS
-- =========================================
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    rol ENUM('usuario', 'administrador') NOT NULL DEFAULT 'usuario'
);

-- =========================================
-- TABLA: RUTINAS
-- =========================================
CREATE TABLE rutinas (
    id_rutina INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE NOT NULL,
    estado ENUM('activa', 'pausada', 'finalizada') DEFAULT 'activa',
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
);

-- =========================================
-- TABLA: HÁBITOS
-- =========================================
CREATE TABLE habitos (
    id_habito INT AUTO_INCREMENT PRIMARY KEY,
    id_rutina INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    frecuencia ENUM('diaria', 'semanal', 'mensual') NOT NULL,
    FOREIGN KEY (id_rutina)
        REFERENCES rutinas(id_rutina)
        ON DELETE CASCADE
);

-- =========================================
-- TABLA: CUMPLIMIENTO (HISTORIAL)
-- =========================================
CREATE TABLE cumplimiento (
    id_cumplimiento INT AUTO_INCREMENT PRIMARY KEY,
    id_habito INT NOT NULL,
    fecha DATE NOT NULL,
    completado BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_habito)
        REFERENCES habitos(id_habito)
        ON DELETE CASCADE
);

-- =========================================
-- TABLA: AVISOS
-- =========================================
CREATE TABLE avisos (
    id_aviso INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    mensaje VARCHAR(255) NOT NULL,
    tipo ENUM('automatico', 'personalizado') NOT NULL,
    fecha_programada DATETIME NOT NULL,
    estado ENUM('activo', 'expirado') DEFAULT 'activo',
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
);

-- =========================================
-- TABLA: PROGRESO
-- =========================================
CREATE TABLE progreso (
    id_progreso INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha DATE NOT NULL,
    porcentaje_cumplimiento DECIMAL(5,2),
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
);

-- =========================================
-- TABLA: CONFIGURACIÓN
-- =========================================
CREATE TABLE configuracion (
    id_configuracion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    notificaciones BOOLEAN DEFAULT TRUE,
    tema ENUM('claro', 'oscuro') DEFAULT 'claro',
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
);

-- =========================================
-- TABLA: RECUPERACIÓN DE CONTRASEÑA
-- =========================================
CREATE TABLE IF NOT EXISTS password_resets (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    correo        VARCHAR(150)  NOT NULL,
    codigo        CHAR(6)       NOT NULL,
    expira_en     DATETIME      NOT NULL,
    usado         BOOLEAN       DEFAULT FALSE,
    creado_en     DATETIME      DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_correo (correo)
);

-- =========================================
-- FIN DEL SCRIPT
-- =========================================