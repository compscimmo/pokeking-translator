const DICTIONARY_URL = "https://compscimmo.github.io/pokeking-translator/dictionary.json"; // Your GitHub Pages URL
const DICTIONARY_STORAGE_KEY = "myDictionary";
const UPDATE_INTERVAL_MINUTES = 60; // Update every hour

async function fetchAndUpdateDictionary() {
    console.log("Background: Attempting to fetch and update dictionary...");
    try {
        const response = await fetch(DICTIONARY_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const dictionary = await response.json();

        // Store the dictionary in local storage
        await chrome.storage.local.set({ [DICTIONARY_STORAGE_KEY]: dictionary });
        console.log("Background: Dictionary updated from remote source.");

        // Optionally, store the last updated timestamp
        await chrome.storage.local.set({ lastDictionaryUpdate: Date.now() });

    } catch (error) {
        console.error("Background: Failed to fetch or update dictionary:", error);
    }
}

async function getDictionary() {
    const result = await chrome.storage.local.get(DICTIONARY_STORAGE_KEY);
    return result[DICTIONARY_STORAGE_KEY] || {}; // Return an empty object if not found
}

// Run on extension installation/update
chrome.runtime.onInstalled.addListener(() => {
    console.log("Background: Extension installed or updated. Fetching dictionary now.");
    fetchAndUpdateDictionary();
});

// Periodically run the update function using chrome.alarms
// For Manifest V3, this is the recommended way for periodic tasks.
chrome.alarms.create('updateDictionary', { periodInMinutes: UPDATE_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'updateDictionary') {
        console.log("Background: Alarm triggered. Fetching dictionary.");
        fetchAndUpdateDictionary();
    }
});

// Listen for messages from content scripts to provide the dictionary
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getDictionary") {
        console.log("Background: Received 'getDictionary' request from content script.");
        getDictionary().then(dict => {
            sendResponse({ dictionary: dict });
        });
        return true; // Indicates async response
    }
});