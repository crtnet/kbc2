import React from 'react';
import { IntlProvider } from 'react-intl';
import ptMessages from './translations/pt.json';

const messages = {
  pt: ptMessages
};

const App = () => {
  const locale = 'pt';

  return (
    <IntlProvider messages={messages[locale]} locale={locale}>
      <div className="app-container">
        {/* Your app content here */}
      </div>
    </IntlProvider>
  );
};

export default App;