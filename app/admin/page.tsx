import {isAdmin} from '../../lib/cms';
import {getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from '../chatgpt-auth';
import Dashboard from './studio';
export const dynamic='force-dynamic';
export default async function Admin(){const user=await getChatGPTUser();if(!user)return <main className="auth-card"><a className="brand" href="/">♧ verdant</a><h1>Your content,<br/>ready to grow.</h1><p>Sign in with the site owner’s ChatGPT account to manage products and blog posts.</p><a className="btn primary" href={chatGPTSignInPath('/admin')} target="_top">Sign in with ChatGPT →</a><a href="/">Back to website</a></main>;if(!await isAdmin())return <main className="auth-card"><h1>Admin access only</h1><p>This account does not have permission to manage this website.</p><a className="btn primary" href={chatGPTSignOutPath('/admin')} target="_top">Switch account</a><a href="/">Back to website</a></main>;return <Dashboard name={user.displayName} signOut={chatGPTSignOutPath('/admin')}/>}
