update public.app_configuration set value=value||jsonb_build_object('customerCareWhatsApp','447901217618'),updated_at=now()
where key='company_profile';
