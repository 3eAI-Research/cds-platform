-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "contract";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "demand";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notification";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "offer";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "payment";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "provider";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "review";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "shared";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "transport";

-- CreateTable
CREATE TABLE "contract"."contracts" (
    "id" UUID NOT NULL,
    "demand_id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "customer_user_id" UUID NOT NULL,
    "provider_user_id" UUID NOT NULL,
    "provider_company_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "agreed_price_amount" INTEGER NOT NULL,
    "agreed_price_currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "commission_amount" INTEGER NOT NULL,
    "commission_currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "vat_amount" INTEGER NOT NULL,
    "vat_currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "service_date" TIMESTAMP(3) NOT NULL,
    "service_description" TEXT NOT NULL,
    "customer_accepted_at" TIMESTAMP(3),
    "provider_accepted_at" TIMESTAMP(3),
    "pdf_storage_key" TEXT,
    "pdf_generated_at" TIMESTAMP(3),
    "cancelled_by" UUID,
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract"."contract_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "html_template" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract"."processed_events" (
    "idempotency_key" TEXT NOT NULL,
    "event_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("idempotency_key")
);

-- CreateTable
CREATE TABLE "demand"."demands" (
    "id" UUID NOT NULL,
    "customer_user_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "service_type" TEXT NOT NULL,
    "transportation_id" UUID NOT NULL,
    "accepted_offer_id" UUID,
    "additional_notes" TEXT,
    "preferred_locale" VARCHAR(5) NOT NULL DEFAULT 'de',
    "expires_at" TIMESTAMP(3),
    "offer_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "last_accessed_at" TIMESTAMP(3),
    "last_accessed_by" UUID,

    CONSTRAINT "demands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand"."processed_events" (
    "idempotency_key" TEXT NOT NULL,
    "event_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("idempotency_key")
);

-- CreateTable
CREATE TABLE "notification"."notifications" (
    "id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "locale" VARCHAR(5) NOT NULL DEFAULT 'de',
    "reference_type" TEXT,
    "reference_id" UUID,
    "read_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification"."processed_events" (
    "idempotency_key" TEXT NOT NULL,
    "event_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("idempotency_key")
);

-- CreateTable
CREATE TABLE "offer"."offers" (
    "id" UUID NOT NULL,
    "demand_id" UUID NOT NULL,
    "provider_user_id" UUID NOT NULL,
    "provider_company_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "total_price_amount" INTEGER NOT NULL,
    "total_price_currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "commission_amount" INTEGER NOT NULL,
    "commission_rate" DOUBLE PRECISION NOT NULL,
    "provider_net_amount" INTEGER NOT NULL,
    "vat_amount" INTEGER NOT NULL,
    "vat_rate" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "submitted_at" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3) NOT NULL,
    "price_breakdown" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer"."processed_events" (
    "idempotency_key" TEXT NOT NULL,
    "event_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("idempotency_key")
);

-- CreateTable
CREATE TABLE "payment"."payment_transactions" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "demand_id" UUID NOT NULL,
    "customer_user_id" UUID NOT NULL,
    "provider_user_id" UUID NOT NULL,
    "provider_company_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "total_currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "commission_amount" INTEGER NOT NULL,
    "commission_rate" DOUBLE PRECISION NOT NULL,
    "provider_net_amount" INTEGER NOT NULL,
    "vat_amount" INTEGER NOT NULL,
    "vat_rate" DOUBLE PRECISION NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "stripe_transfer_id" TEXT,
    "initiated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "transferred_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment"."processed_events" (
    "idempotency_key" TEXT NOT NULL,
    "event_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("idempotency_key")
);

-- CreateTable
CREATE TABLE "provider"."provider_companies" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "tax_number" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "deposit_amount" INTEGER NOT NULL DEFAULT 0,
    "deposit_currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "deposit_paid_at" TIMESTAMP(3),
    "deposit_payment_reference" TEXT,
    "stripe_connected_account_id" TEXT,
    "supported_post_code_prefixes" TEXT[],
    "average_rating" DOUBLE PRECISION,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "completed_job_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "provider_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider"."provider_employees" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "provider_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider"."provider_documents" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "provider_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider"."provider_addresses" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "street" TEXT NOT NULL,
    "house_number" TEXT NOT NULL,
    "post_code" VARCHAR(10) NOT NULL,
    "place_name" TEXT NOT NULL,
    "country_code" VARCHAR(3) NOT NULL DEFAULT 'DE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider"."processed_events" (
    "idempotency_key" TEXT NOT NULL,
    "event_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("idempotency_key")
);

-- CreateTable
CREATE TABLE "review"."reviews" (
    "id" UUID NOT NULL,
    "demand_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "reviewer_user_id" UUID NOT NULL,
    "reviewee_user_id" UUID NOT NULL,
    "direction" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "aspect_ratings" JSONB,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review"."review_aggregates" (
    "id" UUID NOT NULL,
    "reviewee_user_id" UUID NOT NULL,
    "direction" TEXT NOT NULL,
    "average_rating" DOUBLE PRECISION NOT NULL,
    "total_reviews" INTEGER NOT NULL,
    "rating_distribution" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review"."processed_events" (
    "idempotency_key" TEXT NOT NULL,
    "event_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("idempotency_key")
);

-- CreateTable
CREATE TABLE "shared"."user_references" (
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_references_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "shared"."consent_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "consent_type" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared"."countries" (
    "id" UUID NOT NULL,
    "iso_code" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "localized_name" JSONB NOT NULL,
    "phone_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared"."post_codes" (
    "id" UUID NOT NULL,
    "country_code" VARCHAR(3) NOT NULL,
    "post_code" VARCHAR(10) NOT NULL,
    "place_name" TEXT NOT NULL,
    "admin_name_1" TEXT,
    "admin_name_2" TEXT,
    "admin_name_3" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "post_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared"."processed_events" (
    "idempotency_key" TEXT NOT NULL,
    "event_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("idempotency_key")
);

-- CreateTable
CREATE TABLE "transport"."estate_types" (
    "id" UUID NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "estate_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport"."estate_part_types" (
    "id" UUID NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_outer_part" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "estate_part_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport"."estate_type_part_type_map" (
    "id" UUID NOT NULL,
    "estate_type_id" UUID NOT NULL,
    "estate_part_type_id" UUID NOT NULL,
    "is_main_type" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "estate_type_part_type_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport"."furniture_group_types" (
    "id" UUID NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "furniture_group_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport"."furniture_types" (
    "id" UUID NOT NULL,
    "furniture_group_type_id" UUID NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "volume" DOUBLE PRECISION NOT NULL,
    "assemblable" BOOLEAN NOT NULL DEFAULT false,
    "disassemble_cost" INTEGER,
    "assemble_cost" INTEGER,
    "flat_rate" INTEGER,
    "calculation_type" TEXT NOT NULL DEFAULT 'COUNT',

    CONSTRAINT "furniture_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport"."addresses" (
    "id" UUID NOT NULL,
    "street" TEXT NOT NULL,
    "house_number" TEXT NOT NULL,
    "post_code" VARCHAR(10) NOT NULL,
    "place_name" TEXT NOT NULL,
    "country_code" VARCHAR(3) NOT NULL DEFAULT 'DE',
    "additional_info" TEXT,
    "floor" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport"."estates" (
    "id" UUID NOT NULL,
    "estate_type_id" UUID NOT NULL,
    "address_id" UUID NOT NULL,
    "total_square_meters" DOUBLE PRECISION NOT NULL,
    "number_of_floors" INTEGER NOT NULL DEFAULT 1,
    "number_of_rooms" INTEGER NOT NULL,
    "elevator_type" TEXT NOT NULL DEFAULT 'NONE',
    "walking_way_meters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "halteverbot_required" BOOLEAN NOT NULL DEFAULT false,
    "furniture_montage" BOOLEAN NOT NULL DEFAULT false,
    "kitchen_montage" BOOLEAN NOT NULL DEFAULT false,
    "packing_service" BOOLEAN NOT NULL DEFAULT false,
    "has_cellar" BOOLEAN NOT NULL DEFAULT false,
    "cellar_square_meters" DOUBLE PRECISION,
    "has_loft" BOOLEAN NOT NULL DEFAULT false,
    "loft_square_meters" DOUBLE PRECISION,
    "has_garden_garage" BOOLEAN NOT NULL DEFAULT false,
    "garden_garage_square_meters" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "estates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport"."estate_parts" (
    "id" UUID NOT NULL,
    "estate_id" UUID NOT NULL,
    "estate_part_type_id" UUID NOT NULL,
    "custom_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estate_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport"."furniture_items" (
    "id" UUID NOT NULL,
    "estate_part_id" UUID NOT NULL,
    "furniture_type_id" UUID NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "calculated_volume" DOUBLE PRECISION,

    CONSTRAINT "furniture_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport"."transportations" (
    "id" UUID NOT NULL,
    "transport_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "from_estate_id" UUID NOT NULL,
    "to_estate_id" UUID NOT NULL,
    "from_address_id" UUID NOT NULL,
    "to_address_id" UUID NOT NULL,
    "number_of_people" INTEGER NOT NULL,
    "preferred_date_start" TIMESTAMP(3) NOT NULL,
    "preferred_date_end" TIMESTAMP(3) NOT NULL,
    "date_flexibility" BOOLEAN NOT NULL DEFAULT false,
    "estimated_volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimated_distance_km" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "additional_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "transportations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport"."processed_events" (
    "idempotency_key" TEXT NOT NULL,
    "event_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("idempotency_key")
);

-- CreateIndex
CREATE INDEX "contracts_demand_id_idx" ON "contract"."contracts"("demand_id");

-- CreateIndex
CREATE INDEX "contracts_customer_user_id_idx" ON "contract"."contracts"("customer_user_id");

-- CreateIndex
CREATE INDEX "contracts_provider_company_id_idx" ON "contract"."contracts"("provider_company_id");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contract"."contracts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_offer_id_key" ON "contract"."contracts"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_templates_locale_is_default_key" ON "contract"."contract_templates"("locale", "is_default");

-- CreateIndex
CREATE INDEX "demands_customer_user_id_idx" ON "demand"."demands"("customer_user_id");

-- CreateIndex
CREATE INDEX "demands_status_idx" ON "demand"."demands"("status");

-- CreateIndex
CREATE INDEX "demands_created_at_idx" ON "demand"."demands"("created_at");

-- CreateIndex
CREATE INDEX "demands_status_created_at_idx" ON "demand"."demands"("status", "created_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_idx" ON "notification"."notifications"("recipient_user_id");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notification"."notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notification"."notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_reference_type_reference_id_idx" ON "notification"."notifications"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "offers_demand_id_idx" ON "offer"."offers"("demand_id");

-- CreateIndex
CREATE INDEX "offers_provider_company_id_idx" ON "offer"."offers"("provider_company_id");

-- CreateIndex
CREATE INDEX "offers_status_idx" ON "offer"."offers"("status");

-- CreateIndex
CREATE INDEX "offers_demand_id_status_idx" ON "offer"."offers"("demand_id", "status");

-- CreateIndex
CREATE INDEX "payment_transactions_contract_id_idx" ON "payment"."payment_transactions"("contract_id");

-- CreateIndex
CREATE INDEX "payment_transactions_demand_id_idx" ON "payment"."payment_transactions"("demand_id");

-- CreateIndex
CREATE INDEX "payment_transactions_provider_company_id_idx" ON "payment"."payment_transactions"("provider_company_id");

-- CreateIndex
CREATE INDEX "payment_transactions_type_idx" ON "payment"."payment_transactions"("type");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment"."payment_transactions"("status");

-- CreateIndex
CREATE INDEX "provider_companies_owner_user_id_idx" ON "provider"."provider_companies"("owner_user_id");

-- CreateIndex
CREATE INDEX "provider_companies_status_idx" ON "provider"."provider_companies"("status");

-- CreateIndex
CREATE INDEX "provider_employees_user_id_idx" ON "provider"."provider_employees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_employees_company_id_user_id_key" ON "provider"."provider_employees"("company_id", "user_id");

-- CreateIndex
CREATE INDEX "provider_documents_company_id_idx" ON "provider"."provider_documents"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_addresses_company_id_key" ON "provider"."provider_addresses"("company_id");

-- CreateIndex
CREATE INDEX "reviews_reviewee_user_id_idx" ON "review"."reviews"("reviewee_user_id");

-- CreateIndex
CREATE INDEX "reviews_direction_idx" ON "review"."reviews"("direction");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "review"."reviews"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_contract_id_direction_key" ON "review"."reviews"("contract_id", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "review_aggregates_reviewee_user_id_direction_key" ON "review"."review_aggregates"("reviewee_user_id", "direction");

-- CreateIndex
CREATE INDEX "consent_records_user_id_idx" ON "shared"."consent_records"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso_code_key" ON "shared"."countries"("iso_code");

-- CreateIndex
CREATE INDEX "post_codes_post_code_idx" ON "shared"."post_codes"("post_code");

-- CreateIndex
CREATE UNIQUE INDEX "post_codes_country_code_post_code_key" ON "shared"."post_codes"("country_code", "post_code");

-- CreateIndex
CREATE UNIQUE INDEX "estate_type_part_type_map_estate_type_id_estate_part_type_i_key" ON "transport"."estate_type_part_type_map"("estate_type_id", "estate_part_type_id");

-- CreateIndex
CREATE INDEX "furniture_types_furniture_group_type_id_idx" ON "transport"."furniture_types"("furniture_group_type_id");

-- CreateIndex
CREATE INDEX "addresses_post_code_idx" ON "transport"."addresses"("post_code");

-- CreateIndex
CREATE INDEX "estate_parts_estate_id_idx" ON "transport"."estate_parts"("estate_id");

-- CreateIndex
CREATE INDEX "furniture_items_estate_part_id_idx" ON "transport"."furniture_items"("estate_part_id");

-- AddForeignKey
ALTER TABLE "provider"."provider_employees" ADD CONSTRAINT "provider_employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "provider"."provider_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider"."provider_documents" ADD CONSTRAINT "provider_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "provider"."provider_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider"."provider_addresses" ADD CONSTRAINT "provider_addresses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "provider"."provider_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport"."estate_type_part_type_map" ADD CONSTRAINT "estate_type_part_type_map_estate_type_id_fkey" FOREIGN KEY ("estate_type_id") REFERENCES "transport"."estate_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport"."estate_type_part_type_map" ADD CONSTRAINT "estate_type_part_type_map_estate_part_type_id_fkey" FOREIGN KEY ("estate_part_type_id") REFERENCES "transport"."estate_part_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport"."furniture_types" ADD CONSTRAINT "furniture_types_furniture_group_type_id_fkey" FOREIGN KEY ("furniture_group_type_id") REFERENCES "transport"."furniture_group_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport"."estate_parts" ADD CONSTRAINT "estate_parts_estate_id_fkey" FOREIGN KEY ("estate_id") REFERENCES "transport"."estates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport"."furniture_items" ADD CONSTRAINT "furniture_items_estate_part_id_fkey" FOREIGN KEY ("estate_part_id") REFERENCES "transport"."estate_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport"."transportations" ADD CONSTRAINT "transportations_from_estate_id_fkey" FOREIGN KEY ("from_estate_id") REFERENCES "transport"."estates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport"."transportations" ADD CONSTRAINT "transportations_to_estate_id_fkey" FOREIGN KEY ("to_estate_id") REFERENCES "transport"."estates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport"."transportations" ADD CONSTRAINT "transportations_from_address_id_fkey" FOREIGN KEY ("from_address_id") REFERENCES "transport"."addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport"."transportations" ADD CONSTRAINT "transportations_to_address_id_fkey" FOREIGN KEY ("to_address_id") REFERENCES "transport"."addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
