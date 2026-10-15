function trackEvent(eventName, parameters = {}) {
    if (typeof gtag === 'function') {
        gtag('event', eventName, parameters);
    }
}