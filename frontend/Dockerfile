FROM node:12 as build
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY ./package*.json /app/
RUN npm install --silent
COPY . /app
RUN npm run build

FROM nginx:1.16.0-alpine
COPY --from=build /app/public /usr/share/nginx/html
COPY ./front.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
