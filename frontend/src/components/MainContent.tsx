import React from 'react';
import { FormattedMessage } from 'react-intl';

const MainContent: React.FC = () => {
  return (
    <div className="main-content">
      <h1>
        <FormattedMessage id="I86Kj3" defaultMessage="HEIC to JPG" />
      </h1>
      <div className="quality-section">
        <label>
          <FormattedMessage id="y+7ihJ" defaultMessage="Quality" />
        </label>
      </div>
      <div className="upload-section">
        <p>
          <FormattedMessage id="aZ1Q0A" defaultMessage="Drag and drop images or" />
        </p>
        <p>
          <FormattedMessage id="qZGdi+" defaultMessage="HEIC files are allowed" />
        </p>
        <p>
          <FormattedMessage id="W4cWeE" defaultMessage="unlimited number of files" />
        </p>
      </div>
      <div className="info-section">
        <p>
          <FormattedMessage 
            id="phdZCb" 
            defaultMessage="Your photos are not uploaded to any server." 
          />
        </p>
      </div>
    </div>
  );
};

export default MainContent;