{ pkgs, ... }: {
  # Declaramos los paquetes que necesita nuestro entorno
  packages = [
    pkgs.nodejs_20  # Mantenemos Node.js para el bot
    pkgs.docker       # Añadimos el motor de Docker
    pkgs.docker-compose # Añadimos Docker Compose
  ];
}
