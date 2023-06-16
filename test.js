const ProxyChooser = require(".");

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
    maxTimeout: 1000,
    forceRetry: true
});

singleProxy.testProxy(proxyList[0]).then(proxy => {
    console.log(proxy);
});