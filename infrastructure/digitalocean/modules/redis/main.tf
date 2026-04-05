# GoodLifeTask — DigitalOcean Managed Redis Module

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
variable "vpc_id" {
  type = string
}
variable "node_count" {
  type    = number
  default = 1
}
variable "size" {
  type    = string
  default = "db-s-1vcpu-1gb"
}
variable "redis_version" {
  type    = string
  default = "7"
}

resource "digitalocean_database_cluster" "redis" {
  name                 = "${var.name}-${var.environment}-redis"
  engine               = "redis"
  version              = var.redis_version
  size                 = var.size
  region               = var.region
  node_count           = var.node_count
  private_network_uuid = var.vpc_id

  tags = [var.name, var.environment, "redis"]
}

resource "digitalocean_database_firewall" "redis" {
  cluster_id = digitalocean_database_cluster.redis.id
  rule {
    type  = "ip_addr"
    value = "0.0.0.0/0"
  }
}

output "host" { value = digitalocean_database_cluster.redis.private_host }
output "port" { value = digitalocean_database_cluster.redis.port }

output "password" {
  value     = digitalocean_database_cluster.redis.password
  sensitive = true
}

output "redis_url" {
  value     = "rediss://:${digitalocean_database_cluster.redis.password}@${digitalocean_database_cluster.redis.private_host}:${digitalocean_database_cluster.redis.port}"
  sensitive = true
}
