/**
 * SMMFamy - HTTP Client
 * Enhanced fetch wrapper | ~300 lines
 */

const HTTP = {
    baseURL: '',
    defaultHeaders: {
        'Content-Type': 'application/json'
    },
    timeout: 30000,
    interceptors: {
        request: [],
        response: []
    },

    /**
     * Configure defaults
     */
    config(options = {}) {
        if (options.baseURL) this.baseURL = options.baseURL;
        if (options.headers) this.defaultHeaders = { ...this.defaultHeaders, ...options.headers };
        if (options.timeout) this.timeout = options.timeout;
    },

    /**
     * Add request interceptor
     */
    addRequestInterceptor(fn) {
        this.interceptors.request.push(fn);
        return () => {
            const index = this.interceptors.request.indexOf(fn);
            if (index > -1) this.interceptors.request.splice(index, 1);
        };
    },

    /**
     * Add response interceptor
     */
    addResponseInterceptor(fn) {
        this.interceptors.response.push(fn);
        return () => {
            const index = this.interceptors.response.indexOf(fn);
            if (index > -1) this.interceptors.response.splice(index, 1);
        };
    },

    /**
     * Build URL with query params
     */
    buildURL(url, params = {}) {
        const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;

        if (Object.keys(params).length === 0) return fullURL;

        const queryString = Object.entries(params)
            .filter(([_, v]) => v !== undefined && v !== null)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');

        return queryString ? `${fullURL}?${queryString}` : fullURL;
    },

    /**
     * Make request
     */
    async request(method, url, options = {}) {
        let config = {
            method,
            url,
            headers: { ...this.defaultHeaders, ...options.headers },
            body: options.body,
            params: options.params,
            timeout: options.timeout || this.timeout
        };

        // Run request interceptors
        for (const interceptor of this.interceptors.request) {
            config = await interceptor(config) || config;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        try {
            const response = await fetch(this.buildURL(config.url, config.params), {
                method: config.method,
                headers: config.headers,
                body: config.body ? JSON.stringify(config.body) : undefined,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Parse response
            let data;
            const contentType = response.headers.get('Content-Type');
            if (contentType?.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            let result = {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data,
                ok: response.ok
            };

            // Run response interceptors
            for (const interceptor of this.interceptors.response) {
                result = await interceptor(result) || result;
            }

            if (!response.ok) {
                throw new HTTPError(result);
            }

            return result;

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new HTTPError({
                    status: 408,
                    statusText: 'Request Timeout',
                    data: { message: 'Request timed out' }
                });
            }

            throw error;
        }
    },

    /**
     * GET request
     */
    get(url, options = {}) {
        return this.request('GET', url, options);
    },

    /**
     * POST request
     */
    post(url, body, options = {}) {
        return this.request('POST', url, { ...options, body });
    },

    /**
     * PUT request
     */
    put(url, body, options = {}) {
        return this.request('PUT', url, { ...options, body });
    },

    /**
     * PATCH request
     */
    patch(url, body, options = {}) {
        return this.request('PATCH', url, { ...options, body });
    },

    /**
     * DELETE request
     */
    delete(url, options = {}) {
        return this.request('DELETE', url, options);
    },

    /**
     * Upload file
     */
    async upload(url, file, options = {}) {
        const formData = new FormData();
        formData.append(options.fieldName || 'file', file);

        if (options.data) {
            Object.entries(options.data).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }

        const response = await fetch(this.buildURL(url), {
            method: 'POST',
            headers: options.headers || {},
            body: formData
        });

        const data = await response.json();

        return {
            status: response.status,
            statusText: response.statusText,
            data,
            ok: response.ok
        };
    },

    /**
     * Parallel requests
     */
    async all(requests) {
        return Promise.all(requests);
    },

    /**
     * First successful request
     */
    async race(requests) {
        return Promise.race(requests);
    },

    /**
     * Retry failed request
     */
    async retry(fn, maxAttempts = 3, delay = 1000) {
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, delay * attempt));
                }
            }
        }

        throw lastError;
    }
};

/**
 * HTTP Error class
 */
class HTTPError extends Error {
    constructor(response) {
        const message = response.data?.message || response.statusText || 'Request failed';
        super(message);

        this.name = 'HTTPError';
        this.status = response.status;
        this.statusText = response.statusText;
        this.data = response.data;
        this.headers = response.headers;
    }

    isClientError() {
        return this.status >= 400 && this.status < 500;
    }

    isServerError() {
        return this.status >= 500;
    }

    isTimeout() {
        return this.status === 408;
    }

    isUnauthorized() {
        return this.status === 401;
    }

    isForbidden() {
        return this.status === 403;
    }

    isNotFound() {
        return this.status === 404;
    }
}

// Export
window.HTTP = HTTP;
window.HTTPError = HTTPError;
