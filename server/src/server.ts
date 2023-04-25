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

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: process.env.NODE_ENV === 'development' ? {
    origin: "http://localhost:8080"
  } : undefined
})

app.use(basicAuth({
  authorizer: (username, password, callback) => {
    loadJSON(new URL('../settings.json', import.meta.url))
      .then(settings => {
        console.log(settings, username, password)
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
}))

app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist')))

const connectedClients = [] as Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>[]
const machineStatusCache = new Map<string, string>()
const workerUptime = new Map<string, Date>()

let bree = new Bree({
  root: path.join(path.dirname(fileURLToPath(import.meta.url)), 'jobs'),
  doRootCheck: false,
  removeCompleted: true,
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
});

async function getLogs(socket: Socket) {
  socket.emit('logs', bree.config.jobs.map(job => ({
    name: job.name,
    interval: job.interval,
    date: job.date?.toISOString(),
    uptime: workerUptime.get(job.name)?.toISOString()
  })))
}

bree.on('worker created', (name) => {
  workerUptime.set(name, new Date())
  connectedClients.forEach(getLogs)
});

bree.on('worker deleted', (name) => {
  workerUptime.delete(name)
  connectedClients.forEach(getLogs)
});

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
await loadJobs()

io.on('connection', async (socket) => {
  console.log('connection opened', connectedClients.length);
  connectedClients.push(socket)

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

  async function getClusters() {
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

  async function overrideSchedules(schedules) {
    await saveJSON(new URL('../schedules.json', import.meta.url), schedules)
    await loadJobs()
    await getClusters()
  }

  async function getJsons() {
    const clusters = (await fs.promises.readFile(new URL('../clusters.json', import.meta.url))).toString()
    const schedules = (await fs.promises.readFile(new URL('../schedules.json', import.meta.url))).toString()
    const settings = (await fs.promises.readFile(new URL('../settings.json', import.meta.url))).toString()

    socket.emit('jsons', {
      clusters,
      schedules,
      settings
    })
  }

  async function setJsons({ clusters, schedules, settings }: { clusters: string, schedules: string, settings: string }) {
    await fs.promises.writeFile(new URL('../clusters.json', import.meta.url), clusters)
    await fs.promises.writeFile(new URL('../schedules.json', import.meta.url), schedules)
    await fs.promises.writeFile(new URL('../settings.json', import.meta.url), settings)

    await getJsons()
    await loadJobs()
  }

  async function reloadJobs() {
    await loadJobs()
  }

  /* If this is the first connection, start the refresh tasks */
  if(connectedClients.length === 1) {
    await startRefresh()
  }

  socket.on('get_clusters', getClusters)
  socket.on('start_cluster', startCluster)
  socket.on('stop_cluster', stopCluster)
  socket.on('override_schedules', overrideSchedules)
  socket.on('get_logs', async () => getLogs(socket))
  socket.on('get_jsons', getJsons)
  socket.on('set_jsons', setJsons)
  socket.on('reload_jobs', reloadJobs)

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