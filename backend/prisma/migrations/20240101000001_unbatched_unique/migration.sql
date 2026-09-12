CREATE UNIQUE INDEX "Inventory_unbatched_unique_idx" ON "Inventory"("itemId", "locationId") WHERE "batchId" IS NULL;
