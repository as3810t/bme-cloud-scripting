import {parentPort} from "worker_threads";
import puppeteer from "puppeteer";
import {
  getVMStatuses,
  historyOfCPUUsage, historyOfRAMAllocation,
  historyOfRAMUsage,
  historyOfRunningVMs,
  launchBrowser,
  login
} from "../utils/cloud.js";
import {loadJSON} from "../utils/json.js";

(async () => {
  const cloudName = process.argv[2] as string

  const clusters = await loadJSON(new URL('../../clusters.json', import.meta.url)) as any[]
  const cluster = clusters.find(c => c.name === cloudName)!

  await launchBrowser(async (browser) => {
    await login(browser, cluster.url, cluster.login)

    const vmStatuses = await getVMStatuses(browser, cluster.url, cluster.machines.map(m => m.id))

    const statistics = cluster.graphiteAPI ? {
      last10m: {
        vmCount: await historyOfRunningVMs(cluster.url, 'last10m'),
        ramUsage: await historyOfRAMUsage(cluster.url, 'last10m'),
        cpuUsage: await historyOfCPUUsage(cluster.url, 'last10m'),
        ramAllocated: await historyOfRAMAllocation(cluster.url, 'last10m')
      }/*,
      last5d: {
        vmCount: await historyOfRunningVMs(cluster.url, 'last5d'),
        ramUsage: await historyOfRAMUsage(cluster.url, 'last5d'),
        cpuUsage: await historyOfCPUUsage(cluster.url, 'last5d'),
        ramAllocated: await historyOfRAMAllocation(cluster.url, 'last5d')
      }*/
    } : {}

    if (parentPort) parentPort.postMessage(JSON.stringify({ type: 'vm_status_update', cluster: cloudName, statuses: vmStatuses, statistics }))
  })

  process.exit(0);
})();