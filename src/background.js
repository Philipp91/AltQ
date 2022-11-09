let tabHistory = {};
let currentTabId;

function init() {
	tabHistory[-1] = {id: null}; // Dummy start.

	chrome.tabs.query({
		active: true,
		lastFocusedWindow: true,
	}, function(tab) {
		currentTabId = tab[0].id;
		tabHistory[currentTabId] = {id: currentTabId, prev: tabHistory[-1]};
		tabHistory[-1].next = tabHistory[currentTabId];
		validateHistory();
	});
}

chrome.action.onClicked.addListener(function(tab) {
	let prevTab = tabHistory[currentTabId].prev;
	if (prevTab.id) { // Check if is dummy start.
		chrome.tabs.update(prevTab.id, {active: true});
	}
});

chrome.tabs.onActivated.addListener(function(info) {
	if (info.tabId === currentTabId) {
		return;
	}

	let prevTabId = currentTabId || -1; // Might be dummy start.
	currentTabId = info.tabId;

	if (!tabHistory.hasOwnProperty(currentTabId)) { // Newly visited tab.
		tabHistory[currentTabId] = {id: currentTabId};
	}
	let currentTab = tabHistory[currentTabId];
	if (currentTab.prev) {
		currentTab.prev.next = currentTab.next;
		currentTab.next.prev = currentTab.prev;
	}

	let prevTab = tabHistory[prevTabId];
	prevTab.next = currentTab;
	currentTab.prev = prevTab;
	delete currentTab.next;
	validateHistory();
});

chrome.tabs.onRemoved.addListener(function(tabId, info) {
	if (tabHistory.hasOwnProperty(tabId)) { // Visited tab.
		// Remove tab from `tabHistory`.
		let removedTab = tabHistory[tabId];
		if (tabId === currentTabId) {
			// Current tab is removed. Switch to the last tab.
			delete removedTab.prev.next;
			currentTabId = removedTab.prev.id;
		} else {
			removedTab.prev.next = removedTab.next;
			removedTab.next.prev = removedTab.prev;
		}
		delete tabHistory[tabId];
	}
	validateHistory();
});

function validateHistory() {
	let current = tabHistory[-1];
	let path = current.id;
	while (current.next) {
		if (current.next.prev !== current) {
			console.error("Broken history!");
			console.error(currentTabId, tabHistory);
			return;
		}
		current = current.next;
		path = path + " => " + current.id;
	}
	console.debug(path);
}

init();
