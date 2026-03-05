-- Normalize legacy "On-Mission" vehicle status to "Available"
-- (App only supports Available and Maintenance.)

update vehicles
set status = 'Available'
where status is not null
  and trim(lower(status)) in ('on-mission', 'on mission', 'mission');
