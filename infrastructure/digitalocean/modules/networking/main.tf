# GoodLifeTask — DigitalOcean Networking Module
# Creates a VPC and firewall rules for the environment.

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
variable "vpc_cidr"    { type = string  default = "10.10.0.0/16" }

# ─── VPC ─────────────────────────────────────────────────────────────────────
resource "digitalocean_vpc" "main" {
  name     = "${var.name}-${var.environment}-vpc"
  region   = var.region
  ip_range = var.vpc_cidr
}

# ─── Firewall: API Droplets ───────────────────────────────────────────────────
resource "digitalocean_firewall" "api" {
  name = "${var.name}-${var.environment}-api-fw"

  tags = ["${var.name}-${var.environment}-api"]

  # Allow HTTP/HTTPS from anywhere (load balancer handles TLS termination)
  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }
  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }
  # Allow API port from within VPC only
  inbound_rule {
    protocol         = "tcp"
    port_range       = "3001"
    source_addresses = [var.vpc_cidr]
  }
  # Allow SSH from anywhere (lock this down to your IP in production)
  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

# ─── Outputs ─────────────────────────────────────────────────────────────────
output "vpc_id"      { value = digitalocean_vpc.main.id }
output "vpc_urn"     { value = digitalocean_vpc.main.urn }
output "api_tag"     { value = "${var.name}-${var.environment}-api" }
output "worker_tag"  { value = "${var.name}-${var.environment}-worker" }
