const { ingestSessions } = require('./ingestSessions');
const { syncDocs } = require('./syncDocs');

function createAutoSync({ intervalMs = 60_000, log = console } = {}) {
  let running = false;

  async function tick() {
    if (running) return;
    running = true;
    const started = Date.now();
    try {
      const ing = ingestSessions();
      const docs = syncDocs();
      log.info?.(
        `[auto-sync] ok in ${Date.now() - started}ms (activities +${ing.inserted}, docs ${docs.files})`,
      );
    } catch (e) {
      log.error?.('[auto-sync] failed', e);
    } finally {
      running = false;
    }
  }

  const timer = setInterval(tick, intervalMs);
  // run once quickly
  setTimeout(tick, 2_000);

  return {
    stop() {
      clearInterval(timer);
    },
    tick,
  };
}

module.exports = { createAutoSync };
