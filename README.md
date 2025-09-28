# neonpanda-proto-v1
Repository for AI coach project.

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
