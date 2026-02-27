# neonpanda-proto-v1
Repository for AI coach project.

## API Documentation (Swagger)

Interactive API documentation is generated from the OpenAPI 3.0 spec at `amplify/swagger/openapi.yaml` and served as a Swagger UI page.

### Viewing the docs

Once deployed, the Swagger UI is available at:
- **Production**: `https://<your-amplify-domain>/api-docs`
- **Development**: `https://<your-dev-amplify-domain>/api-docs`

### Maintaining the docs

The OpenAPI spec (`amplify/swagger/openapi.yaml`) is the source of truth. When you add or modify API endpoints in `amplify/api/resource.ts` and their handlers, update the spec file to match.

### NPM scripts

```bash
# Generate Swagger UI HTML from the OpenAPI spec (outputs to public/api-docs/index.html)
npm run swagger:generate

# Validate the spec structure without generating HTML
npm run swagger:validate

# Cross-reference spec paths against amplify/api/resource.ts to find undocumented endpoints
npm run swagger:check
```

### Automatic generation on deploy

The `amplify.yml` build pipeline runs `npm run swagger:generate` before `npm run build`, so the Swagger UI page is always regenerated with the latest spec on every deployment. The generated HTML is placed in `public/api-docs/index.html`, which Vite copies to the `dist/` output.

## Environment Variables

### Streaming Configuration

- `VITE_USE_LAMBDA_STREAMING` - Enable/disable Lambda Function URL streaming (default: `true`)
  - Set to `false` to use API Gateway streaming only
  - Set to `true` to use direct Lambda Function URL streaming with real-time SSE

### API Configuration

- `VITE_API_URL` - Override the default API URL (optional)

### Usage

Create a `.env.local` file in the project root:

```bash
# Enable Lambda Function URL streaming (default)
VITE_USE_LAMBDA_STREAMING=true

# Or disable to use API Gateway only
VITE_USE_LAMBDA_STREAMING=false
```
