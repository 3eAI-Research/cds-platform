-- =============================================================================
-- CDS Platform — PostgreSQL Schema Initialization
--
-- Creates the 9 PostgreSQL schemas used by Prisma multi-schema.
-- This runs automatically on first `docker compose up`.
-- Prisma migrations will create tables within these schemas.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS shared;
CREATE SCHEMA IF NOT EXISTS demand;
CREATE SCHEMA IF NOT EXISTS offer;
CREATE SCHEMA IF NOT EXISTS transport;
CREATE SCHEMA IF NOT EXISTS provider;
CREATE SCHEMA IF NOT EXISTS contract;
CREATE SCHEMA IF NOT EXISTS payment;
CREATE SCHEMA IF NOT EXISTS review;
CREATE SCHEMA IF NOT EXISTS notification;
