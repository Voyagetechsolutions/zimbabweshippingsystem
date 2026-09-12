// Isolated PostgreSQL fixture: executes the actual shipped function bodies.
// PGLITE_MODULE can point to a temporary install; no production data is used.
import fs from 'node:fs';
import assert from 'node:assert/strict';
process.on('uncaughtException', error => { console.error(error.message, error.detail || '', error.where || '', 'position', error.position || ''); process.exit(1); });
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const uid = '11111111-1111-1111-1111-111111111111';
const other = '22222222-2222-2222-2222-222222222222';
const q = async (sql, args) => (await db.query(sql,args)).rows;
const scalar = async (sql,args) => (await q(sql,args))[0].result;
let passed = 0;
const test = async (name, fn) => { await fn(); console.log('PASS',name); passed++; };
const rejects = async (sql, match, args) => assert.rejects(() => db.query(sql,args),match);
await db.exec(`
create schema auth;
create role anon;
create role authenticated;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create table profiles(id uuid primary key, role text, is_admin boolean default false, staff_active boolean default true, full_name text);
create table collection_schedules(id uuid primary key default gen_random_uuid(), route text, country text, pickup_date text, approved boolean default true);
create table shipments(id uuid primary key default gen_random_uuid(),tracking_number text,customer_reference text,metadata jsonb default '{}',
  collection_status text, collection_schedule_id uuid, goods_description text, assigned_driver_id uuid,driver_status text,
  pickup_latitude float8,pickup_longitude float8,deleted_at timestamptz,status text default 'Booking Confirmed',collected_at timestamptz,
  collected_by uuid,updated_at timestamptz,collection_code text,delivery_code text);
create table driver_runs(id uuid primary key default gen_random_uuid(),driver_id uuid,run_date date,status text,run_type text,route_name text,
  started_at timestamptz,completed_at timestamptz,updated_at timestamptz,unique(driver_id,run_date));
create table driver_run_stops(id uuid primary key default gen_random_uuid(),shipment_id uuid,run_id uuid,stop_type text,status text,
  stop_order int,address text,latitude float8,longitude float8,qr_verified_at timestamptz,code_verified_at timestamptz,
  completed_at timestamptz,updated_at timestamptz,failure_reason text,failure_note text,failed_at timestamptz,en_route_at timestamptz,arrived_at timestamptz);
create table route_collection_claims(id uuid primary key default gen_random_uuid(),shipment_id uuid unique,schedule_id uuid,driver_id uuid,
  stop_id uuid,claim_date date,status text,claimed_at timestamptz,updated_at timestamptz,en_route_at timestamptz,arrived_at timestamptz,
  completed_at timestamptz,released_at timestamptz,issue_reason text,issue_note text);
create table driver_attendance(driver_id uuid,work_date date,clocked_in_at timestamptz,clocked_out_at timestamptz);
create table shipment_events(id serial primary key,shipment_id uuid,event_type text,previous_status text,new_status text,actor_id uuid,details jsonb);
alter table shipments enable row level security;
create policy own_shipments on shipments for select to authenticated using (assigned_driver_id = auth.uid());
grant usage on schema public,auth to authenticated;
grant select on shipments to authenticated;
insert into profiles(id,role,full_name) values('${uid}','driver','Test Driver'),('${other}','driver','Other Driver');
select set_config('test.uid','${uid}',false);
`);
function functionBody(file,name) {
  const sql=fs.readFileSync(file,'utf8'); const start=sql.indexOf(`create or replace function public.${name}(`);
  assert.ok(start>=0); const end=sql.indexOf('$$;',start); assert.ok(end>start); return sql.slice(start,end+3);
}
await db.exec(functionBody('supabase/migrations/20260810_driver_route_collections.sql','parse_schedule_date'));
await db.exec(functionBody('supabase/migrations/20260716100001_staff_driver_runs_phase1.sql','transition_driver_stop'));
await db.exec(fs.readFileSync('supabase/migrations/20260912120000_driver_pickup_workflow.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20260912121000_driver_claim_feed_alignment.sql','utf8'));
const schedule=await scalar(`insert into collection_schedules(route,country,pickup_date) values('CORK ROUTE','Ireland',current_date::text) returning id as result`);
const ship=async (name,country,offset=0,extra={}) => scalar(`insert into shipments(tracking_number,metadata,collection_schedule_id,collection_code)
  values($1::text,jsonb_build_object('sender',jsonb_build_object('name',$1::text,'country',$2::text,'address','Test address'),
    'collection',jsonb_build_object('date',(current_date+$3::int)::text),'invoice',jsonb_build_object('amountPaid',0)) || $4::jsonb,$5,'secret') returning id as result`,[name,country,offset,JSON.stringify(extra),schedule]);
const today=await ship('Today','Ireland ');
await ship('Tomorrow','IRELAND ',1);
await ship('Past','England',-1);
await ship('Northern','Northern Ireland');
await ship('Legacy city','Limerick ');
await ship('Blank country','',0,{sender:{name:'Blank country',country:'',postcode:'V94 KX12'}});
const cancelled=await ship('Cancelled','Ireland');
await q(`update shipments set status='Cancelled' where id=$1`,[cancelled]);
const feed=()=>scalar('select driver_collection_feed(7,null) as result');
await test('Whitespace, Northern Ireland, missing country and legacy city remain visible',async()=> {
  const names=(await feed()).flatMap(d=>d.collections.map(c=>c.customerName));
  assert.deepEqual(names.sort(),['Blank country','Legacy city','Northern','Today','Tomorrow'].sort());
});
await test('Explicit old booking dates do not roll into today via a reused schedule',async()=> {
  const days=await feed(); assert.equal(days.length,2); assert.equal(days[0].collections.length,4);
});
await test('Driver RLS blocks raw unassigned shipments but permits scoped feed',async()=> {
  await db.exec('set role authenticated');
  assert.equal((await q('select * from shipments')).length,0);
  assert.equal((await feed())[0].collections.length,4);
  await db.exec('reset role');
});
await test('Admin preview and real driver use identical bookings',async()=> {
  const a=await feed(); await q(`update profiles set role='admin' where id=$1`,[uid]);
  assert.deepEqual(await feed(),a); await q(`update profiles set role='driver' where id=$1`,[uid]);
});
await test('Operational detail does not expose customer codes or invoice metadata',async()=> {
  const d=await scalar('select driver_collection_detail($1) as result',[today]);
  assert.equal(d.metadata.sender.name,'Today'); assert.equal(d.collection_code,undefined); assert.equal(d.metadata.invoice,undefined);
});
await test('Cannot claim while clocked out',()=>rejects('select claim_route_collection($1)',/Clock in/,[today]));
await db.exec(`insert into driver_attendance values('${uid}',current_date,now(),null)`);
const claim=await scalar('select claim_route_collection($1) as result',[today]);
await test('Claim is idempotent and aligned with whitespace-tolerant feed',async()=> {
  assert.equal((await scalar('select claim_route_collection($1) as result',[today])).stopId,claim.stopId);
});
await test('Cannot complete before arriving',()=>rejects('select complete_driver_pickup($1,true,null)',/Mark arrived/,[claim.stopId]));
await test('At-location start advances planned → en route → arrived atomically, without GPS',async()=> {
  const started=await scalar('select begin_driver_pickup($1) as result',[today]);
  assert.equal(started.stopId,claim.stopId);
  assert.equal((await q('select status from driver_run_stops where id=$1',[claim.stopId]))[0].status,'arrived');
  assert.equal((await scalar('select begin_driver_pickup($1) as result',[today])).stopId,claim.stopId);
});
await test('Explicit in-person confirmation is mandatory',()=>rejects('select complete_driver_pickup($1,false,null)',/Confirm the customer/,[claim.stopId]));
await test('Another driver cannot complete this stop',async()=> {
  await q(`select set_config('test.uid',$1,false)`,[other]);
  await rejects('select complete_driver_pickup($1,true,null)',/not assigned/,[claim.stopId]);
  await q(`select set_config('test.uid',$1,false)`,[uid]);
});
await test('Driver clock-out is enforced at completion',async()=> {
  await db.exec('update driver_attendance set clocked_out_at=now()');
  await rejects('select complete_driver_pickup($1,true,null)',/Clock in/,[claim.stopId]);
  await db.exec('update driver_attendance set clocked_out_at=null');
});
await test('Pickup-only endpoint cannot bypass delivery verification',async()=> {
  await q(`update driver_run_stops set stop_type='delivery' where id=$1`,[claim.stopId]);
  await rejects('select complete_driver_pickup($1,true,null)',/Collection stop required/,[claim.stopId]);
  await q(`update driver_run_stops set stop_type='collection' where id=$1`,[claim.stopId]);
});
await test('Manual collection works without code, QR, photos, GPS or confirmed invoice',async()=> {
  const r=await scalar('select complete_driver_pickup($1,true,$2) as result',[claim.stopId,'Verified in person']);
  assert.equal(r.verifiedBy,'driver_confirmation');
  const row=(await q('select * from shipments where id=$1',[today]))[0];
  assert.equal(row.status,'Collected'); assert.equal(row.collection_status,'Collected'); assert.equal(row.driver_status,'collected');
  assert.equal(row.collected_by,uid); assert.ok(row.collected_at); assert.equal(row.metadata.invoice.amountPaid,0);
  assert.equal((await q('select status from driver_run_stops where id=$1',[claim.stopId]))[0].status,'completed');
  assert.equal((await q('select status from route_collection_claims where shipment_id=$1',[today]))[0].status,'completed');
});
await test('Retry creates no duplicate handover event and collected booking leaves the feed',async()=> {
  await scalar('select complete_driver_pickup($1,true,null) as result',[claim.stopId]);
  assert.equal((await q(`select * from shipment_events where event_type='collection_handover'`)).length,1);
  assert.ok(!(await feed()).flatMap(d=>d.collections).some(c=>c.shipmentId===today));
});
await test('Anonymous and disabled accounts cannot read collections',async()=> {
  await db.exec(`select set_config('test.uid','',false)`);
  await rejects('select driver_collection_feed(7,null)',/Active staff/);
  await q(`select set_config('test.uid',$1,false)`,[uid]); await q('update profiles set staff_active=false where id=$1',[uid]);
  await rejects('select driver_collection_feed(7,null)',/Active staff/);
});
await db.close();
console.log(`${passed} driver pickup checks passed; no live database writes.`);
