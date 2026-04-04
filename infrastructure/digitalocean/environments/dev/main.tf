terraform {
  required_version = ">= 1.8"

  # Store state in DigitalOcean Spaces
  backend "s3" {
    endpoint                    = "https://nyc3.digitaloceanspaces.com"
    bucket                      = "glt-terraform-state"
    key                         = "dev/terraform.tfstate"
    region                      = "us-east-1"    # Required field, ignored by DO
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    force_path_style            = true
  }

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

# ─── Networking ───────────────────────────────────────────────────────────────
module "networking" {
  source      = "../../modules/networking"
  name        = "glt"
  environment = "dev"
  region      = var.region
  vpc_cidr    = "10.10.0.0/16"
}

# ─── PostgreSQL — dev (1 node, smallest) ─────────────────────────────────────
module "database" {
  source      = "../../modules/database"
  name        = "glt"
  environment = "dev"
  region      = var.region
  vpc_id      = module.networking.vpc_id
  size        = "db-s-1vcpu-1gb"   # ~$15/mo
  node_count  = 1
}

# ─── Redis — dev (1 node, smallest) ──────────────────────────────────────────
module "redis" {
  source      = "../../modules/redis"
  name        = "glt"
  environment = "dev"
  region      = var.region
  vpc_id      = module.networking.vpc_id
  size        = "db-s-1vcpu-1gb"   # ~$15/mo
  node_count  = 1
}

# ─── Spaces bucket ────────────────────────────────────────────────────────────
module "spaces" {
  source      = "../../modules/spaces"
  name        = "glt"
  environment = "dev"
  region      = var.region
}

# ─── API + Worker Droplet (single droplet, runs both via Docker Compose) ──────
module "api" {
  source      = "../../modules/droplet"
  name        = "glt"
  environment = "dev"
  role        = "api"
  region      = var.region
  size        = "s-2vcpu-4gb"   # ~$24/mo
  count_      = 1
  vpc_id      = module.networking.vpc_id
  ssh_key_ids = var.ssh_key_ids

  user_data = templatefile("${path.module}/cloud-init.yaml", {
    database_url     = module.database.database_url
    redis_url        = module.redis.redis_url
    jwt_secret       = var.jwt_secret
    spaces_key       = var.spaces_key
    spaces_secret    = var.spaces_secret
    spaces_bucket    = module.spaces.bucket_name
    spaces_region    = var.region
    frontend_url     = var.frontend_url
    anthropic_key    = var.anthropic_key
    environment      = "development"
  })
}

# ─── Variables ────────────────────────────────────────────────────────────────
variable "do_token"       { type = string  sensitive = true  description = "DigitalOcean API token" }
variable "region"         { type = string  default = "nyc3"  description = "DO region slug" }
variable "ssh_key_ids"    { type = list(string)               description = "SSH key IDs from DO account" }
variable "jwt_secret"     { type = string  sensitive = true }
variable "spaces_key"     { type = string  sensitive = true  description = "DO Spaces access key" }
variable "spaces_secret"  { type = string  sensitive = true  description = "DO Spaces secret key" }
variable "frontend_url"   { type = string  default = "http://localhost:3000" }
variable "anthropic_key"  { type = string  sensitive = true }

# ─── Outputs ─────────────────────────────────────────────────────────────────
output "api_ip"          { value = module.api.ipv4s[0] }
output "api_url"         { value = "http://${module.api.ipv4s[0]}:3001" }
output "database_url"    { value = module.database.database_url  sensitive = true }
output "redis_url"       { value = module.redis.redis_url        sensitive = true }
output "spaces_endpoint" { value = module.spaces.cdn_endpoint }
