import { Outlet } from 'react-router-dom';
import { store } from './state';
export function Layout() { store.read(); return <Outlet />; }
