export class Poller {
  constructor() {
    this.cache = new Map();
    this.sseClients = [];
    this.intervalMap = new Map();
  }

  register(name, fetchFn, interval, eventName) {
    if (this.intervalMap.has(name)) {
      clearInterval(this.intervalMap.get(name));
    }

    const poll = async () => {
      try {
        const data = await fetchFn();
        const prev = this.cache.get(name);
        const dataStr = JSON.stringify(data);

        if (!prev || prev.raw !== dataStr) {
          this.cache.set(name, { data, raw: dataStr, timestamp: Date.now(), ttl: interval * 2 });
          this.broadcast(eventName, data);
        }
      } catch (err) {
        console.error(`[Poller] ${name}:`, err.message);
      }
    };

    poll();
    this.intervalMap.set(name, setInterval(poll, interval));
  }

  unregister(name) {
    if (this.intervalMap.has(name)) {
      clearInterval(this.intervalMap.get(name));
      this.intervalMap.delete(name);
    }
    this.cache.delete(name);
  }

  broadcast(event, data) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.sseClients = this.sseClients.filter(res => {
      try {
        res.write(msg);
        return true;
      } catch {
        return false;
      }
    });
  }

  getCached(name) {
    const entry = this.cache.get(name);
    if (!entry) return null;
    return entry.data;
  }

  getAllCached(prefix) {
    const result = {};
    for (const [key, entry] of this.cache) {
      if (key.startsWith(prefix)) {
        result[key.replace(prefix, '')] = entry.data;
      }
    }
    return result;
  }

  addClient(res) {
    this.sseClients.push(res);
  }

  removeClient(res) {
    this.sseClients = this.sseClients.filter(c => c !== res);
  }

  stop() {
    for (const id of this.intervalMap.values()) clearInterval(id);
    this.intervalMap.clear();
  }
}
