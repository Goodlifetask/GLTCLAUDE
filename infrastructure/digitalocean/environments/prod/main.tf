terraform {
  required_version = ">= 1.8"

  backend "s3" {
    endpoint                    = "https://nyc3.digitaloceanspaces.com"
    bucket                      = "glt-terraform-state"
    key                         = "prod/terraform.tfstate"
    region                      = "us-east-1"
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
  environment = "prod"
  region      = var.region
  vpc_cidr    = "10.20.0.0/16"
}

# ─── PostgreSQL — prod (2 nodes for standby HA) ───────────────────────────────
module "database" {
  source      = "../../modules/database"
  name        = "glt"
  environment = "prod"
  region      = var.region
  vpc_id      = module.networking.vpc_id
  size        = "db-s-2vcpu-4gb"   # ~$50/mo
  node_count  = 2                  # Primary + standby
}

# ─── Redis — prod (1 node) ────────────────────────────────────────────────────
module "redis" {
  source      = "../../modules/redis"
  name        = "glt"
  environment = "prod"
  region      = var.region
  vpc_id      = module.networking.vpc_id
  size        = "db-s-1vcpu-2gb"   # ~$25/mo
  node_count  = 1
}

# ─── Spaces bucket ────────────────────────────────────────────────────────────
module "spaces" {
  source      = "../../modules/spaces"
  name        = "glt"
  environment = "prod"
  region      = var.region
}

# ─── API Droplets (2 behind load balancer) ────────────────────────────────────
module "api" {
  source      = "../../modules/droplet"
  name        = "glt"
  environment = "prod"
  role        = "api"
  region      = var.region
  size        = "s-2vcpu-4gb"   # ~$24/mo each
  count_      = 2
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
    frontend_url     = "https://${var.domain}"
    anthropic_key    = var.anthropic_key
    environment      = "production"
  })
}

# ─── Worker Droplet (1 dedicated) ────────────────────────────────────────────
module "workers" {
  source      = "../../modules/droplet"
  name        = "glt"
  environment = "prod"
  role        = "worker"
  region      = var.region
  size        = "s-1vcpu-2gb"   # ~$12/mo
  count_      = 1
  vpc_id      = module.networking.vpc_id
  ssh_key_ids = var.ssh_key_ids

  user_data = templatefile("${path.module}/cloud-init-worker.yaml", {
    database_url     = module.database.database_url
    redis_url        = module.redis.redis_url
    jwt_secret       = var.jwt_secret
    environment      = "production"
  })
}

# ─── Load Balancer ────────────────────────────────────────────────────────────
resource "digitalocean_loadbalancer" "api" {
  name   = "glt-prod-lb"
  region = var.region

  forwarding_rule {
    entry_port      = 443
    entry_protocol  = "https"
    target_port     = 3001
    target_protocol = "http"
    certificate_name = digitalocean_certificate.api.name
  }

  forwarding_rule {
    entry_port      = 80
    entry_protocol  = "http"
    target_port     = 3001
    target_protocol = "http"
  }

  healthcheck {
    port     = 3001
    protocol = "http"
    path     = "/health"
  }

  droplet_tag = module.networking.api_tag
  vpc_uuid    = module.networking.vpc_id
}

# ─── SSL Certificate ─────────────────────────────────────────────────────────
resource "digitalocean_certificate" "api" {
  name    = "glt-prod-cert"
  type    = "lets_encrypt"
  domains = ["api.${var.domain}"]
}

# ─── App Platform: Web (Next.js) ──────────────────────────────────────────────
resource "digitalocean_app" "web" {
  spec {
    name   = "glt-prod-web"
    region = var.region

    service {
      name               = "web"
      instance_count     = 1
      instance_size_slug = "basic-xxs"   # ~$5/mo

      github {
        repo           = "Goodlifetask/GLTCLAUDE"
        branch         = "master"
        deploy_on_push = true
      }

      source_dir    = "apps/web"
      build_command = "pnpm install --frozen-lockfile && pnpm build"
      run_command   = "pnpm start"

      http_port = 3000

      env {
        key   = "NEXT_PUBLIC_API_URL"
        value = "https://api.${var.domain}/api/v1"
        scope = "RUN_AND_BUILD_TIME"
      }

      routes {
        path = "/"
      }
    }

    domain {
      name = var.domain
      type = "PRIMARY"
    }
  }
}

# ─── App Platform: Admin (Next.js) ───────────────────────────────────────────
resource "digitalocean_app" "admin" {
  spec {
    name   = "glt-prod-admin"
    region = var.region

    service {
      name               = "admin"
      instance_count     = 1
      instance_size_slug = "basic-xxs"   # ~$5/mo

      github {
        repo           = "Goodlifetask/GLTCLAUDE"
        branch         = "master"
        deploy_on_push = true
      }

      source_dir    = "apps/admin"
      build_command = "pnpm install --frozen-lockfile && pnpm build"
      run_command   = "pnpm start"

      http_port = 3002

      env {
        key   = "NEXT_PUBLIC_API_URL"
        value = "https://api.${var.domain}/api/v1"
        scope = "RUN_AND_BUILD_TIME"
      }
      env {
        key   = "ANTHROPIC_API_KEY"
        value = var.anthropic_key
        scope = "RUN_TIME"
        type  = "SECRET"
      }

      routes {
        path = "/"
      }
    }

    domain {
      name = "admin.${var.domain}"
      type = "PRIMARY"
    }
  }
}

# ─── Variables ────────────────────────────────────────────────────────────────
variable "do_token"       { type = string  sensitive = true }
variable "region"         { type = string  default = "nyc3" }
variable "domain"         { type = string  description = "e.g. goodlifetask.com" }
variable "ssh_key_ids"    { type = list(string) }
variable "jwt_secret"     { type = string  sensitive = true }
variable "spaces_key"     { type = string  sensitive = true }
variable "spaces_secret"  { type = string  sensitive = true }
variable "anthropic_key"  { type = string  sensitive = true }

# ─── Outputs ─────────────────────────────────────────────────────────────────
output "load_balancer_ip" { value = digitalocean_loadbalancer.api.ip }
output "web_url"          { value = "https://${var.domain}" }
output "admin_url"        { value = "https://admin.${var.domain}" }
output "api_url"          { value = "https://api.${var.domain}" }
output "database_url"     { value = module.database.database_url  sensitive = true }
output "redis_url"        { value = module.redis.redis_url        sensitive = true }
