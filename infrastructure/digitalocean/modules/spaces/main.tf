# GoodLifeTask — DigitalOcean Spaces Module (S3-compatible)

terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

variable "name"        { type = string }
variable "environment" { type = string }
variable "region"      { type = string }

# ─── Spaces Bucket ────────────────────────────────────────────────────────────
resource "digitalocean_spaces_bucket" "uploads" {
  name   = "${var.name}-${var.environment}-uploads"
  region = var.region
  acl    = "private"

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["*"]
    max_age_seconds = 3600
  }
}

# ─── CDN for Spaces ───────────────────────────────────────────────────────────
resource "digitalocean_cdn" "uploads" {
  origin = digitalocean_spaces_bucket.uploads.bucket_domain_name
  ttl    = 3600
}

# ─── Outputs ─────────────────────────────────────────────────────────────────
output "bucket_name"   { value = digitalocean_spaces_bucket.uploads.name }
output "bucket_region" { value = digitalocean_spaces_bucket.uploads.region }
output "endpoint"      { value = digitalocean_spaces_bucket.uploads.endpoint }
output "cdn_endpoint"  { value = digitalocean_cdn.uploads.endpoint }
