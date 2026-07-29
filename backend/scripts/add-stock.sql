UPDATE "Inventory" SET "quantityAvailable" = 100 
WHERE id IN (
  SELECT id FROM "Inventory" WHERE "quantityAvailable" = 0 LIMIT 10
);
