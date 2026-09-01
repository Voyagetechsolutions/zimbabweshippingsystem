update public.app_configuration
set value=jsonb_set(value,'{sealConditions}','["intact","damaged","missing","other"]'::jsonb,true),updated_at=now()
where key='operations';
