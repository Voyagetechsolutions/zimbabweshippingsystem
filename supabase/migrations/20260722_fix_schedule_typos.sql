-- Data fix: correct misspelled area names in collection_schedules.
-- These area names drive postcode/city -> route matching in the customer app,
-- staff app and website, so typos silently misroute or fail to match.
--
-- collection_schedules.areas is a Postgres text[] array. Each UPDATE replaces
-- the whole array with the corrected version but is GUARDED by the presence of
-- a distinctive typo token (areas @> ARRAY['TYPO']). That makes every statement
-- idempotent AND self-deactivating: once the typo is gone the guard no longer
-- matches, so re-running setup will not re-apply the change or clobber any later
-- intentional edit to that route.
--
-- NOTE: the CARDIFF ROUTE contains the token "HIJJ", which does not map to any
-- real place. It is intentionally left untouched pending a human decision.

-- BIRMINGHAM ROUTE: WOLVEHAMPTON -> WOLVERHAMPTON
update public.collection_schedules
set areas = ARRAY['WOLVERHAMPTON','COVENTRY','WARWICK','DUDLEY','WALSALL','RUGBY']::text[]
where route = 'BIRMINGHAM ROUTE' and areas @> ARRAY['WOLVEHAMPTON']::text[];

-- BOURNEMOUTH ROUTE: HAMPHIRE -> HAMPSHIRE, GUILFORD -> GUILDFORD
update public.collection_schedules
set areas = ARRAY['SOUTHAMPTON','OXFORD','HAMPSHIRE','READING','GUILDFORD','PORTSMOUTH']::text[]
where route = 'BOURNEMOUTH ROUTE' and areas @> ARRAY['HAMPHIRE']::text[];

-- BRIGHTON ROUTE: HIGH COMBE -> HIGH WYCOMBE, VRAWLEY -> CRAWLEY, CANTEBURY -> CANTERBURY
update public.collection_schedules
set areas = ARRAY['HIGH WYCOMBE','SLOUGH','CRAWLEY','LANCING','EASTBOURNE','CANTERBURY']::text[]
where route = 'BRIGHTON ROUTE' and areas @> ARRAY['CANTEBURY']::text[];

-- MANCHESTER ROUTE: SHREWBURY -> SHREWSBURY
update public.collection_schedules
set areas = ARRAY['LIVERPOOL','STOKE ON TRENT','BOLTON','WARRINGTON','OLDHAM','SHREWSBURY']::text[]
where route = 'MANCHESTER ROUTE' and areas @> ARRAY['SHREWBURY']::text[];

-- NOTTINGHAM ROUTE: LIECESTER -> LEICESTER, PETERSBOROUGH -> PETERBOROUGH,
--                   MARKET HARB -> MARKET HARBOROUGH
update public.collection_schedules
set areas = ARRAY['LEICESTER','DERBY','PETERBOROUGH','CORBY','MARKET HARBOROUGH']::text[]
where route = 'NOTTINGHAM ROUTE' and areas @> ARRAY['LIECESTER']::text[];

-- BELFAST: Newtownwards -> Newtownards
update public.collection_schedules
set areas = ARRAY['Belfast','Bangor','Comber','Lisburn','Newry','Newtownards','Dunmurry','Lurgan','Portadown','Banbridge','Moy','Dungannon','Armagh']::text[]
where route = 'BELFAST' and areas @> ARRAY['Newtownwards']::text[];
