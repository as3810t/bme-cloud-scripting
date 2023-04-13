import {Browser} from 'puppeteer';
import {delay} from "./delay.js";

export const login = async (browser: Browser, cloudUrl: string, login: { type: 'user', userName: string, password: string } | { type: 'eduId', eduId: string, password: string })=> {
  if (login.type === 'user') {
    await loginViaCircle(browser, cloudUrl, login.userName, login.password)
  } else if (login.type === 'eduId') {
    await loginViaEduId(browser, cloudUrl, login.eduId, login.password)
  } else {
    console.log('Unknown login protocol')
  }
}

export const loginViaEduId = async (browser: Browser, cloudUrl: string, eduId: string, password: string) => {
  // Create a page
  const page = await browser.newPage();

  // Go to your site
  await page.goto(cloudUrl);

  // Query for EDU ID login button
  const eduIdLoginButton = (await page.waitForSelector('img[src="/static/eduid.png"]'))!;
  await eduIdLoginButton.click();
  await eduIdLoginButton.dispose();

  // Query for címtár username
  const usernameTextInput = (await page.waitForSelector('#login-form_username'))!;
  await usernameTextInput.type(eduId);
  await usernameTextInput.dispose();

  // Query for címtár password
  const passwordTextInput = (await page.waitForSelector('#login-form_password'))!;
  await passwordTextInput.type(password);
  await passwordTextInput.dispose();

  // Query for címtár login button
  const loginButton = (await page.waitForSelector('#login-submit-button'))!;
  await loginButton.click();
  await loginButton.dispose();
}

export const loginViaCircle = async (browser: Browser, cloudUrl: string, userName: string, password: string) => {
  // Create a page
  const page = await browser.newPage();

  // Go to your site
  await page.goto(cloudUrl);

  // Query for username
  const usernameTextInput = (await page.waitForSelector('#id_username'))!;
  await usernameTextInput.type(userName);
  await usernameTextInput.dispose();

  // Query for password
  const passwordTextInput = (await page.waitForSelector('#id_password'))!;
  await passwordTextInput.type(password);
  await passwordTextInput.dispose();

  // Query for login button
  const loginButton = (await page.waitForSelector('#submit-id-submit'))!;
  await loginButton.click();
  await loginButton.dispose();
}

export type VMStatus = 'running' | 'stopped'

export const getVMStatuses = async (browser: Browser, cloudUrl: string, ids: string[]) => {
  // Create a page
  const page = await browser.newPage();

  // Go to your site
  await page.goto(`${cloudUrl}/dashboard/vm/list`);

  // Wait for page load
  const vmTable = (await page.waitForSelector('.vm-list-table'))!
  await vmTable.dispose()

  const result = {} as { [id: string]: VMStatus }
  for(const id of ids) {
    const stateCell = await page.$(`.vm-list-table tr[data-vm-pk="${id}"] td.state span`)
    result[id] = await stateCell?.evaluate(s => s.textContent) as VMStatus
  }

  await page.close()

  return result
}

export const startVMs = async (browser: Browser, cloudUrl: string, ids: string[], batchSize: number, batchDelayMs: number) => {
  let counter = 1
  for(const id of ids) {
    // Only stop batchSize machines each batchDelayMs milliseconds
    if(counter % batchSize === 0) {
      await delay(batchDelayMs)
    }

    console.log(`${cloudUrl}: starting ${id}`)
    const page = await browser.newPage()
    await page.goto(`${cloudUrl}/dashboard/vm/${id}/op/deploy`)

    // Click confirm button
    const confirmButton = (await page.waitForSelector('#op-form-send'))!
    await confirmButton.click()
    await confirmButton.dispose()

    // Wait for page load
    const vmInfoPanel = (await page.waitForSelector('#vm-info-pane'))!
    await vmInfoPanel.dispose()

    await page.close()

    counter++
  }
}

export const stopVMs = async (browser: Browser, cloudUrl: string, ids: string[], batchSize: number, batchDelayMs: number) => {
  let counter = 1
  for(const id of ids) {
    // Only stop batchSize machines each batchDelayMs milliseconds
    if(counter % batchSize === 0) {
      await delay(batchDelayMs)
    }

    console.log(`${cloudUrl}: stopping ${id}`)
    const page = await browser.newPage()
    await page.goto(`${cloudUrl}/dashboard/vm/${id}/op/shutdown`)

    // Click confirm button
    const confirmButton = (await page.waitForSelector('#op-form-send'))!
    await confirmButton.click()
    await confirmButton.dispose()

    // Wait for page load
    const vmInfoPanel = (await page.waitForSelector('#vm-info-pane'))!
    await vmInfoPanel.dispose()

    await page.close()

    counter++
  }
}

export const killVMs = async (browser: Browser, cloudUrl: string, ids: string[], batchSize: number, batchDelayMs: number) => {
  let counter = 1
  for(const id of ids) {
    // Only stop batchSize machines each batchDelayMs milliseconds
    if(counter % batchSize === 0) {
      await delay(batchDelayMs)
    }

    console.log(`${cloudUrl}: killing ${id}`)
    const page = await browser.newPage()
    await page.goto(`${cloudUrl}/dashboard/vm/${id}/op/shut_off`)

    // Click confirm button
    const confirmButton = (await page.waitForSelector('#op-form-send'))!
    await confirmButton.click()
    await confirmButton.dispose()

    // Wait for page load
    const vmInfoPanel = (await page.waitForSelector('#vm-info-pane'))!
    await vmInfoPanel.dispose()

    await page.close()

    counter++
  }
}