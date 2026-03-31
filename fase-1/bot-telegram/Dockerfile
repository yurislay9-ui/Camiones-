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

# Expone el puerto en el que correrá el bot (opcional, buena práctica)
# EXPOSE 3000

# Comando para ejecutar la aplicación compilada
CMD [ "node", "dist/index.js" ]
