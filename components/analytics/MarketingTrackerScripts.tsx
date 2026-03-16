import Script from "next/script";

/**
 * Third-party marketing/lead-gen trackers. Loaded only on marketing routes
 * to avoid main-thread overhead on authenticated app pages.
 */
export function MarketingTrackerScripts() {
  return (
    <>
      <Script
        src="https://assets.onedollarstats.com/stonks.js"
        strategy="lazyOnload"
      />
      <Script
        data-persist
        data-token="e435884d-0dd1-4cd9-b1ae-a5e36a64e5f1"
        src="https://cdn.visitors.now/v.js"
        strategy="lazyOnload"
      />
      <Script
        id="apollo-lead-tracking"
        src="/apollo-tracker-init.js"
        strategy="lazyOnload"
      />
    </>
  );
}
