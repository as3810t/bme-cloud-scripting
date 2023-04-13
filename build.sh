#!/bin/bash

cd client
npm run build-client
cd ../server
cp -R -u -p clusters.default.json clusters.json
cp -R -u -p schedules.default.json schedules.json
npm run build-server