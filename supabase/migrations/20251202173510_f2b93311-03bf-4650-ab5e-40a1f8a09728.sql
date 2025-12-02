-- Allow guest bookings (no login required)
CREATE POLICY "Allow guest shipment creation" 
ON public.shipments 
FOR INSERT 
WITH CHECK (user_id IS NULL OR user_id = auth.uid());