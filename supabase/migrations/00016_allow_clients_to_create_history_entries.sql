-- Allow clients to insert history entries for their own orders
CREATE POLICY "Clients can create history for their orders" ON order_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_orders so
      WHERE so.id = order_status_history.order_id
      AND so.client_id = auth.uid()
    )
  );