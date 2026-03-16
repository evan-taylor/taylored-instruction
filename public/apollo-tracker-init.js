(() => {
  const RADIX_36 = 36;
  const SKIP_PREFIX_LENGTH = 7;
  const n = Math.random().toString(RADIX_36).substring(SKIP_PREFIX_LENGTH);
  const o = document.createElement("script");
  o.src =
    "https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache=" +
    n;
  o.async = true;
  o.defer = true;
  o.onload = () => {
    if (typeof window.trackingFunctions !== "undefined") {
      window.trackingFunctions.onLoad({ appId: "6943536a93fbdf001d996156" });
    }
  };
  document.head.appendChild(o);
})();
