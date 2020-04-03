import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import App from './App';
import * as serviceWorker from './serviceWorker';

function setDocHeight() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight / 100}px`);
}

// @ts-ignore
window.gtag = window.gtag || (() => undefined);

window.addEventListener('resize', setDocHeight);
window.addEventListener('orientationchange', setDocHeight);
setDocHeight();

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root'),
);

serviceWorker.register();
