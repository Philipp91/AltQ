// Keyed by window ID, contains list of tab IDs, last one is the current tab in
// the respective window.
const tabHistoryPerWindow = {};
const getTabHistory = (windowId) => {
	const history = tabHistoryPerWindow[windowId];
	return history || (tabHistoryPerWindow[windowId] = []);
};
const pushToHistory = (tabHistory, tabId) => tabHistory.push(tabId);
const removeFromHistoryIfPresent = (tabHistory, tabId) => {
	const oldIndex = tabHistory.indexOf(tabId);
	if (oldIndex > -1) tabHistory.splice(oldIndex, 1);
};

// Initially, add the currently active tab to the history.
chrome.tabs.query({
	active: true,
	lastFocusedWindow: true,
}, (tabs) => {
	pushToHistory(getTabHistory(tabs[0].windowId), tabs[0].id);
});

// Pop newly activated tabs to the back of the history.
chrome.tabs.onActivated.addListener((info) => {
	const tabHistory = getTabHistory(info.windowId);
	removeFromHistoryIfPresent(tabHistory, info.tabId);
	pushToHistory(tabHistory, info.tabId);
});

// Remove closed tabs from the history.
chrome.tabs.onRemoved.addListener((tabId, info) => {
	removeFromHistoryIfPresent(getTabHistory(info.windowId), tabId);
});

// When the extension is activated, switch back to the second-to-last entry in
// the history, which is the tab that was active before the current one.
chrome.action.onClicked.addListener((tab) => {
	const tabHistory = getTabHistory(tab.windowId);
	if (tabHistory.length > 1) {
		chrome.tabs.update(tabHistory[tabHistory.length - 2], {active: true});
	}
});
