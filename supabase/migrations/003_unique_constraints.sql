-- Unique constraints for upsert support
ALTER TABLE schools ADD CONSTRAINT schools_name_unique UNIQUE (name);
