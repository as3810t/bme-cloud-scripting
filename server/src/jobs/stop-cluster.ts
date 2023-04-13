import {parentPort} from "worker_threads";
import puppeteer from "puppeteer";
import {getVMStatuses, login, stopVMs} from "../utils/cloud.js";
import {loadJSON} from "../utils/json.js";

(async () => {
  const cloudName = process.argv[2] as string

  const clusters = await loadJSON(new URL('../../clusters.json', import.meta.url)) as any[]
  const cluster = clusters.find(c => c.name === cloudName)!

  const browser = await puppeteer.launch()

  try {
    await login(browser, cluster.url, cluster.login)

    const vmStatuses = await getVMStatuses(browser, cluster.url, cluster.machines.map(m => m.id))
    const vmsToStop = [] as string[]
    for(const id in vmStatuses) {
      if(vmStatuses[id] === 'running') vmsToStop.push(id)
      else console.log(`${cluster.name} ${id} is not running`)
    }

    await stopVMs(browser, cluster.url, vmsToStop, 10, 5000)
  }
  finally {
    await browser.close()
  }

  process.exit(0);
})();