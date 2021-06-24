const axios = require('axios').default;
const storage = require('node-persist');
const hmacSHA512 = require('crypto-js/hmac-sha512');

const IDX_PRIVATE_ENDPOINT = "https://indodax.com/tapi";
const IDX_PUBLIC_ENDPOINT = "https://indodax.com/api";

let IDX_KEY = process.env.IDX_KEY;
let IDX_SECRET = process.env.IDX_SECRET;
let IDX_IS_DEBUGGING = process.env.IDX_IS_DEBUGGING || false;
let IDX_RESPONSE_TTL = process.env.IDX_RESPONSE_TTL || 0;
let IDX_CACHE_DIRECTORY_PATH = process.env.IDX_CACHE_DIRECTORY_PATH || '/tmp/aashari/indodax-api-wrapper';

let _doPrivateRequestNonceHandler = (payload, cachedNonce) => {

    payload.nonce = parseInt(cachedNonce);

    if (IDX_IS_DEBUGGING) {
        console.log("doPrivateRequest", payload);
    }

    payloadQueryString = Object.keys(payload).map(key => `${key}=${payload[key]}`).join('&');
    encryptedPayload = hmacSHA512(payloadQueryString, IDX_SECRET).toString();

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

let doCachePublicRequest = (pair, path, disableCache = false) => {
    return storage.init({
        dir: IDX_CACHE_DIRECTORY_PATH,
        ttl: IDX_RESPONSE_TTL * 1000
    }).then(_ => {
        return storage.getItem(`doPublicRequest@${pair}-${path}`).then((responseCached) => {
            if (responseCached && disableCache == false) {
                if (IDX_IS_DEBUGGING) console.log("doCachePublicRequest", pair, path)
                return responseCached;
            }
            return doPublicRequest(pair, path).then(responseRealTime => responseRealTime)
        });
    }).finally(_ => {
        storage.removeExpiredItems();
    })
}

let doCachePrivateRequest = (payload, disableCache = false) => {
    return storage.init({
        dir: IDX_CACHE_DIRECTORY_PATH,
        ttl: IDX_RESPONSE_TTL * 1000
    }).then(_ => {
        return storage.getItem(`doPrivateRequest@${JSON.stringify(payload)}`).then((responseCached) => {
            if (responseCached && disableCache == false) {
                if (IDX_IS_DEBUGGING) console.log("doCachePrivateRequest", payload)
                return responseCached;
            }
            return doPrivateRequest(payload).then(responseRealTime => responseRealTime)
        });
    }).finally(_ => {
        storage.removeExpiredItems();
    })
}


module.exports = {
    privateRequest: doCachePrivateRequest,
    publicRequest: doCachePublicRequest
}