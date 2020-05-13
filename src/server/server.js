/* eslint-disable global-require */
import React from 'react';
import express from 'express';
import dotenv from 'dotenv';
import webpack from 'webpack';
import helmet from 'helmet';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { StaticRouter } from 'react-router-dom';
import { renderRoutes } from 'react-router-config';
import routes from '../client/routes/routes';
import reducer from '../client/reducers';
import initialState from '../client/initialState';
import getManifest from './getManifest';

dotenv.config();

const { ENV, PORT } = process.env;
const app = express();
console.log(`This is ${ENV}`);

if (ENV === 'development') {
  const webpackConfig = require('../../webpack.config');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const compiler = webpack(webpackConfig);
  const serverConfig = {
    port: PORT,
    hot: true,
  };
  app.use(webpackDevMiddleware(compiler, serverConfig));
  app.use(webpackHotMiddleware(compiler));
} else {
  const MIME_TYPES = {
    js: 'application/javascript',
    html: 'text/html',
    css: 'text/css',
    svg: 'image/svg+xml',
  };
  app.use((req, res, next) => {
    if (!req.hashManifest) req.hashManifest = getManifest();
    next();
  });
  app.get(/\.(js|css|html|svg)$/, (req, res, next) => {
    const ext = req.url.split('.').pop();
    const compressionMethod = req.header('Accept-Encoding').includes('br') ? 'br' : 'gzip';
    const compressionExt = compressionMethod === 'gzip' ? 'gz' : compressionMethod;
    req.url = `${req.url}.${compressionExt}`;
    res.set('Content-Encoding', compressionMethod);
    res.set('Content-Type', `${MIME_TYPES[ext]}; charset=UTF-8`);
    next();
  });
  app.use(express.static(`${__dirname}/public`));
  app.use(helmet());
  app.use(helmet.permittedCrossDomainPolicies());
  app.disable('x-powered-by');
}

const setResponse = (html, state, manifest) => {
  const stylesFile = manifest ? manifest['main.css'] : '/assets/app.css';
  const vendorsFile = manifest ? manifest['vendors.js'] : '/assets/vendors.js';
  const appFile = manifest ? manifest['main.js'] : '/assets/app.js';

  return (`
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="${stylesFile}" type="text/css"/>
        <title>Platzi Video</title>
      </head>
      <body>
        <div id="app">${html}</div>
        <script>
          window.__PRELOADED_STATE__ = ${JSON.stringify(state).replace(/</g, '\\u003c')}
        </script>
        <script src="${vendorsFile}" type="text/javascript"></script>
        <script src="${appFile}" type="text/javascript"></script>
      </body>
    </html>
  `);
};

const renderApp = (req, res) => {
  const store = createStore(reducer, initialState);
  const preloadedState = store.getState();
  const html = renderToString(
    <Provider store={store}>
      <StaticRouter location={req.url} context={{}}>
        {renderRoutes(routes)}
      </StaticRouter>
    </Provider>,
  );
  res.send(setResponse(html, preloadedState, req.hashManifest));
};

app.get('*', renderApp);

app.listen(PORT, (err) => {
  if (err) console.log(err);
  else console.log(`Server running in port ${PORT}`);
});
