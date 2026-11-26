/**
 * Runs a non-critical browser task after the load event, once the main
 * thread is idle, so it stays out of the resources that compete with LCP.
 */
export const whenPageIsIdle = (task: () => void) => {
  const schedule = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(task, { timeout: 4000 });
      return;
    }
    setTimeout(task, 1000);
  };

  if (document.readyState === "complete") {
    schedule();
    return;
  }
  window.addEventListener("load", schedule, { once: true });
};
