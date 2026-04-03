import axios from 'axios';

type SslInitParams = {
  total_amount: string;
  currency: string;
  tran_id: string;
  success_url: string;
  fail_url: string;
  cancel_url: string;
  ipn_url: string;
  product_name: string;
  product_category: string;
  product_profile: string;
  cus_name: string;
  cus_email: string;
  cus_add1: string;
  cus_city: string;
  cus_postcode: string;
  cus_country: string;
  cus_phone: string;
  shipping_method: string;
};

type SslInitResponse = {
  status: string;
  failedreason?: string;
  GatewayPageURL?: string;
  sessionkey?: string;
};

type SslValidationResponse = {
  status?: string;
  APIConnect?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  currency_type?: string;
};

const isLive = process.env.SSLCOMMERZ_IS_LIVE === 'true';

const defaultBaseUrl = isLive
  ? 'https://securepay.sslcommerz.com'
  : 'https://sandbox.sslcommerz.com';

const SSL_BASE_URL = process.env.SSLCOMMERZ_BASE_URL || defaultBaseUrl;
const SSL_SESSION_API_URL =
  process.env.SSLCOMMERZ_SESSION_API_URL || `${SSL_BASE_URL}/gwprocess/v4/api.php`;
const SSL_VALIDATION_API_URL =
  process.env.SSLCOMMERZ_VALIDATION_API_URL || `${SSL_BASE_URL}/validator/api/validationserverAPI.php`;

const storeId = process.env.SSLCOMMERZ_STORE_ID || '';
const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD || '';

export const isSslCommerzConfigured = () => Boolean(storeId && storePassword);

export const getFrontendBaseUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';

export const getBackendBaseUrl = () => process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

export const initSslCommerzPayment = async (payload: SslInitParams) => {
  const endpoint = SSL_SESSION_API_URL;

  const requestBody = new URLSearchParams({
    store_id: storeId,
    store_passwd: storePassword,
    ...payload,
  });

  const response = await axios.post<SslInitResponse>(endpoint, requestBody, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data;
};

export const validateSslCommerzPayment = async (valId: string) => {
  const endpoint = SSL_VALIDATION_API_URL;

  const response = await axios.get<SslValidationResponse>(endpoint, {
    params: {
      val_id: valId,
      store_id: storeId,
      store_passwd: storePassword,
      format: 'json',
    },
  });

  return response.data;
};

