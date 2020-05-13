import React from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import Layout from '../components/Layout';
import routes from './routes';

const App = () => (
  <BrowserRouter>
    <Layout>
      <Switch>
        {routes.map(({ exact, path, component }) => <Route exact={exact} path={path} component={component} />)}
      </Switch>
    </Layout>
  </BrowserRouter>
);

export default App;
