import { createBrowserRouter as makeRouter } from 'react-router-dom';
import { Layout } from './Layout';
export const router = makeRouter([
  { path: '/', element: <Layout />, children: [
    { path: 'help', lazy: () => import('./pages/Help') }
  ] }
]);
