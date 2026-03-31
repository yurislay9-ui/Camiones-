# Plan de Trabajo del Proyecto LogiCuba

Este plan de trabajo se basa en el roadmap de implementación descrito en el documento oficial del proyecto.

## Fase 1: MVP Mínimo (Semanas 1-3)

*   **Objetivo:** Validar que los camioneros usarían el servicio.
*   **Semana 1:**
    *   Configurar Oracle Cloud, Docker, PostgreSQL, Redis y Cloudflare Tunnel.
    *   Crear el Bot de Telegram inicial.
*   **Semana 2:**
    *   Desarrollar la lógica de matching básica.
    *   Implementar los pagos manuales (con verificación del administrador).
*   **Semana 3:**
    *   Realizar pruebas con un grupo cerrado de beta testers.
    *   Ajustar la funcionalidad según los comentarios.
*   **Resultado Esperado:** Un Bot de Telegram funcional con matching automático y pagos manuales.

## Fase 2: Automatización (Semanas 4-6)

*   **Semana 4:**
    *   Configurar el dispositivo Xiaomi como receptor de SMS.
    *   Crear el módulo de validación automática de pagos a través de SMS.
*   **Semana 5:**
    *   Configurar Evolution API para la integración con WhatsApp.
    *   Diseñar e implementar los flujos de conversación en Typebot.
*   **Semana 6:**
    *   Integrar todos los componentes (WhatsApp, Telegram, pagos automáticos).
    *   Realizar pruebas exhaustivas de la integración.
*   **Resultado Esperado:** Canales de WhatsApp y Telegram totalmente funcionales con pagos automáticos.

## Fase 3: Robustez (Semanas 7-10)

*   **Semana 7:**
    *   Implementar un sistema anti-ban completo para WhatsApp.
    *   Configurar un sistema de alertas para los administradores.
*   **Semana 8:**
    *   Desarrollar e implementar el protocolo offline para zonas sin cobertura.
    *   Implementar un sistema de calificación (rating) para usuarios.
*   **Semana 9:**
    *   Desarrollar el modelo de suscripción premium.
    *   Configurar backups automáticos de la base de datos.
*   **Semana 10:**
    *   Optimizar el rendimiento del sistema.
    *   Implementar herramientas de monitoreo.
*   **Resultado Esperado:** Un sistema robusto, resiliente y escalable.

## Fase 4: Crecimiento (Meses 4-12)

*   Desarrollar un dashboard web para la administración del sistema.
*   Implementar un sistema de analíticas para visualizar rutas populares, ingresos, etc.
*   Expandir las operaciones a todas las provincias de Cuba.
*   Planificar y ejecutar la migración a la API oficial de WhatsApp Business.
*   Explorar la creación de una Mini App de Telegram.
