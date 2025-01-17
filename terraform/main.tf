terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Messages Table
resource "aws_dynamodb_table" "messages-np" {
  name           = "${var.environment}_Messages-np"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  range_key      = "groupId"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "groupId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  attribute {
    name = "parentId"
    type = "S"
  }

  global_secondary_index {
    name               = "GroupIdIndex"
    hash_key           = "groupId"
    range_key          = "timestamp"
    projection_type    = "ALL"
  }

  global_secondary_index {
    name               = "ParentMessageIndex"
    hash_key           = "parentId"
    range_key          = "timestamp"
    projection_type    = "ALL"
  }

  tags = {
    Environment = var.environment
  }
}

# GroupChats Table
resource "aws_dynamodb_table" "group_chats" {
  name           = "${var.environment}_GroupChats"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Environment = var.environment
  }
}

# FileMetadata Table
resource "aws_dynamodb_table" "file_metadata" {
  name           = "${var.environment}_FileMetadata"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  range_key      = "groupId"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "groupId"
    type = "S"
  }

  attribute {
    name = "messageId"
    type = "S"
  }

  attribute {
    name = "uploadedAt"
    type = "S"
  }

  global_secondary_index {
    name               = "MessageIndex"
    hash_key           = "messageId"
    projection_type    = "ALL"
  }

  global_secondary_index {
    name               = "GroupFilesIndex"
    hash_key           = "groupId"
    range_key         = "uploadedAt"
    projection_type    = "ALL"
  }

  tags = {
    Environment = var.environment
  }
}

# Users Table
resource "aws_dynamodb_table" "users" {
  name           = "${var.environment}_Users"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "displayName"
    type = "S"
  }

  attribute {
    name = "clerkId"
    type = "S"
  }

  attribute {
    name = "lastActiveAt"
    type = "N"
  }

  global_secondary_index {
    name               = "EmailIndex"
    hash_key           = "email"
    projection_type    = "ALL"
  }

  global_secondary_index {
    name               = "displayNameIndex"
    hash_key           = "displayName"
    projection_type    = "ALL"
  }

  global_secondary_index {
    name               = "ClerkIdIndex"
    hash_key           = "clerkId"
    projection_type    = "ALL"
  }

  global_secondary_index {
    name               = "LastActiveIndex"
    hash_key           = "lastActiveAt"
    projection_type    = "ALL"
  }

  tags = {
    Environment = var.environment
  }
}

# Notifications Table
resource "aws_dynamodb_table" "notifications" {
  name           = "${var.environment}_Notifications"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"
  range_key      = "timestamp"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  tags = {
    Environment = var.environment
  }
}

# UserStatus Table
resource "aws_dynamodb_table" "user_status" {
  name           = "${var.environment}_UserStatus"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  tags = {
    Environment = var.environment
  }
}

# TypingIndicators Table
resource "aws_dynamodb_table" "typing_indicators" {
  name           = "${var.environment}_TypingIndicators"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "conversationId"
  range_key      = "userId"

  attribute {
    name = "conversationId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  tags = {
    Environment = var.environment
  }
}

# Reactions Table
resource "aws_dynamodb_table" "reactions" {
  name           = "${var.environment}_Reactions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "messageId"
  range_key      = "userId"

  attribute {
    name = "messageId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  tags = {
    Environment = var.environment
  }
}

# PinnedMessages Table
resource "aws_dynamodb_table" "pinned_messages" {
  name           = "${var.environment}_PinnedMessages"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "groupId"
  range_key      = "pinnedAt"

  attribute {
    name = "groupId"
    type = "S"
  }

  attribute {
    name = "pinnedAt"
    type = "N"
  }

  tags = {
    Environment = var.environment
  }
}

# Mentions Table
resource "aws_dynamodb_table" "mentions" {
  name           = "${var.environment}_Mentions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "mentionedUserId"
  range_key      = "messageId"

  attribute {
    name = "mentionedUserId"
    type = "S"
  }

  attribute {
    name = "messageId"
    type = "S"
  }

  tags = {
    Environment = var.environment
  }
} 