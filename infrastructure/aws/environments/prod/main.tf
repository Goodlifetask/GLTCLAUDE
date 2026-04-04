terraform {
  required_version = ">= 1.8"

  backend "s3" {
    bucket         = "glt-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "glt-terraform-locks"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "GoodLifeTask"
      Environment = "production"
      ManagedBy   = "Terraform"
    }
  }
}

# ─── Networking ───────────────────────────────────────────────────────────────
module "networking" {
  source = "../../modules/networking"

  name        = "glt"
  environment = "prod"
  vpc_cidr    = "10.0.0.0/16"
}

# ─── Aurora PostgreSQL ────────────────────────────────────────────────────────
module "rds" {
  source = "../../modules/rds"

  name               = "glt"
  environment        = "prod"
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.private_subnet_ids
  security_group_ids = [module.networking.rds_security_group]

  engine_version     = "16.1"
  instance_class     = "db.r6g.large"  # 2 vCPU, 16 GB RAM
  replica_count      = 2               # 2 read replicas
  storage_encrypted  = true
  backup_window      = "03:00-04:00"
  maintenance_window = "Sun:04:00-Sun:05:00"
  backup_retention   = 30              # 30-day point-in-time recovery
}

# ─── ElastiCache Redis ────────────────────────────────────────────────────────
module "elasticache" {
  source = "../../modules/elasticache"

  name               = "glt"
  environment        = "prod"
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.private_subnet_ids
  security_group_ids = [module.networking.redis_security_group]

  node_type        = "cache.r6g.large"
  num_cache_nodes  = 3   # Redis cluster mode with 3 shards
  engine_version   = "7.1"
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}

# ─── ECS Cluster ─────────────────────────────────────────────────────────────
module "ecs" {
  source = "../../modules/ecs"

  name        = "glt"
  environment = "prod"
  vpc_id      = module.networking.vpc_id

  public_subnet_ids  = module.networking.public_subnet_ids
  private_subnet_ids = module.networking.private_subnet_ids
  alb_security_group = module.networking.alb_security_group
  api_security_group = module.networking.api_security_group

  # API Service
  api_image          = "${var.ecr_registry}/glt-api:latest"
  api_cpu            = 512
  api_memory         = 1024
  api_desired_count  = 2
  api_min_capacity   = 2
  api_max_capacity   = 20

  # Worker Service
  worker_image        = "${var.ecr_registry}/glt-worker:latest"
  worker_cpu          = 256
  worker_memory       = 512
  worker_desired_count = 2
  worker_min_capacity  = 2
  worker_max_capacity  = 10
}

# ─── S3 Buckets ───────────────────────────────────────────────────────────────
module "s3" {
  source = "../../modules/s3"

  name        = "glt"
  environment = "prod"
}

# ─── Variables ───────────────────────────────────────────────────────────────
variable "aws_region"    { type = string  default = "us-east-1" }
variable "ecr_registry"  { type = string }

# ─── Outputs ─────────────────────────────────────────────────────────────────
output "api_endpoint"    { value = module.ecs.alb_dns_name }
output "rds_endpoint"    { value = module.rds.cluster_endpoint }
output "redis_endpoint"  { value = module.elasticache.primary_endpoint }
