import {parentPort} from "worker_threads";
import puppeteer from "puppeteer";
import {getVMStatuses, login} from "../utils/cloud.js";
import {loadJSON} from "../utils/json.js";

(async () => {
  const cloudName = process.argv[2] as string

  const clusters = await loadJSON(new URL('../../clusters.json', import.meta.url)) as any[]
  const cluster = clusters.find(c => c.name === cloudName)!

  const browser = await puppeteer.launch()

  try {
    await login(browser, cluster.url, cluster.login)

    const vmStatuses = await getVMStatuses(browser, cluster.url, cluster.machines.map(m => m.id))
    if (parentPort) parentPort.postMessage(JSON.stringify({ type: 'vm_status_update', cluster: cloudName, statuses: vmStatuses }))
  }
  finally {
    await browser.close()
  }

  process.exit(0);
})();