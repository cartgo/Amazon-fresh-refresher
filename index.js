const fs = require('fs');
const path = require('path');

const { username, password } = JSON.parse(fs.readFileSync(require.resolve('./config.json')));

const puppeteer = require('puppeteer-core');

const URL_FRESH = 'https://www.amazon.com/gp/buy/shipoptionselect/handlers/display.html?hasWorkingJavascript=1';
const URL_HOMEPAGE = 'https://www.amazon.com';
const CHECK_INTERVAL_MIN_RANGE = [ 1, 5 ]; // 1 - 5min

function waitAndClick(page, selector, waitOptions = {}, clickOptions = {}) {
	console.log('clicking on', selector);
	return Promise.all([
		page.click(selector, clickOptions),
		page.waitForNavigation({ waitUntil: [ 'networkidle0' ], ...waitOptions })
	]).catch(() => {
		page.screenshot({
			fullPage: true,
			path: path.join(
				__dirname,
				`screenshot${new Date()
					.toLocaleString()
					.replace(',', '')
					.replace(/:/g, '_')
					.replace(/\ /g, '_')
					.replace(/\\|\//g, '-')}.png`
			)
		});
	});
}

async function waitAndFunc(page, func) {
	await page.waitForNavigation({ waitUntil: [ 'networkidle0' ] });
	await func();
}

async function crawl() {
	// const browser = await puppeteer.launch({ headless: false }); // headless as false
	let browser;
	if (process.platform === 'win32') browser = await puppeteer.launch({ headless: false });
	else if (process.platform === 'linux')
		// for linux. install with `sudo apt install chromium-browser`
		browser = await puppeteer.launch({ executablePath: 'chromium-browser' }); // for linux. install with `sudo apt install chromium-browser`
	const page = await browser.newPage();
	await page.goto(URL_HOMEPAGE);

	await waitAndClick(page, '#nav-signin-tooltip > a > span');

	// await waitAndFunc(page, async () => {
	// 	await page.keyboard.type(username, { delay: 100 });
	// });

	await page.keyboard.type(username, { delay: 100 });
	// await page.waitForNavigation();
	// await page.keyboard.type(username);

	await waitAndClick(page, '#continue');

	// await waitAndFunc(page, async () => {
	// 	await page.keyboard.type(password, { delay: 100 });
	// });

	await page.keyboard.type(password, { delay: 100 });

	await waitAndClick(page, '#auth-signin-button');

	await waitAndClick(page, '#nav-cart');

	await waitAndClick(page, 'input[name ^= "proceedToALMCheckout"]');

	await waitAndClick(page, 'a[name="proceedToCheckout"]');

	while (1) {
		console.log('current URL:', page.url());
		await intervalFunc(page, browser);
		const intervalMin =
			Math.round(
				(CHECK_INTERVAL_MIN_RANGE[0] + CHECK_INTERVAL_MIN_RANGE[1] * Math.random() + Number.EPSILON) * 100
			) / 100;
		console.log(`next check will be in ${intervalMin} mins`);

		await new Promise(function(resolve) {
			setTimeout(resolve, 1000 * 60 * intervalMin);
		});
	}
	// setInterval(() => intervalFunc(page), CHECK_INTERVAL);

	console.log();
	// await browser.close();
}

async function checkIfElementExist(page, selector) {
	try {
		await page.waitForSelector(selector, { timeout: 5000 });
		return true;
	} catch (error) {
		return false;
	}
}

async function checkProcess(page) {
	await page.reload({ waitUntil: [ 'networkidle0', 'domcontentloaded' ] });
	return await !checkIfElementExist(page, '.ufss-slotselect-unavailable-alert-container');
}

async function intervalFunc(page, browser) {
	const hasSlot = await checkProcess(page);
	const pageCorrect = await checkIfElementExist(page, '[class^="ufss"]');
	if (pageCorrect) {
		if (hasSlot) {
			console.log('has slot!!!!!!');
		} else {
			console.log('no slot');
		}
	} else {
		await browser.close();
		crawl();
	}
}
crawl();
