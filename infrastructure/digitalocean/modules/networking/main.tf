# GoodLifeTask — DigitalOcean Networking Module

terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

variable "name" {
  type = string
}
variable "environment" {
  type = string
}
variable "region" {
  type = string
}
variable "vpc_cidr" {
  type    = string
  default = "10.10.0.0/16"
}

resource "digitalocean_vpc" "main" {
  name     = "${var.name}-${var.environment}-vpc"
  region   = var.region
  ip_range = var.vpc_cidr
}

resource "digitalocean_firewall" "api" {
  name = "${var.name}-${var.environment}-api-fw"
  tags = ["${var.name}-${var.environment}-api"]

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
  inbound_rule {
    protocol         = "tcp"
    port_range       = "3001"
    source_addresses = [var.vpc_cidr]
  }
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

output "vpc_id"     { value = digitalocean_vpc.main.id }
output "vpc_urn"    { value = digitalocean_vpc.main.urn }
output "api_tag"    { value = "${var.name}-${var.environment}-api" }
output "worker_tag" { value = "${var.name}-${var.environment}-worker" }
