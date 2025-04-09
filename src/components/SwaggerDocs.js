import React from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import './SwaggerDocs.css';

function SwaggerDocs() {
  return (
    <div className="api-documentation">
      <div className="content-header">
        <h1>API Documentation</h1>
        <p className="subtitle">
          This documentation describes all the API endpoints available in the Laboratory Calendar system.
        </p>
      </div>

      <div className="swagger-container">
        <SwaggerUI url="/swagger.yaml" />
      </div>
    </div>
  );
}

export default SwaggerDocs;
