# Guide Asset Uploads

Guide asset uploads can be tested without a separate container. The normal dev
command starts the Node-based S3-compatible emulator automatically:

```bash
pnpm dev
```

You can also run only the emulator:

```bash
pnpm dev:s3
```

The local bucket is created at startup and stores files under `.local/s3`, which
is ignored by git.

Use these values in local app env files:

```env
S3_ENDPOINT="http://127.0.0.1:4568"
S3_REGION="us-east-1"
S3_BUCKET="my-team-local"
S3_ACCESS_KEY_ID="S3RVER"
S3_SECRET_ACCESS_KEY="S3RVER"
S3_PUBLIC_URL="http://127.0.0.1:4568/my-team-local"
```

The guide editor uploads images and PDFs directly to the local S3 endpoint and
stores the resulting public URL in the guide content.

## Railway

In production, create or attach a Railway S3-compatible bucket and set these
variables on the web service:

```env
S3_ENDPOINT="<Railway S3 endpoint>"
S3_REGION="<Railway S3 region, or auto if Railway provides no region>"
S3_BUCKET="<bucket name>"
S3_ACCESS_KEY_ID="<bucket access key>"
S3_SECRET_ACCESS_KEY="<bucket secret key>"
S3_PUBLIC_URL="<public bucket base URL without trailing slash>"
```

The bucket CORS policy must allow browser uploads from the production app
origin:

```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>https://your-production-domain.example</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
  </CORSRule>
</CORSConfiguration>
```
