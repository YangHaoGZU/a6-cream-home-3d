import React from 'react';
import {createRoot} from 'react-dom/client';
import HomeTour from './app/tour';
import './app/globals.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><HomeTour/></React.StrictMode>);
