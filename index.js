const axios = require('axios').default;
const storage = require('node-persist');
const hmacSHA512 = require('crypto-js/hmac-sha512');

const IDX_PRIVATE_ENDPOINT = "https://indodax.com/tapi";
const IDX_PUBLIC_ENDPOINT = "https://indodax.com/api";
const VIP_PUBLIC_ENDPOINT = "https://vip.bitcoin.co.id/api";

let IDX_KEY = process.env.IDX_KEY;
let IDX_SECRET = process.env.IDX_SECRET;
let IDX_IS_DEBUGGING = process.env.IDX_IS_DEBUGGING || false;
let IDX_RESPONSE_TTL = process.env.IDX_RESPONSE_TTL || 0;
let IDX_CACHE_DIRECTORY_PATH = process.env.IDX_CACHE_DIRECTORY_PATH || '/tmp/aashari/indodax-api-wrapper';

process.env.VIP_TOTAL_API_CALLS = 0;
process.env.IDX_TOTAL_API_CALLS = 0;
process.env.IDX_START_TIMESTAMP = parseInt(Date.now() / 1000);

let nodePersistent = null;

let _doPrivateRequestNonceHandler = (payload, cachedNonce) => {

    payload.nonce = parseInt(cachedNonce);

    if (IDX_IS_DEBUGGING) {
        console.log("doPrivateRequest", payload);
    }

    payloadQueryString = Object.keys(payload).map(key => `${key}=${payload[key]}`).join('&');
    encryptedPayload = hmacSHA512(payloadQueryString, IDX_SECRET).toString();

    process.env.IDX_TOTAL_API_CALLS++;
    return axios.post(IDX_PRIVATE_ENDPOINT, payloadQueryString, {
        headers: {
            'Key': IDX_KEY,
            'Sign': encryptedPayload
        }
    }).then(response => {

        let responseData = response.data;

        if (responseData.error_code === 'invalid_nonce') {
            let latestNonce = parseFloat(responseData.error.split(' ')[5].split('.')[0]) + Date.now();
            let nonceCacheConfiguration = { ttl: false };
            return storage.setItem('doPrivateRequest-nonce', latestNonce, nonceCacheConfiguration).then(_ => doPrivateRequest(payload));
        }

        delete payload.nonce;

        return storage.setItem(`doPrivateRequest@${JSON.stringify(payload)}`, responseData).then(_ => responseData)

    });

}

let doPrivateRequest = (payload) => {

    if (!payload) {
        throw Error("signPayload parameter {payload} must be filled!");
    }

    if (typeof payload !== 'object') {
        throw Error("signPayload parameter {payload} must be Object!");
    }

    return storage.getItem('doPrivateRequest-nonce').then(cachedNonce => {
        return (cachedNonce ? cachedNonce : 0) + Date.now();
    }).then(cachedNonce => _doPrivateRequestNonceHandler(payload, cachedNonce));

}

let doPublicRequest = (pair, path) => {

    if (IDX_IS_DEBUGGING) {
        console.log("doPublicRequest", pair, path);
    }

    process.env.IDX_TOTAL_API_CALLS++;
    return axios.post(`${IDX_PUBLIC_ENDPOINT}/${pair}/${path}`).then((succes) => {

        let responsePayload = succes.data;

        if (typeof responsePayload === 'string') {
            responsePayload = responsePayload.replaceAll("'", '"');
        }

        if (responsePayload.error) {
            throw new Error(responsePayload);
        } else {
            return storage.setItem(`doPublicRequest@${pair}-${path}`, responsePayload).then(_ => responsePayload)
        }

    });

}

let doPublicRequestVIP = (pair, path) => {

    if (IDX_IS_DEBUGGING) {
        console.log("doPublicRequestVIP", pair, path);
    }

    process.env.VIP_TOTAL_API_CALLS++;
    return axios.get(`${VIP_PUBLIC_ENDPOINT}/${pair}/${path}`).then((succes) => {

        let responsePayload = succes.data;

        if (typeof responsePayload === 'string') {
            responsePayload = responsePayload.replaceAll("'", '"');
        }

        if (responsePayload.error) {
            throw new Error(responsePayload);
        } else {
            return storage.setItem(`doPublicRequestVIP@${pair}-${path}`, responsePayload).then(_ => responsePayload)
        }

    });

}

let doCachePublicRequest = (pair, path, disableCache = false) => {
    if (!nodePersistent) {
        return init().then(response => {
            nodePersistent = response;
            return doCachePublicRequest(pair, path, disableCache);
        });
    }
    return storage.getItem(`doPublicRequest@${pair}-${path}`).then((responseCached) => {
        if (responseCached && disableCache == false) {
            if (IDX_IS_DEBUGGING) console.log("doCachePublicRequest", pair, path)
            return responseCached;
        }
        return doPublicRequest(pair, path).then(responseRealTime => responseRealTime)
    });
}

let doCachePublicVIPRequest = (pair, path, disableCache = false) => {
    if (!nodePersistent) {
        return init().then(response => {
            nodePersistent = response;
            return doPublicRequestVIP(pair, path, disableCache);
        });
    }
    return storage.getItem(`doPublicRequestVIP@${pair}-${path}`).then((responseCached) => {
        if (responseCached && disableCache == false) {
            if (IDX_IS_DEBUGGING) console.log("doPublicRequestVIP", pair, path)
            return responseCached;
        }
        return doPublicRequestVIP(pair, path).then(responseRealTime => responseRealTime)
    });
}

let doCachePrivateRequest = (payload, disableCache = false) => {
    if (!nodePersistent) {
        return init().then(response => {
            nodePersistent = response;
            return doCachePrivateRequest(payload, disableCache);
        });
    }
    return storage.getItem(`doPrivateRequest@${JSON.stringify(payload)}`).then((responseCached) => {
        if (responseCached && disableCache == false) {
            if (IDX_IS_DEBUGGING) console.log("doCachePrivateRequest", payload)
            return responseCached;
        }
        return doPrivateRequest(payload).then(responseRealTime => responseRealTime)
    });
}

let init = () => {
    return storage.init({
        dir: IDX_CACHE_DIRECTORY_PATH,
        ttl: IDX_RESPONSE_TTL * 1000
    }).then(response => {
        nodePersistent = response;
        return response;
    });
}

module.exports = {
    init: init,
    privateRequest: doCachePrivateRequest,
    publicRequest: doCachePublicRequest,
    publicVIPRequest: doCachePublicVIPRequest
}