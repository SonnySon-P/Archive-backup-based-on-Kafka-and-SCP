FROM node:latest

USER root

RUN apt-get update && apt-get install -y \
    curl gnupg2 lsb-release \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g nodemon dotenv multer mongodb bcrypt jsonwebtoken cors

WORKDIR /root

CMD ["/bin/sh"]