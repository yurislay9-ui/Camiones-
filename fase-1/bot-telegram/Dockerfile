# Usa una imagen base de Node.js con Alpine Linux para un tamaño reducido
FROM node:18-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia los archivos de definición del proyecto y de dependencias
COPY package*.json ./

# Instala las dependencias del proyecto
RUN npm install

# Copia el resto del código fuente
COPY . .

# Compila el código de TypeScript a JavaScript
RUN npm run build

# Asegúrate de que el script de entrada sea ejecutable
RUN chmod +x /usr/src/app/entrypoint.sh

# Establece el script de entrada como el punto de entrada del contenedor
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
