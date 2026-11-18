import {isAdmin} from '../../lib/admin-auth';
import {redirect} from 'next/navigation';
import Dashboard from './studio';
export const dynamic='force-dynamic';
export default async function Admin(){if(!await isAdmin())redirect('/admin/login');return <Dashboard name="Verdant Admin" signOut="/admin/logout"/>}
