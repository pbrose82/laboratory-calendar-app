import React, { useEffect } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import './ApiDocumentation.css';

// Import the swagger YAML
import swaggerDoc from '../assets/swagger.yaml';

function ApiDocumentation() {
  useEffect(() => {
    // Set page title when component mounts
    document.title = 'API Documentation - Laboratory Calendar';
    
    return () => {
      // Reset title on unmount
      document.title = 'Laboratory Calendar';
    };
  }, []);

  return (
    <div className="api-documentation">
      <div className="content-header">
        <h1>API Documentation</h1>
        <p className="subtitle">
          This documentation describes all the API endpoints available in the Laboratory Calendar system.
        </p>
      </div>

      <div className="swagger-container">
        <SwaggerUI
          spec={swaggerDoc}
          docExpansion="list"
          defaultModelsExpandDepth={1}
          supportedSubmitMethods={["get", "post", "put", "delete"]}
        />
      </div>
    </div>
  );
}

export default ApiDocumentation;
