ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_order_id_fkey,
  ADD CONSTRAINT messages_order_id_fkey FOREIGN KEY (order_id) REFERENCES service_orders(id) ON DELETE CASCADE;

ALTER TABLE order_images
  DROP CONSTRAINT IF EXISTS order_images_order_id_fkey,
  ADD CONSTRAINT order_images_order_id_fkey FOREIGN KEY (order_id) REFERENCES service_orders(id) ON DELETE CASCADE;

ALTER TABLE order_status_history
  DROP CONSTRAINT IF EXISTS order_status_history_order_id_fkey,
  ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES service_orders(id) ON DELETE CASCADE;

ALTER TABLE approval_history
  DROP CONSTRAINT IF EXISTS approval_history_order_id_fkey,
  ADD CONSTRAINT approval_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES service_orders(id) ON DELETE CASCADE;

ALTER TABLE service_order_items
  DROP CONSTRAINT IF EXISTS service_order_items_service_order_id_fkey,
  ADD CONSTRAINT service_order_items_service_order_id_fkey FOREIGN KEY (service_order_id) REFERENCES service_orders(id) ON DELETE CASCADE;

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_os_id_fkey,
  ADD CONSTRAINT appointments_os_id_fkey FOREIGN KEY (os_id) REFERENCES service_orders(id) ON DELETE CASCADE;

ALTER TABLE ai_knowledge_events
  DROP CONSTRAINT IF EXISTS ai_knowledge_events_os_id_fkey,
  ADD CONSTRAINT ai_knowledge_events_os_id_fkey FOREIGN KEY (os_id) REFERENCES service_orders(id) ON DELETE CASCADE;

ALTER TABLE ai_similar_cases
  DROP CONSTRAINT IF EXISTS ai_similar_cases_os_id_fkey,
  ADD CONSTRAINT ai_similar_cases_os_id_fkey FOREIGN KEY (os_id) REFERENCES service_orders(id) ON DELETE CASCADE;

ALTER TABLE ai_similar_cases
  DROP CONSTRAINT IF EXISTS ai_similar_cases_similar_os_id_fkey,
  ADD CONSTRAINT ai_similar_cases_similar_os_id_fkey FOREIGN KEY (similar_os_id) REFERENCES service_orders(id) ON DELETE CASCADE;
