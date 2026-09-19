import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { createServices } from './app/compositionRoot';
import './shared/ui/styles.css';
const root=document.getElementById('root');if(!root)throw new Error('Missing root');
createRoot(root).render(<App services={createServices()}/>);
