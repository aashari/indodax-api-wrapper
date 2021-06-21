const request = require('request');
const hmacSHA512 = require('crypto-js/hmac-sha512');
const storage = require('node-persist');

const IDX_PRIVATE_ENDPOINT = "https://indodax.com/tapi";
const IDX_PUBLIC_ENDPOINT = "https://indodax.com/api";

let IDX_KEY = process.env.IDX_KEY;
let IDX_SECRET = process.env.IDX_SECRET;

let objectToQueryString = (payload) => {
    return Object.keys(payload).map(key => `${key}=${payload[key]}`).join('&');
}

let signPayload = (payload) => {

    if (payload === null) {
        throw Error("signPayload parameter {payload} must be filled!");
    }

    if (typeof payload !== 'object') {
        throw Error("signPayload parameter {payload} must be Object!");
    }

    stringPayload = objectToQueryString(payload);
    encryptedPayload = hmacSHA512(stringPayload, IDX_SECRET).toString();

    return encryptedPayload;

}

let doRequest = (path) => {
    return new Promise((resolve, reject) => {
        request({
            'method': 'POST',
            'url': IDX_PUBLIC_ENDPOINT + '/' + path,
        }, function(error, response) {

            let responsePayload = null;
            try {
                responsePayload = JSON.parse(response.body);
            } catch (e) {
                responsePayload = {};
            }

            if (error) {
                return reject(error);
            } else {
                return resolve(responsePayload);
            }

        });
    });
}

let doRequestEncrypted = (payload, retryLimit = 5) => {

    return new Promise((resolve, reject) => {

        if (payload === null) {
            return reject(`doRequestEncrypted parameter {payload} must be filled! given ${payload}`);
        }

        if (typeof payload !== 'object') {
            return reject(`doRequestEncrypted parameter {payload} must be Object! given ${typeof payload}`)
        }

        return storage.getItem('nonce').then((nonce) => {

            payload.nonce = nonce || 1;

            request({
                'method': 'POST',
                'url': IDX_PRIVATE_ENDPOINT,
                'headers': {
                    'Key': IDX_KEY,
                    'Sign': signPayload(payload)
                },
                'formData': payload
            }, function(error, response) {

                let responsePayload = null;
                try {
                    responsePayload = JSON.parse(response.body);
                } catch (e) {
                    responsePayload = {};
                }

                if (error) {
                    return reject(error)
                } else if (responsePayload && responsePayload.success == 0 && responsePayload.error_code == 'invalid_nonce' && retryLimit > 0) {
                    let latestNonce = parseFloat(responsePayload.error.split(' ')[5].split('.')[0]);
                    console.log(latestNonce);
                    return storage.setItem('nonce', latestNonce + 1).then((successSetNonce) => {
                        payload.nonce = latestNonce + 1;
                        return doRequestEncrypted(payload, retryLimit - 1);
                    });
                } else if (responsePayload.success == 0) {
                    return reject(`doRequestEncrypted error: ${JSON.stringify(responsePayload)}`);
                } else {
                    return storage.setItem('nonce', payload.nonce + 1).then((successSetNonce) => {
                        return resolve(responsePayload);
                    });
                }

            });

        });

    });

}

module.exports = {

    configure: (key, secret) => {
        IDX_KEY = key;
        IDX_SECRET = secret;
    },

    getLatestNonce: () => {
        return storage.init().then((response) => {
            return storage.getItem('nonce');
        });
    },

    setInitialtNonce: (nonce) => {
        return storage.init().then((response) => {
            return storage.setItem('nonce', nonce);
        });
    },

    privateRequest: (method, payload = {}) => {
        return storage.init().then((response) => {
            payload.method = method;
            return doRequestEncrypted(payload);
        })
    },

    publicRequest: (pair, path) => {
        return doRequest(pair + '/' + path);
    },

}