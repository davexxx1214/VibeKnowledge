import { request } from '../request';
export const store = { read() { return request('/session'); } };
