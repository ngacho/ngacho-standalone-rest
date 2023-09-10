FROM node:19
WORKDIR /Users/ngacho/Desktop/everything-code/web-dev-resources/web-pages/stand-alone-web-pages/stand-alone-rest
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD [ "npm", "start" ]