import { createContext,useContext } from 'react';
import type { AppServices } from '../../application/services/appServices';
export const ServicesContext=createContext<AppServices|null>(null);
export function useServices(){const services=useContext(ServicesContext);if(!services)throw new Error('Missing composition root');return services;}
