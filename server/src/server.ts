import express from "express"
import http from "http"
import {Server, Socket} from "socket.io"
import {DefaultEventsMap} from "socket.io/dist/typed-events";
import { fileURLToPath } from 'node:url';
import Bree from "bree";
import * as path from "path";
import {loadJSON, saveJSON} from "./utils/json.js";
import basicAuth from "express-basic-auth"
import fs from "fs";
import * as process from "process";

/* Initialize Express and Socket.io */

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: process.env.NODE_ENV === 'development' ? {
    origin: "http://localhost:8080"
  } : undefined
})

/* Configure basic authentication on Express endpoints */
if(process.env.NODE_ENV !== 'development') {
  const basicAuthMiddleware = basicAuth({
    authorizer: (username, password, callback) => {
      loadJSON(new URL('../settings.json', import.meta.url))
          .then(settings => {
            if(settings.login[username] && settings.login[username] === password) {
              callback(null, true)
            }
            else {
              callback(null, false)
            }
          })
          .catch(() => callback(null, false))
    },
    authorizeAsync: true,
    challenge: true
  })
  app.use(basicAuthMiddleware)
  io.use((socket, next) => {
    // @ts-ignore
    basicAuthMiddleware(socket.request, {
      set: () => {},
      status: (code) => {
        return {
          send: () => {next(new Error('unauthorized'))},
          json: () => {next(new Error('unauthorized'))}
        }
      }
    }, next)
  })
}


/* Configure Express endpoints */

app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist')))

/* Define state of the server */

const connectedClients = [] as Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>[]
const machineStatusCache = new Map<string, string>()
const workerUptime = new Map<string, Date>()

const serverLog = [] as string[]
// @ts-ignore
process.stdout.write = (function(write) {
  return function(buffer, encoding, fileDescriptor) {
    const log = typeof buffer === 'string' ? buffer : new TextDecoder().decode(buffer)

    serverLog.push(log)
    if(serverLog.length > 100) serverLog.shift()

    connectedClients.forEach(socket => socket.emit('log', log))

    write.apply(process.stdout, arguments)
  }
})(process.stdout.write)

/* Inizialize Bree.js */

let bree = new Bree({
  root: path.join(path.dirname(fileURLToPath(import.meta.url)), 'jobs'),
  doRootCheck: false,
  removeCompleted: false,
  workerMessageHandler: (message) => {
    try {
      message = JSON.parse(message.message)
      if (message.type === 'vm_status_update') {
        for(const id in message.statuses) {
          machineStatusCache.set(`${message.cluster}-${id}`, message.statuses[id])
        }
        connectedClients.forEach(client => {
          client.emit('vm_status_update', {cluster: message.cluster, statuses: message.statuses})
        })
      } else {
        console.error('UNKNOWN MESSAGE')
        console.log(message)
      }
    }
    catch (e) {}
  }
})

/* Actions - Job related */

async function loadJobs() {
  await bree.stop()
  for(const job of bree.config.jobs) {
    await bree.remove(job.name)
  }

  const clusters = await loadJSON(new URL('../clusters.json', import.meta.url)) as any[]
  const schedules = await loadJSON(new URL('../schedules.json', import.meta.url)) as any[]

  for(const cluster of clusters) {
    await bree.add({
      name: `refresh-${cluster.name}`,
      path: path.join(path.dirname(fileURLToPath(import.meta.url)), 'jobs/load-status.js'),
      interval: 60*1000,
      worker: {
        argv: [cluster.name]
      }
    })
    // Not starting it is intentional: establishing connections will start it
    if(connectedClients.length > 0) {
      await bree.start(`refresh-${cluster.name}`)
      await bree.run(`refresh-${cluster.name}`)
    }

    const now= new Date()
    const schedule = (schedules.find(s => s.name === cluster.name) || { schedule: [] }).schedule
    for(const s of schedule) {
      const dateToString = (d: Date) => `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`
      const from = new Date(s.from)
      const to = new Date(s.to)

      if(from.getTime() > now.getTime()) {
        await bree.add({
          name: `start-${cluster.name}-${dateToString(from)}`,
          path: path.join(path.dirname(fileURLToPath(import.meta.url)), 'jobs/start-cluster.js'),
          date: from,
          worker: {
            argv: [cluster.name]
          }
        })
        await bree.start(`start-${cluster.name}-${dateToString(from)}`)
      }

      if(to.getTime() > now.getTime()) {
        await bree.add({
          name: `stop-${cluster.name}-${dateToString(to)}`,
          path: path.join(path.dirname(fileURLToPath(import.meta.url)), 'jobs/stop-cluster.js'),
          date: to,
          worker: {
            argv: [cluster.name]
          }
        })
        await bree.start(`stop-${cluster.name}-${dateToString(to)}`)
      }

      const killDate = new Date(to)
      killDate.setMinutes(killDate.getMinutes() + 30)
      if(killDate.getTime() > now.getTime()) {
        await bree.add({
          name: `kill-${cluster.name}-${dateToString(killDate)}`,
          path: path.join(path.dirname(fileURLToPath(import.meta.url)), 'jobs/kill-cluster.js'),
          date: killDate,
          worker: {
            argv: [cluster.name]
          }
        })
        await bree.start(`kill-${cluster.name}-${dateToString(killDate)}`)
      }
    }
  }
}

async function startRefresh() {
  const clusters = await loadJSON(new URL('../clusters.json', import.meta.url)) as any[]
  for(const cluster of clusters) {
    try {
      await bree.start(`refresh-${cluster.name}`)
      await bree.run(`refresh-${cluster.name}`)
    }
    catch (e) {
      console.log(e)
    }
  }
}

async function stopRefresh() {
  const clusters = await loadJSON(new URL('../clusters.json', import.meta.url)) as any[]
  for(const cluster of clusters) {
    await bree.stop(`refresh-${cluster.name}`)
    machineStatusCache.clear()
  }
}

async function getJobs(socket: Socket) {
  socket.emit('jobs', bree.config.jobs.map(job => ({
    name: job.name,
    interval: job.interval,
    date: job.date?.toISOString(),
    uptime: workerUptime.get(job.name)?.toISOString()
  })))
}

async function startJob(job: string) {
  await bree.run(job)
}

/* Actions - cluster related */

async function getClusters(socket: Socket) {
  const clusters = await loadJSON(new URL('../clusters.json', import.meta.url)) as any[]
  const schedules = await loadJSON(new URL('../schedules.json', import.meta.url)) as any[]
  socket.emit('clusters', clusters.map(cluster => ({
    ...cluster,
    login: undefined,
    machines: cluster.machines.map(machine => ({
      ...machine,
      state: machineStatusCache.get(`${cluster.name}-${machine.id}`) || 'loading'
    })),
    schedule: (schedules.find(s => s.name === cluster.name) || { schedule: [] }).schedule
  })))
}

async function startCluster(clusterName: string) {
  try {
    await bree.add({
      name: `start-${clusterName}-manual`,
      path: path.join(path.dirname(fileURLToPath(import.meta.url)), 'jobs/start-cluster.js'),
      worker: {
        argv: [clusterName]
      }
    })
    await bree.run(`start-${clusterName}-manual`)
  }
  catch(e) {
    console.log(e)
  }
}

async function stopCluster(clusterName: string) {
  try {
    await bree.add({
      name: `stop-${clusterName}-manual`,
      path: path.join(path.dirname(fileURLToPath(import.meta.url)), 'jobs/stop-cluster.js'),
      worker: {
        argv: [clusterName]
      }
    })
    await bree.run(`stop-${clusterName}-manual`)
  }
  catch(e) {
    console.log(e)
  }
}

async function overrideSchedules(socket: Socket, schedules) {
  await saveJSON(new URL('../schedules.json', import.meta.url), schedules)
  await loadJobs()
  await getClusters(socket)
}

/* Actions - Settings related */

async function getJsons(socket: Socket) {
  const clusters = (await fs.promises.readFile(new URL('../clusters.json', import.meta.url))).toString()
  const schedules = (await fs.promises.readFile(new URL('../schedules.json', import.meta.url))).toString()
  const settings = (await fs.promises.readFile(new URL('../settings.json', import.meta.url))).toString()

  socket.emit('jsons', {
    clusters,
    schedules,
    settings
  })
}

async function setJsons(socket: Socket, { clusters, schedules, settings }: { clusters: string, schedules: string, settings: string }) {
  await fs.promises.writeFile(new URL('../clusters.json', import.meta.url), clusters)
  await fs.promises.writeFile(new URL('../schedules.json', import.meta.url), schedules)
  await fs.promises.writeFile(new URL('../settings.json', import.meta.url), settings)

  await getJsons(socket)
  await loadJobs()
  connectedClients.forEach(getSettings)
}

async function getSettings(socket: Socket) {
  const settings = await loadJSON(new URL('../settings.json', import.meta.url))

  socket.emit('settings', {
    ...settings,
    login: undefined
  })
}

/* Actions - Log related */

async function getLogs(socket: Socket) {
  socket.emit('logs', serverLog)
}

/* Main function */

bree.on('worker created', (name) => {
  workerUptime.set(name, new Date())
  connectedClients.forEach(getJobs)
});

bree.on('worker deleted', (name) => {
  workerUptime.delete(name)
  connectedClients.forEach(getJobs)
});

await loadJobs()

io.on('connection', async (socket) => {
  console.log('connection opened', connectedClients.length);
  connectedClients.push(socket)

  /* If this is the first connection, start the refresh tasks */
  if(connectedClients.length === 1) {
    await startRefresh()
  }

  socket.on('get_clusters', async () => getClusters(socket))
  socket.on('start_cluster', async (clusterName) => startCluster(clusterName))
  socket.on('stop_cluster', async (clusterName) => stopCluster(clusterName))
  socket.on('override_schedules', async (schedules) => overrideSchedules(socket, schedules))

  socket.on('get_jobs', async () => getJobs(socket))
  socket.on('start_job', async (job) => startJob(job))

  socket.on('get_logs', async () => getLogs(socket))

  socket.on('get_jsons', async () => getJsons(socket))
  socket.on('set_jsons', async (jsons) => setJsons(socket, jsons))
  socket.on('reload_jobs', async () => loadJobs())
  socket.on('get_settings', async () => getSettings(socket))

  socket.on('disconnect', async (reason) => {
    console.log('connection closed', reason);
    connectedClients.splice(connectedClients.indexOf(socket))

    /* If no more connection remain, stop the refresh tasks */
    if(connectedClients.length === 0) {
      await stopRefresh()
    }
  })
});

server.listen(5000, () => {
  console.log('listening on *:5000')
});