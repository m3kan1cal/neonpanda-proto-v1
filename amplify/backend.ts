import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { helloWorld } from './functions/hello-world/resource';
import { contactForm } from './functions/contact-form/resource';
import { createCoreApi } from './api/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  helloWorld,
  contactForm,
});

// Create the Core API with all endpoints
const coreApi = createCoreApi(
  backend.helloWorld.stack,
  backend.helloWorld.resources.lambda,
  backend.contactForm.resources.lambda
);

// Output the API URL
backend.addOutput({
  custom: {
    API: {
      [coreApi.httpApi.httpApiId!]: {
        endpoint: coreApi.httpApi.apiEndpoint,
        customEndpoint: `https://${coreApi.domainName}`,
        region: backend.helloWorld.stack.region,
        apiName: coreApi.httpApi.httpApiName,
        domainName: coreApi.domainName
      }
    }
  }
});
