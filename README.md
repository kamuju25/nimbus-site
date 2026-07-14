# Nimbus — Static Site Deployment

A static site (HTML/CSS/JS) deployed on AWS using S3, CloudFront, Origin
Access Control, AWS WAF, and a GoDaddy-registered domain with an
AWS Certificate Manager (ACM) TLS certificate.

## Architecture

```
Browser
   │  HTTPS (naveenknk.in / www.naveenknk.in)
   ▼
GoDaddy DNS (CNAME records)
   │
   ▼
CloudFront Distribution  ── WAF (managed rules) attached
   │  (Origin Access Control — signed requests only)
   ▼
S3 Bucket (private, no public access)
```

## Repo structure

```
.
├── index.html
├── error.html      # CloudFront custom error page (403/404)
├── css/style.css
├── js/app.js
└── assets/
```

---

## Deployment steps performed

### 1. Create the S3 bucket

```bash
aws s3 mb s3://nimbus-static-site-s3-bucket --region ap-south-1
```

### 2. Block public access on the bucket

The bucket is private end-to-end — all public access is served only
through CloudFront.

```bash
aws s3api put-public-access-block --bucket nimbus-static-site-s3-bucket \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

Verify:

```bash
aws s3api get-public-access-block --bucket nimbus-static-site-s3-bucket
```

### 3. Upload the site files

```bash
aws s3 sync . s3://nimbus-static-site-s3-bucket --delete \
  --exclude ".git/*" --exclude ".gitignore" --exclude "README.md"
```

Verify:

```bash
aws s3 ls s3://nimbus-static-site-s3-bucket --recursive
```

### 4. Create the CloudFront distribution

Via the CloudFront console → **Create distribution**:

- **Origin domain**: the S3 bucket's REST endpoint
  (`nimbus-static-site-s3-bucket.s3.ap-south-1.amazonaws.com`) — not the
  S3 website endpoint.
- **Origin path**: left empty.
- **Allow private S3 bucket access to CloudFront**: checked — this
  auto-creates the Origin Access Control (OAC) and links it to the
  origin.
- **Viewer protocol policy**: Redirect HTTP to HTTPS.
- **Web Application Firewall (WAF)**: "Enable security protections"
  selected — this auto-creates a Web ACL scoped to CloudFront in
  `us-east-1` with AWS managed rule groups attached.

### 5. Set the default root object

Distribution → **General** tab → **Edit**:

- **Default root object**: `index.html`
- **Supported HTTP versions**: HTTP/2 and HTTP/3 enabled

### 6. Confirm Origin Access Control (OAC)

Auto-created during distribution setup (Step 4). Verified under:
**CloudFront → Security → Origin access** — shows signing protocol
Signature V4, "Always sign requests," origin type S3, linked to the
distribution.

### 7. Apply the OAC bucket policy

CloudFront requires the S3 bucket to explicitly allow the distribution
to read objects. Applied via S3 console → bucket → **Permissions** →
**Bucket policy**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::nimbus-static-site-s3-bucket/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::034237695613:distribution/E108NA9I8S08P"
        }
      }
    }
  ]
}
```

### 8. Add custom error responses

Distribution → **Error pages** tab → Create custom error response:

| HTTP Error Code | Response page path | Response code |
|---|---|---|
| 403 | `/error.html` | 404 |
| 404 | `/error.html` | 404 |

### 9. Test via the CloudFront domain

Confirmed the site loads over HTTPS at the auto-generated CloudFront
domain, e.g. `https://dzzfkm0af9bou.cloudfront.net`.

### 10. Register the domain

Registered `naveenknk.in` through GoDaddy.

### 11. Request an ACM certificate

In **AWS Certificate Manager**, region **us-east-1** (required —
CloudFront only reads certificates from this region regardless of
where other resources live):

- Domain names: `naveenknk.in`, `www.naveenknk.in`
- Validation method: DNS validation
- Key algorithm: RSA 2048
- Allow export: Disabled (cert is used only with CloudFront)

### 12. Add ACM DNS validation records in GoDaddy

For each domain, ACM provides a CNAME name/value pair. Added both as
CNAME records under GoDaddy → domain → **DNS**:

| Type | Name (prefix only, GoDaddy appends the domain) | Value |
|---|---|---|
| CNAME | `_ef039f06c21b6775d7192b026dee447c` | `_4a04d12613c70f93105a86c3ac238134.jkddzztszm.acm-validations.aws.` |
| CNAME | `_8de36bc4e3019ff4fa43c47e335208e8.www` | `_d7ef361932c6ca31a6c5aeccc8cbdab3.jkddzztszm.acm-validations.aws.` |

Waited for propagation; confirmed certificate status changed from
"Pending validation" to **"Issued"** in the ACM console.

### 13. Add the CloudFront CNAME record in GoDaddy

| Type | Name | Value |
|---|---|---|
| CNAME | `www` | CloudFront distribution domain (e.g. `dzzfkm0af9bou.cloudfront.net`) |

Root/apex domain (`naveenknk.in` without `www`) handled via GoDaddy
domain forwarding to `https://www.naveenknk.in`, since a bare apex
domain cannot use a CNAME record per DNS rules.

### 14. Attach the custom domain and certificate to CloudFront

Distribution → **General** → **Edit** → **Add domain**:

- Alternate domain names: `naveenknk.in`, `www.naveenknk.in`
- Custom SSL certificate: the now-issued ACM certificate

Saved and waited for the distribution to redeploy.

### 15. Final test

Confirmed `https://www.naveenknk.in` loads the site correctly in
Chrome, served over HTTPS through CloudFront → OAC → private S3
bucket, with WAF managed rules active.
