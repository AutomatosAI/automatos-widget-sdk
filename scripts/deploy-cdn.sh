#!/usr/bin/env bash
# Widget SDK — manual CDN deploy
# ==============================
#
# Uploads packages/loader/dist/ to S3 + invalidates the CloudFront alias.
# Same commands GitHub Actions would run (when wired) — keeping the procedure
# scripted means manual + CI deploys produce identical artefacts.
#
# Usage:
#   scripts/deploy-cdn.sh <version> [--dry-run]
#
# Examples:
#   scripts/deploy-cdn.sh v0.2.0
#   scripts/deploy-cdn.sh v0.2.0 --dry-run
#
# Env (override defaults if your infra differs):
#   AWS_SDK_DEPLOY_BUCKET           default: automatos-widget-sdk
#   AWS_SDK_DEPLOY_DISTRIBUTION_ID  required — CloudFront distribution ID
#   AWS_SDK_DEPLOY_REGION           default: us-east-1
#   AWS_SDK_DEPLOY_DOMAIN           default: widgets.automatos.app
#
# Prerequisites:
#   - aws CLI v2 installed
#   - aws sts get-caller-identity returns the deploy IAM user/role
#   - pnpm build run (or this script will run it for you)
#   - On the branch / commit you want to ship

set -euo pipefail

# ── args ──────────────────────────────────────────────────────────────
VERSION="${1:-}"
DRY_RUN=false
if [[ "${2:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

if [[ -z "$VERSION" ]]; then
  echo "ERROR: version required. Usage: $0 <version> [--dry-run]" >&2
  echo "Example: $0 v0.2.0" >&2
  exit 1
fi

if [[ ! "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "ERROR: version must look like v1.2.3 or v1.2.3-beta.1, got: $VERSION" >&2
  exit 1
fi

MAJOR_ALIAS="$(echo "$VERSION" | sed -E 's/^v([0-9]+).*/v\1/')"

# ── env ───────────────────────────────────────────────────────────────
BUCKET="${AWS_SDK_DEPLOY_BUCKET:-automatos-widget-sdk}"
DIST_ID="${AWS_SDK_DEPLOY_DISTRIBUTION_ID:-}"
REGION="${AWS_SDK_DEPLOY_REGION:-us-east-1}"
DOMAIN="${AWS_SDK_DEPLOY_DOMAIN:-widgets.automatos.app}"

if [[ -z "$DIST_ID" ]]; then
  echo "ERROR: AWS_SDK_DEPLOY_DISTRIBUTION_ID env var required" >&2
  echo "Hint: aws cloudfront list-distributions --query \"DistributionList.Items[*].{Id:Id,Domain:DomainName,Aliases:Aliases.Items}\" --output table" >&2
  exit 1
fi

# ── repo location ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$REPO_ROOT/packages/loader/dist"

# ── helpers ───────────────────────────────────────────────────────────
log() { echo "[deploy-cdn] $*"; }
run() {
  if $DRY_RUN; then
    log "DRY-RUN: $*"
  else
    log "RUN:     $*"
    eval "$@"
  fi
}

# ── 1. Pre-flight ─────────────────────────────────────────────────────
log "Pre-flight checks..."

if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: aws CLI not installed. brew install awscli" >&2
  exit 1
fi

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "ERROR: AWS credentials not configured." >&2
  echo "  Run: aws configure" >&2
  echo "  Or set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY env vars." >&2
  exit 1
fi

CALLER=$(aws sts get-caller-identity --query Arn --output text)
log "AWS identity: $CALLER"

# ── 2. Build (if dist missing) ────────────────────────────────────────
if [[ ! -f "$DIST_DIR/widget.global.js" ]]; then
  log "Build artefact missing — running pnpm build..."
  (cd "$REPO_ROOT" && pnpm install --frozen-lockfile && pnpm build)
fi

if [[ ! -f "$DIST_DIR/widget.global.js" ]]; then
  echo "ERROR: build did not produce $DIST_DIR/widget.global.js" >&2
  exit 1
fi

SIZE=$(wc -c < "$DIST_DIR/widget.global.js" | tr -d ' ')
log "Loader size: $SIZE bytes"
if (( SIZE > 500000 )); then
  echo "WARN: loader > 500 KB raw — check for accidental dep inclusion" >&2
fi

# ── 3. Bucket sanity ──────────────────────────────────────────────────
log "Checking bucket: s3://$BUCKET/"
if ! aws s3 ls "s3://$BUCKET/" >/dev/null 2>&1; then
  echo "ERROR: cannot list s3://$BUCKET/. Check bucket name + IAM perms." >&2
  exit 1
fi

# Refuse to overwrite an immutable version that already exists.
if aws s3 ls "s3://$BUCKET/$VERSION/widget.global.js" >/dev/null 2>&1; then
  echo "ERROR: $VERSION already published at s3://$BUCKET/$VERSION/" >&2
  echo "Versions are immutable — bump to next patch (e.g. ${VERSION%.*}.$(( ${VERSION##*.} + 1 )))." >&2
  exit 1
fi

# ── 4. Upload immutable ───────────────────────────────────────────────
log "Uploading immutable: s3://$BUCKET/$VERSION/"
run "aws s3 sync \"$DIST_DIR/\" \"s3://$BUCKET/$VERSION/\" \\
  --cache-control 'public, max-age=31536000, immutable' \\
  --content-type 'application/javascript' \\
  --exclude '*' --include '*.js' --include '*.js.map'"

# ── 5. Update major-version alias ─────────────────────────────────────
log "Updating major alias: s3://$BUCKET/$MAJOR_ALIAS/ → $VERSION"
run "aws s3 sync \"$DIST_DIR/\" \"s3://$BUCKET/$MAJOR_ALIAS/\" \\
  --cache-control 'public, max-age=3600' \\
  --content-type 'application/javascript' \\
  --exclude '*' --include '*.js' --include '*.js.map' \\
  --metadata-directive REPLACE"

# ── 6. Invalidate CloudFront on the alias ─────────────────────────────
log "Invalidating CloudFront distribution $DIST_ID at /$MAJOR_ALIAS/*"
if $DRY_RUN; then
  log "DRY-RUN: aws cloudfront create-invalidation --distribution-id $DIST_ID --paths \"/$MAJOR_ALIAS/*\""
else
  INV_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$DIST_ID" \
    --paths "/$MAJOR_ALIAS/*" \
    --query 'Invalidation.Id' --output text)
  log "Invalidation: $INV_ID"
fi

# ── 7. Smoke test ─────────────────────────────────────────────────────
URL="https://$DOMAIN/$MAJOR_ALIAS/widget.global.js"
log "Smoke testing: $URL"
if $DRY_RUN; then
  log "DRY-RUN: curl -sI $URL"
else
  for i in {1..24}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
    if [[ "$HTTP_CODE" == "200" ]]; then
      log "✅ $URL is live (HTTP 200)"
      curl -sI "$URL" | grep -iE "etag|last-modified|content-length|cache-control" | sed 's/^/  /'
      break
    fi
    log "attempt $i: HTTP $HTTP_CODE — retrying in 5s"
    sleep 5
  done
  if [[ "$HTTP_CODE" != "200" ]]; then
    echo "ERROR: smoke test failed for $URL (last code: $HTTP_CODE)" >&2
    exit 1
  fi
fi

# ── 8. Done ───────────────────────────────────────────────────────────
log ""
log "=== Done ==="
log "Immutable: https://$DOMAIN/$VERSION/widget.global.js"
log "Alias:     https://$DOMAIN/$MAJOR_ALIAS/widget.global.js  (what the Shopify theme block references)"
log ""
log "Rollback: scripts/deploy-cdn.sh <previous-version> --rollback"
log "  Or follow docs/RUNBOOKS/widget-sdk-rollback.md"
