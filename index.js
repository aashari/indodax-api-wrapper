const request = require('request');
const hmacSHA512 = require('crypto-js/hmac-sha512');

const IDX_PRIVATE_ENDPOINT = "https://indodax.com/tapi";
const IDX_PUBLIC_ENDPOINT = "https://indodax.com/api";

let IS_DEBUGGING = process.env.IS_DEBUGGING;
let IDX_KEY = process.env.IDX_KEY;
let IDX_SECRRET = process.env.IDX_SECRRET;

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

    if (IS_DEBUGGING) {
        console.log("signPayload {payload}", payload);
    }

    stringPayload = objectToQueryString(payload);

    if (IS_DEBUGGING) {
        console.log("signPayload {stringPayload}", stringPayload);
    }

    encryptedPayload = hmacSHA512(stringPayload, IDX_SECRRET).toString();

    if (IS_DEBUGGING) {
        console.log("signPayload {encryptedPayload}", encryptedPayload);
    }

    return encryptedPayload;

}

let doRequest = (path, callback) => {

    request({
        'method': 'POST',
        'url': IDX_PUBLIC_ENDPOINT + '/' + path,
    }, function(error, response) {

        if (error) {
            console.log("doRequest request error {error}", error);
            if (response.body) {
                console.log("doRequest request error {response} ", response);
            }
            throw Error(error);
        }

        let responsePayload = JSON.parse(response.body);

        callback(responsePayload);

    });

}

let doRequestEncrypted = (payload, callback) => {

    if (payload === null) {
        throw Error("doRequestEncrypted parameter {payload} must be filled!");
    }

    if (typeof payload !== 'object') {
        console.log(typeof payload);
        throw Error("doRequestEncrypted parameter {payload} must be Object!");
    }

    payload.nonce = Date.now();

    if (IS_DEBUGGING) {
        console.log("doRequestEncrypted {payload}", payload);
    }

    request({
        'method': 'POST',
        'url': IDX_PRIVATE_ENDPOINT,
        'headers': {
            'Key': IDX_KEY,
            'Sign': signPayload(payload)
        },
        'formData': payload
    }, function(error, response) {

        if (error) {
            console.log("doRequestEncrypted request error {error}", error);
            if (response.body) {
                console.log("doRequestEncrypted request error {response} ", response);
            }
            throw Error(error);
        }

        let responsePayload = JSON.parse(response.body);

        if (responsePayload.success !== 1) {
            throw Error("doRequestEncrypted request {responsePayload.success} failed!", responsePayload);
        }

        callback(responsePayload.return);

    });

}

module.exports = {

    configure: (key, secret, isDebugging) => {
        IDX_KEY = key;
        IDX_SECRRET = secret;
        IS_DEBUGGING = isDebugging === true || isDebugging === 'true' || isDebugging === 1
    },

    getInfo: (callback) => {
        doRequestEncrypted({
            method: 'getInfo'
        }, (response) => {
            callback(response);
        });
    },

    transHistory: (callback) => {
        doRequestEncrypted({
            method: 'transHistory'
        }, (response) => {
            callback(response);
        });
    },

    trade: (payload, callback) => {

        let compiledPayload = {
            method: 'trade'
        };

        Object.keys(payload).map(key => compiledPayload[key] = payload[key]);

        doRequestEncrypted(compiledPayload, (response) => {
            callback(response);
        });

    },

    tradeHistory: (payload, callback) => {

        let compiledPayload = {
            method: 'tradeHistory'
        };

        Object.keys(payload).map(key => compiledPayload[key] = payload[key]);

        doRequestEncrypted(compiledPayload, (response) => {
            callback(response);
        });

    },

    openOrders: (payload, callback) => {

        let compiledPayload = {
            method: 'openOrders'
        };

        Object.keys(payload).map(key => compiledPayload[key] = payload[key]);

        doRequestEncrypted(compiledPayload, (response) => {
            callback(response);
        });

    },

    orderHistory: (payload, callback) => {

        let compiledPayload = {
            method: 'orderHistory'
        };

        Object.keys(payload).map(key => compiledPayload[key] = payload[key]);

        doRequestEncrypted(compiledPayload, (response) => {
            callback(response);
        });

    },

    getOrder: (payload, callback) => {

        let compiledPayload = {
            method: 'getOrder'
        };

        Object.keys(payload).map(key => compiledPayload[key] = payload[key]);

        doRequestEncrypted(compiledPayload, (response) => {
            callback(response);
        });

    },

    cancelOrder: (payload, callback) => {

        let compiledPayload = {
            method: 'cancelOrder'
        };

        Object.keys(payload).map(key => compiledPayload[key] = payload[key]);

        doRequestEncrypted(compiledPayload, (response) => {
            callback(response);
        });

    },

    getTicker: (pair, callback) => {
        doRequest(pair + '/ticker', callback);
    },

    getTrades: (pair, callback) => {
        doRequest(pair + '/trades', callback);
    },

    getDepth: (pair, callback) => {
        doRequest(pair + '/depth', callback);
    }

}