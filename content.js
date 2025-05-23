// content.js - Pokeking Translator (Improved Version)

(async () => {
    console.log("Pokeking Translator: Content script running (Improved)");

    // --- Constants ---
    const DICT = await fetch(browser.runtime.getURL("dictionary.json"))
        .then(res => res.json())
        .catch(error => {
            console.error("Pokeking Translator: Failed to load dictionary.json", error);
            return {}; // Return empty object to prevent script from crashing
        });
    console.log("Loaded dictionary:", DICT);

    if (Object.keys(DICT).length === 0) {
        console.warn("Pokeking Translator: Dictionary is empty or failed to load. Translation will not occur.");
        return; // Exit if dictionary is empty
    }

    const POKEKING_TRANSLATED_CLASS = "pokeking-translated";
    const POKEKING_WRAPPER_CLASS = "pokeking-translated-wrapper";
    const POKEKING_BUTTON_CLASS = "pokeking-toggle-button";
    const POKEKING_ORIGINAL_DATA_ATTR = "original";
    const POKEKING_TRANSLATED_DATA_ATTR = "translated";

    let isShowingOriginal = false; // Track whether we're showing original or translated text

    // Pre-compile regex for efficient keyword replacement
    // Escape special regex characters in dictionary keys
    const escapedKeys = Object.keys(DICT)
        .sort((a, b) => b.length - a.length) // Sort by length descending for greedy matching
        .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    const keywordRegex = new RegExp(`(${escapedKeys.join("|")})`, "g");

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
                // Reject if the node is already wrapped by our translator
                if (parent.classList?.contains(POKEKING_WRAPPER_CLASS)) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        while (walker.nextNode()) {
            nodes.push(walker.currentNode);
        }
        return nodes;
    }

    /**
     * Replaces keywords in the provided text nodes using the pre-compiled regex.
     * Wraps translated text in spans with original and translated data attributes.
     * @param {Node[]} nodes - An array of text nodes to process.
     */
    function replaceKeywords(nodes) {
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
            }
        });
    }

    /**
     * Toggles the visibility between original and translated text for all
     * currently translated elements.
     */
    function toggleTranslationDisplay() {
        document.querySelectorAll(`.${POKEKING_TRANSLATED_CLASS}`).forEach(span => {
            if (isShowingOriginal) {
                span.textContent = span.dataset[POKEKING_ORIGINAL_DATA_ATTR];
            } else {
                span.textContent = span.dataset[POKEKING_TRANSLATED_DATA_ATTR];
            }
        });
    }

    // --- Main Logic ---

    // Initial translation of static content
    // Use a slight delay to allow some initial page rendering.
    // This can improve perceived performance on heavy pages.
    setTimeout(() => {
        replaceKeywords(getAllStaticTextElements());
    }, 500); // 500ms delay

    // MutationObserver to handle dynamically added content
    const observer = new MutationObserver((mutations) => {
        // Only process mutations if we are showing translated text,
        // and only if there are actual added nodes to check.
        if (isShowingOriginal) {
            // If showing original, we don't want new content to be translated automatically.
            // If the user switches back, a full re-scan will happen.
            return;
        }

        const nodesToTranslate = [];
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                // If the added node is a text node, add it directly.
                if (node.nodeType === Node.TEXT_NODE) {
                    nodesToTranslate.push(node);
                }
                // If the added node is an element, find all relevant text nodes within it.
                else if (node.nodeType === Node.ELEMENT_NODE) {
                    // Prevent processing our own injected elements
                    if (node.classList?.contains(POKEKING_WRAPPER_CLASS) || node.classList?.contains(POKEKING_BUTTON_CLASS)) {
                        continue;
                    }
                    nodesToTranslate.push(...getAllStaticTextElements(node));
                }
            }
        }
        if (nodesToTranslate.length > 0) {
            replaceKeywords(nodesToTranslate);
        }
    });

    observer.observe(document.body, {
        childList: true, // Observe direct children additions/removals
        subtree: true,   // Observe all descendants
        characterData: false, // Don't need to observe text content changes on existing nodes for this logic
        attributes: false // Don't need to observe attribute changes for this logic
    });

    console.log("MutationObserver active");

    // Add toggle button to the page
    function addToggleButton() {
        const btn = document.createElement("button");
        btn.textContent = "Show Original"; // Initial text
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
            console.log(`Pokeking Translator: isShowingOriginal: ${isShowingOriginal}`);

            if (isShowingOriginal) {
                toggleTranslationDisplay(); // Show original text
                btn.textContent = "Show Translated";
            } else {
                // If switching back to translated, ensure newly added content is translated
                replaceKeywords(getAllStaticTextElements());
                toggleTranslationDisplay(); // Show translated text for all
                btn.textContent = "Show Original";
            }
        };

        document.body.appendChild(btn);
    }

    addToggleButton();
})();