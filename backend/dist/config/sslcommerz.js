"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSslCommerzPayment = exports.initSslCommerzPayment = exports.getBackendBaseUrl = exports.getFrontendBaseUrl = exports.isSslCommerzConfigured = void 0;
const axios_1 = __importDefault(require("axios"));
const isLive = process.env.SSLCOMMERZ_IS_LIVE === 'true';
const defaultBaseUrl = isLive
    ? 'https://securepay.sslcommerz.com'
    : 'https://sandbox.sslcommerz.com';
const SSL_BASE_URL = process.env.SSLCOMMERZ_BASE_URL || defaultBaseUrl;
const SSL_SESSION_API_URL = process.env.SSLCOMMERZ_SESSION_API_URL || `${SSL_BASE_URL}/gwprocess/v4/api.php`;
const SSL_VALIDATION_API_URL = process.env.SSLCOMMERZ_VALIDATION_API_URL || `${SSL_BASE_URL}/validator/api/validationserverAPI.php`;
const storeId = process.env.SSLCOMMERZ_STORE_ID || '';
const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD || '';
const isSslCommerzConfigured = () => Boolean(storeId && storePassword);
exports.isSslCommerzConfigured = isSslCommerzConfigured;
const getFrontendBaseUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';
exports.getFrontendBaseUrl = getFrontendBaseUrl;
const getBackendBaseUrl = () => process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
exports.getBackendBaseUrl = getBackendBaseUrl;
const initSslCommerzPayment = async (payload) => {
    const endpoint = SSL_SESSION_API_URL;
    const requestBody = new URLSearchParams({
        store_id: storeId,
        store_passwd: storePassword,
        ...payload,
    });
    const response = await axios_1.default.post(endpoint, requestBody, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
    return response.data;
};
exports.initSslCommerzPayment = initSslCommerzPayment;
const validateSslCommerzPayment = async (valId) => {
    const endpoint = SSL_VALIDATION_API_URL;
    const response = await axios_1.default.get(endpoint, {
        params: {
            val_id: valId,
            store_id: storeId,
            store_passwd: storePassword,
            format: 'json',
        },
    });
    return response.data;
};
exports.validateSslCommerzPayment = validateSslCommerzPayment;
