// Keyed by window ID, contains list of tab IDs, last one is the current tab in
// the respective window.
const tabHistoryPerWindow = {};
const getTabHistory = (windowId) => {
	const history = tabHistoryPerWindow[windowId];
	return history || (tabHistoryPerWindow[windowId] = []);
};
const saveHistory = (windowId, tabHistory) => {
	chrome.storage.local.set({[windowId]: tabHistory});
};
const removeFromHistoryIfPresent = (tabHistory, tabId) => {
	const oldIndex = tabHistory.indexOf(tabId);
	if (oldIndex > -1) tabHistory.splice(oldIndex, 1);
};
const pushToBackOfHistory = (tabHistory, tabId) => {
	removeFromHistoryIfPresent(tabHistory, tabId);
	tabHistory.push(tabId);
}

// Pop newly activated tabs to the back of the history.
const onTabActivated = (windowId, tabId) => {
	const tabHistory = getTabHistory(windowId);
	if (tabHistory.length && tabHistory[tabHistory.length - 1] === tabId) return;
	pushToBackOfHistory(tabHistory, tabId);
	saveHistory(windowId, tabHistory);
};

// Remove closed tabs from the history.
const onTabClosed = (windowId, tabId) => {
	const tabHistory = getTabHistory(windowId);
	removeFromHistoryIfPresent(tabHistory, tabId);
	saveHistory(windowId, tabHistory);
};

// This is the init function, executed when the service worker is loaded. This
// happens when the extension is first installed/activated, when Chrome is
// started, or when the extension's service worker has been suspended for a
// while and is now being restarted because something is happening.
const initialized = (async () => {
	// Load the history from storage for windows that still exist. Delete history
	// of windows that are gone. Remove tabs from history that are gone.
	const windowIds = new Set((await chrome.windows.getAll()).map(w => w.id));
	const tabIds = new Set((await chrome.tabs.query({})).map(t => t.id));
	const loadedHistory = await chrome.storage.local.get(null);
	for (const [windowId, history] of Object.entries(loadedHistory)) {
		if (windowIds.has(Number(windowId))) {
			tabHistoryPerWindow[windowId] = history.filter(id => tabIds.has(id));
		} else {
			chrome.storage.local.remove(windowId);
		}
	}

	// Make sure the currently active tab is at the end of its window's history.
	for (const tab of await chrome.tabs.query({active: true})) {
		onTabActivated(tab.windowId, tab.id);
	}
})();

chrome.tabs.onActivated.addListener(async ({windowId, tabId}) => {
	await initialized;
	onTabActivated(windowId, tabId);
});

chrome.tabs.onRemoved.addListener(async (tabId, {windowId}) => {
	await initialized;
	onTabClosed(windowId, tabId);
});

// When the extension is activated, switch back to the second-to-last entry in
// the history, which is the tab that was active before the current one.
chrome.action.onClicked.addListener(async (tab) => {
	await initialized;
	const tabHistory = getTabHistory(tab.windowId);
	if (tabHistory.length > 1) {
		chrome.tabs.update(tabHistory[tabHistory.length - 2], {active: true});
	}
});
