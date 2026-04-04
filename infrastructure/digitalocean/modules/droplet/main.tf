# GoodLifeTask — DigitalOcean Droplet Module
# Creates one or more droplets for running the API / Workers via Docker.

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
variable "role"        { type = string }   # "api" or "worker"
variable "region"      { type = string }
variable "size"        { type = string  default = "s-2vcpu-4gb" }
variable "count_"      { type = number  default = 1 }
variable "vpc_id"      { type = string }
variable "ssh_key_ids" { type = list(string) }
variable "user_data"   { type = string  default = "" }

# ─── Droplet(s) ───────────────────────────────────────────────────────────────
resource "digitalocean_droplet" "main" {
  count  = var.count_
  name   = "${var.name}-${var.environment}-${var.role}-${count.index + 1}"
  image  = "ubuntu-22-04-x64"
  size   = var.size
  region = var.region

  vpc_uuid  = var.vpc_id
  ssh_keys  = var.ssh_key_ids
  user_data = var.user_data

  tags = [
    "${var.name}-${var.environment}-${var.role}",
    "${var.name}",
    var.environment,
  ]
}

# ─── Outputs ─────────────────────────────────────────────────────────────────
output "ids"         { value = digitalocean_droplet.main[*].id }
output "ipv4s"       { value = digitalocean_droplet.main[*].ipv4_address }
output "private_ips" { value = digitalocean_droplet.main[*].ipv4_address_private }
output "urns"        { value = digitalocean_droplet.main[*].urn }
