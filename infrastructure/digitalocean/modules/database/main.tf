# GoodLifeTask — DigitalOcean Managed PostgreSQL Module

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
variable "pg_version" {
  type    = string
  default = "16"
}

resource "digitalocean_database_cluster" "postgres" {
  name                 = "${var.name}-${var.environment}-postgres"
  engine               = "pg"
  version              = var.pg_version
  size                 = var.size
  region               = var.region
  node_count           = var.node_count
  private_network_uuid = var.vpc_id

  tags = [var.name, var.environment, "postgres"]
}

resource "digitalocean_database_db" "app" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "goodlifetask"
}

resource "digitalocean_database_user" "app" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "glt_user"
}

resource "digitalocean_database_firewall" "postgres" {
  cluster_id = digitalocean_database_cluster.postgres.id
  rule {
    type  = "ip_addr"
    value = "0.0.0.0/0"
  }
}

output "cluster_id" { value = digitalocean_database_cluster.postgres.id }
output "host"       { value = digitalocean_database_cluster.postgres.private_host }
output "port"       { value = digitalocean_database_cluster.postgres.port }
output "database"   { value = digitalocean_database_db.app.name }
output "username"   { value = digitalocean_database_user.app.name }

output "password" {
  value     = digitalocean_database_user.app.password
  sensitive = true
}

output "database_url" {
  value     = "postgresql://${digitalocean_database_user.app.name}:${digitalocean_database_user.app.password}@${digitalocean_database_cluster.postgres.private_host}:${digitalocean_database_cluster.postgres.port}/goodlifetask?sslmode=require"
  sensitive = true
}
