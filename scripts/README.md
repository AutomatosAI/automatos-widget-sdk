# Widget SDK — scripts

## `deploy-cdn.sh`

Manual S3 + CloudFront deploy of `packages/loader/dist/` to the CDN.
Same procedure GitHub Actions would run (when wired) — kept as a script
so manual + CI deploys produce identical artefacts.

### Quick usage

```bash
# One-time setup (per machine)
aws configure                                      # add deploy IAM creds
export AWS_SDK_DEPLOY_DISTRIBUTION_ID=ABCDEF...    # CloudFront distribution

# Each release
pnpm install
pnpm build
pnpm deploy:cdn v0.2.0          # ship it
# or
pnpm deploy:cdn v0.2.0 --dry-run   # preview commands without uploading
```

### What it does (in order)

1. Validates `<version>` arg (must be `vMAJOR.MINOR.PATCH[-prerelease]`).
2. Verifies `aws` CLI is installed + `aws sts get-caller-identity` works.
3. Builds the SDK if `packages/loader/dist/widget.global.js` is missing.
4. Sanity-checks bucket access + warns if loader > 500 KB raw.
5. Refuses to overwrite an existing immutable `s3://<bucket>/<version>/`.
6. Uploads to **immutable path** `s3://<bucket>/<version>/` with
   1-year cache headers.
7. Updates **major-version alias** (e.g. `v0/`) — what the Shopify theme
   block actually references — with 1-hour cache headers.
8. Issues a CloudFront invalidation on `/<major-alias>/*`.
9. Smoke-tests `https://<domain>/<major-alias>/widget.global.js` — retries
   for up to 2 minutes while invalidation propagates.

### Required env vars

| Variable | Default | Notes |
|---|---|---|
| `AWS_SDK_DEPLOY_DISTRIBUTION_ID` | _(none — required)_ | Find via `aws cloudfront list-distributions --query "DistributionList.Items[*].{Id:Id,Domain:DomainName,Aliases:Aliases.Items}" --output table` |
| `AWS_SDK_DEPLOY_BUCKET` | `automatos-widget-sdk` | Override only if you renamed it |
| `AWS_SDK_DEPLOY_REGION` | `us-east-1` | |
| `AWS_SDK_DEPLOY_DOMAIN` | `widgets.automatos.app` | What the smoke test hits |

### IAM permissions needed

The deploy IAM user/role must have:

```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::automatos-widget-sdk",
        "arn:aws:s3:::automatos-widget-sdk/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "arn:aws:cloudfront::*:distribution/<DIST_ID>"
    }
  ]
}
```

### Rollback

If a deploy goes bad, repoint the major alias at a previous immutable
version. Full procedure in
`automatos-shopify/docs/RUNBOOKS/widget-sdk-rollback.md`. Quick version:

```bash
GOOD=v0.1.3
ALIAS=v0
aws s3 cp s3://automatos-widget-sdk/$GOOD/widget.global.js \
          s3://automatos-widget-sdk/$ALIAS/widget.global.js \
  --cache-control "public, max-age=3600" \
  --content-type "application/javascript" \
  --metadata-directive REPLACE
aws cloudfront create-invalidation \
  --distribution-id "$AWS_SDK_DEPLOY_DISTRIBUTION_ID" \
  --paths "/$ALIAS/*"
```

### When this becomes obsolete

Once `.github/workflows/deploy.yml` is wired with real secrets (strip
the `# TEMPLATE` header, configure `AWS_SDK_DEPLOY_*` repo secrets), a
`git tag v0.x.y && git push origin v0.x.y` will trigger the same flow
in CI — using identical aws commands. Local script stays as a fallback
for emergency / out-of-band deploys.
