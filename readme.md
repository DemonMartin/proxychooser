# ProxyChooser

A simple proxy chooser to choose proxies from a list or test proxies, only supports http/https proxies.

## Installation

```bash
npm install proxychooser
```

## Usage

```javascript
const ProxyChooser = require("proxychooser");

const proxyList = [
  "proxy1:port1",
  "name:pw@proxy:port"
];
const proxyChooser = new ProxyChooser(proxyList, {
  verbose: true,
  maxTimeout: 1000,
  forceRetry: false
});

proxyChooser.getProxy().then(proxy => {
  console.log(proxy);
});

const singleProxy = new ProxyChooser([], {
  verbose: true,
  maxTimeout: 1000
});

singleProxy.testProxy(proxyList[0]).then(proxy => {
  console.log(proxy);
});
```

## API

### Class: ProxyChooser

#### constructor(proxyList, options)

- `proxyList` (Array): List of proxies to use.
- `options` (Object): Options to use.
  - `verbose` (boolean, optional): If true, will log to console. Default: false.
  - `verboseIdentifier` (string, optional): Identifier for verbose. Default: "[proxyChooser]".
  - `maxTimeout` (number, optional): Max timeout for a request. Default: 1000.
  - `pingUrl` (string, optional): URL to use to check proxy. Default: "http://myexternalip.com/raw".
  - `forceRetry` (boolean, optional): Whether function `getProxy` should continue searching even on error. Default: false.

#### resetList()

Resets the proxy list.

- Returns: boolean - Whether it failed or not.

#### addProxies(proxies)

Adds proxies to the proxy list.

- `proxies` (Array): List of proxies to add.
- Returns: boolean - Whether it failed or not.

#### getPing()

Gets the ping between the client and the `pingUrl`.

- Returns: Promise&lt;number&gt; - Ping in ms.

#### testProxy(proxy)

Tests the given proxy for connectivity.

- `proxy` (string): Proxy to test.
- Returns: Promise&lt;boolean&gt; - Whether the proxy is working or not.

#### resetCache()

Resets the cache of tested proxies.

- Returns: boolean - Whether the cache was reset or not.

#### getProxy()

Gets the next working proxy from the proxy list.

- Returns: Promise&lt;string|null&gt; - Next working proxy or null if no proxy is available.

## License

MIT License

## Author

Demon Martin