-- Reassert service-only execution privileges for cancellation and historical
-- refund functions. The canonical bootstrap already contains these revokes,
-- but the existing hosted Dev project predates the squashed schema.

revoke all on function public.prepare_order_cancellation(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.cancel_unpaid_order(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.request_paid_order_refund(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.record_paymongo_refund_result(uuid, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.fail_paymongo_refund_request(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.process_paymongo_refund_event(text, text, text, numeric, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.request_manual_refund_fallback(uuid, uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function public.prepare_order_cancellation(uuid, uuid)
  to service_role;
grant execute on function public.cancel_unpaid_order(uuid, uuid, text)
  to service_role;
grant execute on function public.request_paid_order_refund(uuid, uuid)
  to service_role;
grant execute on function public.record_paymongo_refund_result(uuid, text, text, text, text)
  to service_role;
grant execute on function public.fail_paymongo_refund_request(uuid, text, text)
  to service_role;
grant execute on function public.process_paymongo_refund_event(text, text, text, numeric, text, jsonb)
  to service_role;
grant execute on function public.request_manual_refund_fallback(uuid, uuid, text, text, text)
  to service_role;
