const axios = require("axios").default;
const dns = require("dns/promises")
const HttpsProxyAgent = require('https-proxy-agent');
const HttpProxyAgent = require('http-proxy-agent');
const pT = require('promise-timeout');
/**
 * @author Demon Martin
 * @license MIT
 * @description A simple proxy chooser to choose proxies from a list, only supports http/https proxies.
 */
class ProxyChooser {
    /**
   * @type {Array}
   * @private
   */
    #proxyList;

    /**
   * @typedef {Object} ProxyChooserOptions
   * @property {boolean} [verbose=false] - If true, will log to console
   * @property {string} [verboseIdentifier="[proxyChooser]"] - Identifier for verbose
   * @property {number} [maxTimeout=1000] - Max timeout for a request
   * @property {string} [pingUrl="http://myexternalip.com/raw"] - URL to use to check proxy
   * @property {boolean} [forceRetry=false] - Whether function getProxy should continue searching even on error
   */

    /**
     * @type {ProxyChooserOptions}
     * @private
     */
    #options;

    /**
   * @type {Array}
   * @private
   */
    #cache;

    /**
   * @param {Array} proxyList - List of proxies to use
   * @param {ProxyChooserOptions} options - Options to use
   */
    constructor(proxyList, options) {
        this.#proxyList = proxyList || [];
        this.#options = options || {
            verbose: false,
            maxTimeout: 1000,
            verboseIdentifier: "[proxyChooser]",
            pingUrl: "http://myexternalip.com/raw",
            forceRetry: false
        };
        this.#cache = [];
    }

    /**
    * Validates the options and throws an error if they are invalid.
    * @private
    */
    validateOptions() {
        if (!this.#options) {
            this.#options = {
                verbose: false,
                maxTimeout: 1000,
                verboseIdentifier: "[proxyChooser]",
            };
        }

        if (typeof this.#options?.verbose === "undefined") {
            this.#options.verbose = false;
        }
        if (typeof this.#options?.maxTimeout === "undefined") {
            this.#options.maxTimeout = 1000;
        }
        if (typeof this.#options?.verboseIdentifier === "undefined") {
            this.#options.verboseIdentifier = "[proxyChooser]";
        }
        if (typeof this.#options?.pingUrl === "undefined") {
            this.#options.pingUrl = "http://myexternalip.com/raw";
        }
        if (typeof this.#options?.forceRetry === "undefined") {
            this.#options.forceRetry = false;
        }

        if (
            typeof this.#options?.maxTimeout !== "number" ||
            typeof this.#options?.verbose !== "boolean" ||
            typeof this.#options?.verboseIdentifier !== "string" ||
            typeof this.#options?.pingUrl !== "string" ||
            typeof this.#options?.forceRetry !== "boolean"
        ) {
            throw new Error("Invalid options");
        }

        return true;
    }

    /**
   * Resets the proxy list.
   * @returns {boolean} Whether it failed or not
   */
    resetList() {
        if (this.#proxyList?.length != 0) {
            this.#proxyList = [];
        } else {
            return false;
        }
        return true;
    }

    /**
   * Adds proxies to the proxy list.
   * @param {Array} proxies - List of proxies to add
   * @returns {boolean} Whether it failed or not
   */
    addProxies(proxies) {
        this.validateOptions();
        if (typeof proxies == "undefined" || !Array.isArray(proxies) || proxies.length === 0) {
            return false;
        }
        this.#proxyList = [...this.#proxyList, ...proxies];
        return true;
    }

    /**
   * Determines the type of the given proxy.
   * @param {string} proxy - Proxy to check
   * @returns {string} Proxy type
   */
    proxyType(proxy) {
        if (!proxy) {
            throw new Error("Proxy cannot be undefined");
        }

        const directPattern = /^[\w.]+:\d+$/;
        const authPattern = /^([^:@]+):([^:@]+)@([^\s@:]+):(\d+)$/

        if (directPattern.test(proxy)) {
            return "direct";
        } else if (authPattern.test(proxy)) {
            return "auth";
        } else {
            return "invalid";
        }
    }

    /**
   * Converts the given proxy to a specific format.
   * @param {string} proxy - Proxy to convert
   * @returns {Promise<string>} Converted proxy
   */
    async convertProxy(proxy) {
        if (!proxy) {
            throw new Error("Proxy cannot be undefined");
        }

        // Regex to check if Hostname is IP or not
        const hasNumber = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\.(?!$)|$)){4}$/;

        // Split proxy into host and port, name and password
        let proxyHost, proxyPort, proxyAuth, proxyPassword;
        let proxyTypeCheck = this.proxyType(proxy);
        if (proxyTypeCheck == "direct") {
            // if proxy is host:port
            [proxyHost, proxyPort] = proxy.split(":");
        } else if (proxyTypeCheck == "auth") {
            // if proxy is auth:password@host:port
            [proxyAuth, proxyHost] = proxy.split("@");
            [proxyAuth, proxyPassword] = proxyAuth.split(":");
            [proxyHost, proxyPort] = proxyHost.split(":");
        } else {
            throw new Error("Invalid proxy format: " + proxy);
        }

        // If proxyHost is not an IP, resolve it to an IP
        if (!hasNumber.test(proxyHost)) {
            try {
                const proxyIP = await dns.lookup(proxyHost);
                proxyHost = proxyIP.address;
            } catch (error) {
                throw new Error(
                    `Failed to resolve IP address for ${proxyHost}.`
                );
            }
        }

        // If proxy is auth:password@host:port, return auth:password@ip:port
        if (proxyTypeCheck == "auth") {
            return `${proxyAuth}:${proxyPassword}@${proxyHost}:${proxyPort}`;
        }

        // If proxy is host:port, return ip:port
        return `${proxyHost}:${proxyPort}`;
    }

    /**
   * Gets the ping between the client and the pingUrl.
   * @returns {Promise<number>} Ping in ms
   */
    async getPing() {
        this.validateOptions();

        try {
            if (this.#options.verbose) {
                console.log(`${this.#options.verboseIdentifier} Getting ping for ${this.#options.pingUrl}`)
            }
            let StartTime = Date.now()
            await axios({
                method: "get",
                url: this.#options.pingUrl,
                timeout: 30 * 10000
            });
            let EndTime = Date.now()

            if (this.#options.verbose) {
                console.log(`${this.#options.verboseIdentifier} Ping for ${this.#options.pingUrl} is ${EndTime - StartTime}ms`)
            }

            return EndTime - StartTime;
        } catch (error) {
            throw new Error(`Failed to get ping for ${this.#options.pingUrl} | Axios Error: ${error}`);
        }
    }

    /**
       * Tests the given proxy for connectivity.
       * @param {string} proxy - Proxy to test
       * @returns {Promise<boolean>} Whether the proxy is working or not
    */
    async testProxy(proxy) {
        this.validateOptions()

        if (!proxy) {
            throw new Error("Proxy cannot be undefined");
        }

        proxy = await this.convertProxy(proxy);

        try {
            let startTime = Date.now();
            const controller = new AbortController();
            const axiosRequest = axios({
                method: "get",
                url: this.#options.pingUrl,
                httpsAgent: new HttpsProxyAgent(`http://${proxy}`),
                httpAgent: new HttpProxyAgent(`http://${proxy}`),
                timeout: this.#options.maxTimeout,
                signal: controller.signal
            });
            try {
                const timeoutPromise = await pT.timeout(axiosRequest, this.#options.maxTimeout);
            } catch (error) {
                try { controller.abort() } catch { }
                if (error instanceof pT.TimeoutError) {
                    throw new Error(`Request timed out after ${this.#options.maxTimeout}ms`);
                } else {
                    throw new Error(error);
                }
            }

            let endTime = Date.now();

            if ((endTime - startTime) > this.#options.maxTimeout) {
                throw new Error(`Request timed out after ${this.#options.maxTimeout}ms`);
            }

            if (this.#options.verbose) {
                console.log(
                    `${this.#options.verboseIdentifier} Proxy ${proxy} is working. Ping: ${(endTime - startTime)}ms`
                );
            }

            return true;
        } catch (e) {
            if (this.#options.verbose) {
                console.log(
                    `${this.#options.verboseIdentifier} Proxy ${proxy} is not working. | ${e}`
                );
            }
            return false;
        }
    }

    /**
    * Resets the cache of tested proxies.
    * @returns {boolean} Whether the cache was reset or not
    */
    resetCache() {
        this.#cache = [];
        return true;
    }

    /**
    * Gets the next working proxy from the proxy list.
    * @returns {Promise<string|null>} Next working proxy or null if no proxy is available
    */
    async getProxy() {
        this.validateOptions();
        try {
            const proxyList = this.#proxyList.filter(cproxy => !this.#cache.includes(cproxy));
            const options = this.#options;

            const proxy = await this.convertProxy(proxyList[Math.floor(Math.random() * proxyList.length)]);
            if (!this.#cache.includes(proxy)) {
                this.#cache.push(proxy);
            } else {
                if (this.#cache.length === this.#proxyList.length) {
                    throw new Error(`All proxies have been tested and failed, please reset Cache using cacheReset()`)
                }
            }

            if (options.verbose) {
                console.log(
                    `${options.verboseIdentifier} Trying proxy ${proxy}`
                );
            }

            let workingProxy = await this.testProxy(proxy);

            if (workingProxy) {
                return proxy;
            } else {
                return this.getProxy();
            }
        } catch (error) {
            if (this.#options.forceRetry) {
                if (this.#options.verbose) {
                    console.log(`${this.#options.verboseIdentifier} ${error} | Retrying...  (forceRetry enabled)`)
                }
                this.resetCache();
                return this.getProxy();
            } else {
                throw new Error(error);
            }
        }
    }
}

module.exports = ProxyChooser;
