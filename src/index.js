import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

// No web-app service worker here: the extension's own background service
// worker (public/integration/background) is registered through the manifest.
ReactDOM.render(<App />, document.getElementById('root'));
