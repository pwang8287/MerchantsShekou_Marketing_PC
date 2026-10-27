import axios from 'axios';
import { records, metadata } from '../mocks/data';
export const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
});
if (import.meta.env.VITE_USE_MOCK !== 'false') {
  client.defaults.adapter = async (config) => {
    await new Promise((resolve) => setTimeout(resolve, 380));
    return {
      data: { code: 0, data: records, message: 'ok', updatedAt: metadata.updatedAt },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
}
