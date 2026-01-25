-- Allow clients to update their own orders for budget approval
CREATE POLICY "Clients can approve budgets on their orders" ON service_orders
  FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());