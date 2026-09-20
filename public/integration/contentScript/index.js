console.log('DigiWage Light Wallet is installed.');

const injectInteractionScript = file => {
	let script = document.createElement('script');
	script.src = chrome.runtime.getURL(file);
	(document.head||document.documentElement).appendChild(script);
	script.onload = () => script.remove();
}

injectInteractionScript('integration/inpage/index.js');

function forwardToSDK(data) {
	window.postMessage({
		route: { wallet: 'digiwage', source: 'contentscript', target: 'SDK' },
		data
	}, '*');
}

// A chrome.runtime.Port stops working once the MV3 service worker it's
// connected to gets killed (Chrome does this after ~30s idle), which is
// easy to hit while e.g. a confirmation popup sits open waiting on the
// user. Reconnecting on demand instead of assuming one port lives forever
// for the page's whole lifetime.
let port = null;

function connectPort() {
	port = chrome.runtime.connect({name: 'digiwage-light-port'});
	port.onMessage.addListener(message => {
		console.log(message);
		forwardToSDK(message.data);
	});
	port.onDisconnect.addListener(() => {
		port = null;
	});
	return port;
}

connectPort();

// Message from background, delivered via chrome.tabs.sendMessage rather
// than the port -- used specifically for the sendToContract confirmation
// result, since that can arrive long after the port that started the
// request may have been torn down (see background/index.js).
chrome.runtime.onMessage.addListener(message => {
	if (!message || !message.route || message.route.wallet !== 'digiwage'
		|| message.route.source !== 'background' || message.route.target !== 'contentscript') {
		return;
	}
	forwardToSDK(message.data);
});

// Message from SDK
window.addEventListener('message', message => {
	const { data } = message;
	if (!data.route || data.route.wallet !== 'digiwage'
		|| data.route.source !== 'SDK'
		|| data.route.target !== 'contentscript') {
		return;
	}

	const forward = () => (port || connectPort()).postMessage({
		route: { wallet: 'digiwage', source: 'contentscript', target: 'background' },
		data: data.data
	});

	try {
		forward();
	} catch (err) {
		// port died between the null-check and use; reconnect and retry once
		connectPort();
		forward();
	}
});
