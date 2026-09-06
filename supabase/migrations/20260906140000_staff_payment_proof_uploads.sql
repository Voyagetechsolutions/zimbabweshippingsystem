-- Finance staff may attach a received proof to an existing customer's shipment.
-- Customer uploads remain limited to their own account by the existing policy.

drop policy if exists "Finance records customer payment proofs" on public.payment_proofs;
create policy "Finance records customer payment proofs" on public.payment_proofs
  for insert to authenticated
  with check (public.is_finance_staff());

drop policy if exists "Finance uploads customer payment proofs" on storage.objects;
create policy "Finance uploads customer payment proofs" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-proofs' and public.is_finance_staff());
