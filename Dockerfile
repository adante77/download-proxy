FROM node:16

#COPY dist /data/dist
COPY index.ts /data
COPY package.json /data
COPY package-lock.json /data
COPY node_modules /data/node_modules

WORKDIR /data

CMD sh -c "npx ts-node index.ts"