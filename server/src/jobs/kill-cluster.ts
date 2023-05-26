import {parentPort} from "worker_threads";
import puppeteer from "puppeteer";
import {getVMStatuses, killVMs, launchBrowser, login, stopVMs} from "../utils/cloud.js";
import {loadJSON} from "../utils/json.js";

(async () => {
  const cloudName = process.argv[2] as string

  const clusters = await loadJSON(new URL('../../clusters.json', import.meta.url)) as any[]
  const cluster = clusters.find(c => c.name === cloudName)!

  await launchBrowser(async (browser) => {
    await login(browser, cluster.url, cluster.login)

    const vmStatuses = await getVMStatuses(browser, cluster.url, cluster.machines.map(m => m.id))
    const vmsToKill = [] as string[]
    for(const id in vmStatuses) {
      if(vmStatuses[id] !== 'stopped') vmsToKill.push(id)
      else console.log(`${cluster.name} ${id} is already stopped`)
    }

    await killVMs(browser, cluster.url, vmsToKill, 10, 60000)
  })

  process.exit(0);
})();