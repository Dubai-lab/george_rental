-- ═══════════════════════════════════════════════════════════════════════════
-- George Rental — the 50 stores (ORIGINAL seed data, recovered 2026-10-05)
--
-- Run AFTER supabase-schema.sql. Codes, names, addresses and rents are exactly
-- what the original supabase-patches.sql contained. All stores start vacant.
-- Safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.stores (area_id, code, name, address, rent_usd, status)
select a.id, v.code, v.name, v.address, v.rent_usd, 'vacant'
from (values
  ('Broad Street', 'GR-101', 'Broad St #1', '1 Broad Street, Monrovia', 280),
  ('Broad Street', 'GR-102', 'Broad St #2', '1 Broad Street, Monrovia', 280),
  ('Broad Street', 'GR-103', 'Broad St #3', '3 Broad Street, Monrovia', 300),
  ('Broad Street', 'GR-104', 'Broad St #4', '3 Broad Street, Monrovia', 300),
  ('Broad Street', 'GR-105', 'Broad St #5', '5 Broad Street, Monrovia', 320),
  ('Broad Street', 'GR-106', 'Broad St #6', '5 Broad Street, Monrovia', 320),
  ('Broad Street', 'GR-107', 'Broad St #7', '7 Broad Street, Monrovia', 350),
  ('Broad Street', 'GR-108', 'Broad St #8', '7 Broad Street, Monrovia', 350),
  ('Broad Street', 'GR-109', 'Broad St #9', '9 Broad Street, Monrovia', 380),
  ('Broad Street', 'GR-110', 'Broad St #10', '9 Broad Street, Monrovia', 380),
  ('Broad Street', 'GR-111', 'Broad St #11', '11 Broad Street, Monrovia', 400),
  ('Broad Street', 'GR-112', 'Broad St #12', '11 Broad Street, Monrovia', 400),
  ('Broad Street', 'GR-113', 'Broad St #13', '13 Broad Street, Monrovia', 420),
  ('Broad Street', 'GR-114', 'Broad St #14', '13 Broad Street, Monrovia', 420),
  ('Broad Street', 'GR-115', 'Broad St #15', '15 Broad Street, Monrovia', 450),
  ('Broad Street', 'GR-116', 'Broad St #16', '15 Broad Street, Monrovia', 450),
  ('Broad Street', 'GR-117', 'Broad St #17', '17 Broad Street, Monrovia', 480),
  ('Broad Street', 'GR-118', 'Broad St #18', '17 Broad Street, Monrovia', 480),
  ('Broad Street', 'GR-119', 'Broad St #19', '19 Broad Street, Monrovia', 500),
  ('Broad Street', 'GR-120', 'Broad St #20', '19 Broad Street, Monrovia', 500),
  ('Carey Street', 'GR-201', 'Carey St #1', '1 Carey Street, Monrovia', 240),
  ('Carey Street', 'GR-202', 'Carey St #2', '1 Carey Street, Monrovia', 240),
  ('Carey Street', 'GR-203', 'Carey St #3', '3 Carey Street, Monrovia', 260),
  ('Carey Street', 'GR-204', 'Carey St #4', '3 Carey Street, Monrovia', 260),
  ('Carey Street', 'GR-205', 'Carey St #5', '5 Carey Street, Monrovia', 280),
  ('Carey Street', 'GR-206', 'Carey St #6', '5 Carey Street, Monrovia', 280),
  ('Carey Street', 'GR-207', 'Carey St #7', '7 Carey Street, Monrovia', 300),
  ('Carey Street', 'GR-208', 'Carey St #8', '7 Carey Street, Monrovia', 300),
  ('Carey Street', 'GR-209', 'Carey St #9', '9 Carey Street, Monrovia', 320),
  ('Carey Street', 'GR-210', 'Carey St #10', '9 Carey Street, Monrovia', 320),
  ('Carey Street', 'GR-211', 'Carey St #11', '11 Carey Street, Monrovia', 340),
  ('Carey Street', 'GR-212', 'Carey St #12', '11 Carey Street, Monrovia', 340),
  ('Carey Street', 'GR-213', 'Carey St #13', '13 Carey Street, Monrovia', 360),
  ('Carey Street', 'GR-214', 'Carey St #14', '13 Carey Street, Monrovia', 360),
  ('Carey Street', 'GR-215', 'Carey St #15', '15 Carey Street, Monrovia', 380),
  ('Randall Street', 'GR-301', 'Randall St #1', '1 Randall Street, Monrovia', 220),
  ('Randall Street', 'GR-302', 'Randall St #2', '1 Randall Street, Monrovia', 220),
  ('Randall Street', 'GR-303', 'Randall St #3', '3 Randall Street, Monrovia', 240),
  ('Randall Street', 'GR-304', 'Randall St #4', '3 Randall Street, Monrovia', 240),
  ('Randall Street', 'GR-305', 'Randall St #5', '5 Randall Street, Monrovia', 260),
  ('Randall Street', 'GR-306', 'Randall St #6', '5 Randall Street, Monrovia', 260),
  ('Randall Street', 'GR-307', 'Randall St #7', '7 Randall Street, Monrovia', 280),
  ('Randall Street', 'GR-308', 'Randall St #8', '7 Randall Street, Monrovia', 280),
  ('Randall Street', 'GR-309', 'Randall St #9', '9 Randall Street, Monrovia', 300),
  ('Randall Street', 'GR-310', 'Randall St #10', '9 Randall Street, Monrovia', 300),
  ('Paynesville', 'GR-401', 'Paynesville #1', 'Red Light Market, Paynesville', 180),
  ('Paynesville', 'GR-402', 'Paynesville #2', 'Red Light Market, Paynesville', 180),
  ('Paynesville', 'GR-403', 'Paynesville #3', 'Red Light Market, Paynesville', 200),
  ('Paynesville', 'GR-404', 'Paynesville #4', 'Red Light Market, Paynesville', 200),
  ('Paynesville', 'GR-405', 'Paynesville #5', 'Red Light Market, Paynesville', 220)
) as v (area_name, code, name, address, rent_usd)
join public.areas a on a.name = v.area_name
on conflict (code) do nothing;

select a.name as area, count(*) as stores, sum(s.rent_usd) as rent_per_month
from public.stores s join public.areas a on a.id = s.area_id
group by a.name order by a.name;
