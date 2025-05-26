// content.js - Pokeking Translator (Final Version with Injected Script)

// This content script runs in an isolated world, handling UI for translation
// and communicating with an injected script that overrides native functions.

(async () => {
    console.log("Pokeking Translator: Content script running (Final Version)");

    // --- Constants ---
    const DICT = await fetch(browser.runtime.getURL("dictionary.json"))
        .then(res => res.json())
        .catch(error => {
            console.error("Pokeking Translator: Failed to load dictionary.json", error);
            return {}; // Return empty object to prevent script from crashing
        });
    console.log("Pokeking Translator: Loaded dictionary:", DICT);

    if (Object.keys(DICT).length === 0) {
        console.warn("Pokeking Translator: Dictionary is empty or failed to load. Translation will not occur.");
        // We will still proceed to override alert, but it won't translate
    }

    const POKEKING_TRANSLATED_CLASS = "pokeking-translated";
    const POKEKING_WRAPPER_CLASS = "pokeking-translated-wrapper";
    const POKEKING_BUTTON_CLASS = "pokeking-toggle-button";
    const POKEKING_ORIGINAL_DATA_ATTR = "original";
    const POKEKING_TRANSLATED_DATA_ATTR = "translated";

    // New constants for custom alert
    const CUSTOM_ALERT_ID = "pokeking-custom-alert";
    const CUSTOM_ALERT_MESSAGE_CLASS = "pokeking-custom-alert-message";
    const CUSTOM_ALERT_BUTTON_CLASS = "pokeking-custom-alert-button";

    let isShowingOriginal = false; // Track whether we're showing original or translated text

    // Pre-compile regex for efficient keyword replacement
    const escapedKeys = Object.keys(DICT)
        .sort((a, b) => b.length - a.length) // Sort by length descending for greedy matching
        .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    const keywordRegex = escapedKeys.length > 0 ? new RegExp(`(${escapedKeys.join("|")})`, "g") : null;
    console.log("Pokeking Translator: Keyword Regex:", keywordRegex);


    // --- Helper Functions ---

    /**
     * Extracts all relevant text nodes from a given root element.
     * Filters out empty nodes, hidden elements, and already processed nodes.
     * @param {HTMLElement} root - The root element to start the walk from.
     * @returns {Node[]} An array of text nodes.
     */
    function getAllStaticTextElements(root = document.body) {
        const nodes = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                // Reject if empty or only whitespace
                if (!node.nodeValue.trim()) {
                    return NodeFilter.FILTER_REJECT;
                }
                const parent = node.parentElement;
                // Reject if parent is null (shouldn't happen often for SHOW_TEXT)
                if (!parent) {
                    return NodeFilter.FILTER_REJECT;
                }
                // Reject if parent is hidden or display: none
                const style = window.getComputedStyle(parent);
                if (style.visibility === "hidden" || style.display === "none") {
                    return NodeFilter.FILTER_REJECT;
                }
                // Reject if the node is already wrapped by our translator or inside our custom alert
                if (parent.classList?.contains(POKEKING_WRAPPER_CLASS) || parent.id === CUSTOM_ALERT_ID || parent.closest(`#${CUSTOM_ALERT_ID}`)) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        while (walker.nextNode()) {
            nodes.push(walker.currentNode);
        }
        console.log(`Pokeking Translator: Found ${nodes.length} static text elements.`);
        return nodes;
    }

    /**
     * Replaces keywords in the provided text nodes using the pre-compiled regex.
     * Wraps translated text in spans with original and translated data attributes.
     * @param {Node[]} nodes - An array of text nodes to process.
     */
    function replaceKeywords(nodes) {
        if (!keywordRegex) {
            console.warn("Pokeking Translator: No keyword regex available, skipping keyword replacement.");
            return; // No dictionary to translate from
        }

        let translationsMade = 0;
        nodes.forEach(node => {
            const originalText = node.nodeValue;

            // Check if there are any keywords to replace in this text node
            if (!keywordRegex.test(originalText)) {
                return; // No keywords found, no need to proceed
            }

            // Perform replacement using the regex
            const translatedText = originalText.replace(keywordRegex, match => DICT[match] || match);

            // If no actual change, no need to wrap
            if (translatedText === originalText) {
                return;
            }

            // Create the span and wrapper elements
            const span = document.createElement("span");
            span.className = POKEKING_TRANSLATED_CLASS;
            span.dataset[POKEKING_ORIGINAL_DATA_ATTR] = originalText;
            span.dataset[POKEKING_TRANSLATED_DATA_ATTR] = translatedText;
            span.textContent = translatedText; // Initially show translated

            const wrapper = document.createElement("span");
            wrapper.className = POKEKING_WRAPPER_CLASS;
            wrapper.appendChild(span);

            // Replace the original text node with the new wrapper
            if (node.parentNode) {
                node.parentNode.replaceChild(wrapper, node);
                translationsMade++;
            }
        });
        if (translationsMade > 0) {
            console.log(`Pokeking Translator: Performed ${translationsMade} keyword replacements.`);
        }
    }

    /**
     * Toggles the visibility between original and translated text for all
     * currently translated elements.
     */
    function toggleTranslationDisplay() {
        console.log(`Pokeking Translator: Toggling translation display. isShowingOriginal: ${isShowingOriginal}`);
        document.querySelectorAll(`.${POKEKING_TRANSLATED_CLASS}`).forEach(span => {
            if (isShowingOriginal) {
                span.textContent = span.dataset[POKEKING_ORIGINAL_DATA_ATTR];
            } else {
                span.textContent = span.dataset[POKEKING_TRANSLATED_DATA_ATTR];
            }
        });
    }

    /**
     * Shows a custom alert pop-up with translated text.
     * @param {string} originalMessage - The original message from the native alert.
     */
    function showCustomAlert(originalMessage) {
        console.log("Pokeking Translator: Showing custom alert for:", originalMessage);
        let alertDiv = document.getElementById(CUSTOM_ALERT_ID);
        if (!alertDiv) {
            alertDiv = document.createElement("div");
            alertDiv.id = CUSTOM_ALERT_ID;

            const alertContent = document.createElement("div");
            alertContent.className = "pokeking-custom-alert-content";

            const messageElement = document.createElement("p");
            messageElement.className = CUSTOM_ALERT_MESSAGE_CLASS;
            alertContent.appendChild(messageElement);

            const okButton = document.createElement("button");
            okButton.className = CUSTOM_ALERT_BUTTON_CLASS;
            okButton.textContent = "OK";
            alertContent.appendChild(okButton);

            alertDiv.appendChild(alertContent);
            document.body.appendChild(alertDiv);

            // Add basic styles for the custom alert (consider a separate CSS file for production)
            if (!document.getElementById('pokeking-custom-alert-styles')) {
                const styleTag = document.createElement('style');
                styleTag.id = 'pokeking-custom-alert-styles';
                styleTag.textContent = `
                    #${CUSTOM_ALERT_ID} {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.7);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 10000; /* Higher than other content */
                        font-family: Arial, sans-serif;
                    }
                    .pokeking-custom-alert-content {
                        background-color: #333; /* Dark background like native alert */
                        color: #fff;
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
                        text-align: center;
                        min-width: 280px;
                        max-width: 80%;
                        box-sizing: border-box;
                    }
                    .${CUSTOM_ALERT_BUTTON_CLASS} {
                        background-color: #4CAF50; /* Green OK button */
                        color: white;
                        padding: 10px 20px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 1em;
                        transition: background-color 0.2s ease;
                    }
                    .${CUSTOM_ALERT_BUTTON_CLASS}:hover {
                        background-color: #45a049;
                    }
                `;
                document.head.appendChild(styleTag);
            }

            // Add event listener for the OK button
            okButton.onclick = () => { // Use the variable for the button created above
                alertDiv.style.display = 'none';
            };
        }

        const messageElement = alertDiv.querySelector(`.${CUSTOM_ALERT_MESSAGE_CLASS}`);
        const translatedMessage = DICT[originalMessage.trim()] || originalMessage; // Translate if available
        messageElement.textContent = translatedMessage; // Use textContent for message to prevent XSS

        alertDiv.style.display = 'flex'; // Show the alert
    }


    // --- Core Logic: Inject the script that performs the actual alert override into the page's context ---
    // This is crucial because content scripts run in an isolated world,
    // and a script in the page's own context is needed to truly override window.alert
    const s = document.createElement('script');
    s.src = browser.runtime.getURL('injected_script.js');
    s.onload = function() {
        this.remove(); // Clean up the script tag after it loads and executes
        console.log("Pokeking Translator: Injected script loaded and removed.");
    };
    // Prepend to the head or documentElement to ensure it runs as early as possible
    (document.head || document.documentElement).prepend(s);


    // --- Listen for Custom Events from the Injected Script ---
    // The injected script dispatches a custom event when an alert is intercepted.
    // The content script listens for this event to then display its custom alert.
    window.addEventListener('pokekingAlertIntercepted', (event) => {
        const message = event.detail.message;
        console.log("Pokeking Translator: Received alert from injected script:", message);
        showCustomAlert(message);
    });

    // You can add listeners for other intercepted functions like prompt if you add them to injected_script.js
    /*
    window.addEventListener('pokekingPromptIntercepted', (event) => {
        const message = event.detail.message;
        const defaultValue = event.detail.defaultValue;
        // Handle prompt here, possibly showing a custom prompt UI
        console.log("Pokeking Translator: Received prompt from injected script:", message);
        // showCustomPrompt(message, defaultValue); // You would need to create this function
    });
    */


    // --- Main Logic (for static content, unchanged from previous version) ---

    // Define addToggleButton outside DOMContentLoaded so it's always available.
    function addToggleButton() {
        const btn = document.createElement("button");
        btn.textContent = "Show Original"; // Initial text of the button
        btn.className = POKEKING_BUTTON_CLASS; // Use a class for styling

        // Inject basic styles for the button via a style tag for simplicity in this example.
        // For a real extension, consider injecting a CSS file.
        if (!document.getElementById('pokeking-button-styles')) {
            const styleTag = document.createElement('style');
            styleTag.id = 'pokeking-button-styles';
            styleTag.textContent = `
                .${POKEKING_BUTTON_CLASS} {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    z-index: 9999;
                    padding: 10px 15px;
                    background: #111;
                    color: #fff;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    transition: background 0.2s ease, transform 0.1s ease;
                }
                .${POKEKING_BUTTON_CLASS}:hover {
                    background: #333;
                }
                .${POKEKING_BUTTON_CLASS}:active {
                    transform: translateY(1px);
                }
            `;
            document.head.appendChild(styleTag);
        }

        btn.onclick = () => {
            isShowingOriginal = !isShowingOriginal;
            console.log(`Pokeking Translator: Toggle button clicked. isShowingOriginal: ${isShowingOriginal}`);

            if (isShowingOriginal) {
                toggleTranslationDisplay(); // Show original text for all translated elements
                btn.textContent = "Show Translated"; // Update button text
            } else {
                // If switching back to translated, ensure newly added content is translated
                console.log("Pokeking Translator: Switching back to translated. Re-running replaceKeywords for full page.");
                replaceKeywords(getAllStaticTextElements()); // Re-process potential new content
                toggleTranslationDisplay(); // Show translated text for all
                btn.textContent = "Show Original"; // Update button text
            }
        };

        document.body.appendChild(btn);
    }


    // This function encapsulates the main DOM manipulation logic
    function initializeTranslationAndObserver() {
        console.log("Pokeking Translator: Initializing translation and observer setup.");

        // Initial translation of static content on the page
        // Use a slight delay to allow some initial page rendering.
        setTimeout(() => {
            console.log("Pokeking Translator: Running initial keyword replacement (after 500ms delay).");
            replaceKeywords(getAllStaticTextElements());
        }, 500); // 500ms delay

        // MutationObserver to handle dynamically added content (e.g., other modals, comments)
        const observer = new MutationObserver((mutations) => {
            // Only process mutations if we are showing translated text
            // (i.e., not showing original for all text)
            if (isShowingOriginal) {
                return;
            }

            const nodesToTranslate = [];
            for (const mutation of mutations) {
                // Only interested in added nodes
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        // If the added node is a text node itself
                        if (node.nodeType === Node.TEXT_NODE) {
                            // Ensure it's not inside our own custom alert
                            if (!node.parentNode || node.parentNode.id === CUSTOM_ALERT_ID || node.parentNode.closest(`#${CUSTOM_ALERT_ID}`)) continue;
                            nodesToTranslate.push(node);
                        }
                        // If the added node is an element, find all relevant text nodes within it.
                        else if (node.nodeType === Node.ELEMENT_NODE) {
                            // Prevent processing our own injected elements or custom alert structure
                            if (node.classList?.contains(POKEKING_WRAPPER_CLASS) || node.classList?.contains(POKEKING_BUTTON_CLASS) || node.id === CUSTOM_ALERT_ID || node.closest(`#${CUSTOM_ALERT_ID}`)) {
                                continue;
                            }
                            nodesToTranslate.push(...getAllStaticTextElements(node));
                        }
                    }
                }
            }
            if (nodesToTranslate.length > 0) {
                console.log(`Pokeking Translator: MutationObserver detected changes. Processing ${nodesToTranslate.length} nodes.`);
                replaceKeywords(nodesToTranslate);
            }
        });

        // Start observing the document body for changes, including children
        if (document.body) { // Double-check just to be safe, though DOMContentLoaded should ensure this
            observer.observe(document.body, {
                childList: true, // Observe direct children additions/removals
                subtree: true,   // Observe all descendants
                characterData: false, // Not needed for this logic (we only care about text node additions within elements)
                attributes: false // Not needed for this logic
            });
            console.log("Pokeking Translator: MutationObserver active on document.body.");
        } else {
            console.error("Pokeking Translator: document.body not found even after DOMContentLoaded!");
        }


        // Add toggle button to the page
        addToggleButton();

        // Optional: Add CSS for translated text (from previous suggestion)
        // Removed background-color and border-bottom for no visual highlight
        if (!document.getElementById('pokeking-translation-text-styles')) {
            const styleTag = document.createElement('style');
            styleTag.id = 'pokeking-translation-text-styles';
            styleTag.textContent = `
                .${POKEKING_TRANSLATED_CLASS} {
                    /* Removed highlighting:
                    background-color: rgba(255, 255, 0, 0.1);
                    border-bottom: 1px dashed rgba(0, 0, 0, 0.2);
                    */
                    padding: 1px 0; /* A little padding for better visual */
                    display: inline-block; /* Ensure padding/border works */
                }
            `;
            document.head.appendChild(styleTag);
        }
    }


    // Check if the DOM is already loaded. If so, initialize immediately.
    // Otherwise, wait for DOMContentLoaded.
    if (document.readyState === 'loading') { // Document is still loading
        document.addEventListener('DOMContentLoaded', initializeTranslationAndObserver);
        console.log("Pokeking Translator: Waiting for DOMContentLoaded...");
    } else { // Document is already parsed and loaded
        console.log("Pokeking Translator: DOM already loaded. Initializing immediately.");
        initializeTranslationAndObserver();
    }


})(); // End of async IIFE