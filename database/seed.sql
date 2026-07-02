-- Clear placeholder data
SET FOREIGN_KEY_CHECKS=0;
DELETE FROM services WHERE salon_id=1;
DELETE FROM service_categories WHERE salon_id=1;
SET FOREIGN_KEY_CHECKS=1;

-- Insert real Kriyansh categories (IDs match local so CATEGORY_STYLE lookup works)
INSERT INTO service_categories (id, salon_id, name, color, sort_order) VALUES
(5,  1, 'Facial Spa',       '#0D9488', 1),
(6,  1, 'Lashes',           '#6366F1', 2),
(7,  1, 'Threading',        '#7C3AED', 3),
(8,  1, 'Waxing',           '#EC4899', 4),
(9,  1, 'Jacials',          '#14B8A6', 5),
(10, 1, 'Body Treatments',  '#8B5CF6', 6),
(11, 1, 'Permanent Makeup', '#D946EF', 7),
(12, 1, 'Specials',         '#06B6D4', 8),
(13, 1, 'Hair',             '#F43F5E', 9);

-- Facial Spa
INSERT INTO services (id, salon_id, category_id, name, price, duration_min, price_type, is_active) VALUES
(10, 1, 5, 'Anti-Aging Facial',            85.00,  60, 'fixed', 1),
(11, 1, 5, 'Deep-Cleansing Facial',        75.00,  60, 'fixed', 1),
(12, 1, 5, 'Organic Freshen Up Facial',    65.00,  45, 'fixed', 1),
(13, 1, 5, 'Microdermabrasion Facial',     95.00,  60, 'fixed', 1),
(14, 1, 5, 'Acne Facial',                  80.00,  60, 'fixed', 1),
(15, 1, 5, 'Nano Infusion',               120.00,  75, 'fixed', 1),
(16, 1, 5, 'Hydra Facial',                110.00,  75, 'fixed', 1),
(17, 1, 5, 'Oxygen Facial',               119.00,  60, 'fixed', 1),
(18, 1, 5, 'Radio Frequency Facial',      100.00,  60, 'fixed', 1),
(19, 1, 5, 'Dermaplaning Facial',          90.00,  60, 'fixed', 1),
(20, 1, 5, 'Ayurvedic Facial',             85.00,  75, 'fixed', 1),
(21, 1, 5, 'Hyperpigmentation Facial',     95.00,  60, 'fixed', 1),
(22, 1, 5, 'Kriyansh Signature Facial',   130.00,  90, 'fixed', 1),
(23, 1, 5, 'Procell Microneedling Facial',150.00,  75, 'fixed', 1),
(24, 1, 5, 'Jet Plasma Facial',           120.00,  60, 'fixed', 1),
(25, 1, 5, 'Korean Glass Glow Facial',    110.00,  75, 'fixed', 1);

-- Lashes
INSERT INTO services (id, salon_id, category_id, name, price, duration_min, price_type, is_active) VALUES
(26, 1, 6, 'Individual Lashes',     65.00, 60, 'fixed', 1),
(27, 1, 6, 'Individual Lash Fill',  40.00, 45, 'fixed', 1),
(28, 1, 6, 'Regular Lashes',        50.00, 45, 'fixed', 1),
(29, 1, 6, 'Regular Lash Fill',     35.00, 30, 'fixed', 1);

-- Threading
INSERT INTO services (id, salon_id, category_id, name, price, duration_min, price_type, is_active) VALUES
(30, 1, 7, 'Eyebrows Threading',  12.00, 15, 'fixed', 1),
(31, 1, 7, 'Lip Threading',        8.00, 10, 'fixed', 1),
(32, 1, 7, 'Chin Threading',       8.00, 10, 'fixed', 1),
(33, 1, 7, 'Cheeks Threading',    12.00, 15, 'fixed', 1),
(34, 1, 7, 'Sides Threading',     12.00, 15, 'fixed', 1),
(35, 1, 7, 'Forehead Threading',  12.00, 15, 'fixed', 1),
(36, 1, 7, 'Neck Threading',      12.00, 15, 'fixed', 1),
(37, 1, 7, 'Full Face Threading', 45.00, 30, 'fixed', 1);

-- Waxing
INSERT INTO services (id, salon_id, category_id, name, price, duration_min, price_type, is_active) VALUES
(38, 1, 8, 'Eyebrow Wax',    15.00, 15, 'fixed', 1),
(39, 1, 8, 'Lip Wax',        10.00, 10, 'fixed', 1),
(40, 1, 8, 'Chin Wax',       10.00, 10, 'fixed', 1),
(41, 1, 8, 'Full Face Wax',  45.00, 30, 'fixed', 1),
(42, 1, 8, 'Brazilian Wax',  65.00, 45, 'fixed', 1),
(43, 1, 8, 'Bikini Wax',     45.00, 30, 'fixed', 1),
(44, 1, 8, 'Full Legs Wax',  70.00, 60, 'fixed', 1),
(45, 1, 8, 'Half Legs Wax',  40.00, 30, 'fixed', 1),
(46, 1, 8, 'Full Arms Wax',  50.00, 45, 'fixed', 1),
(47, 1, 8, 'Half Arms Wax',  35.00, 30, 'fixed', 1),
(48, 1, 8, 'Under Arms Wax', 20.00, 15, 'fixed', 1),
(49, 1, 8, 'Stomach Wax',    25.00, 20, 'fixed', 1),
(50, 1, 8, 'Full Back Wax',  55.00, 45, 'fixed', 1),
(51, 1, 8, 'Buttocks Wax',   40.00, 30, 'fixed', 1);

-- Jacials
INSERT INTO services (id, salon_id, category_id, name, price, duration_min, price_type, is_active) VALUES
(52, 1, 9, 'Va-Jacial',        85.00, 60, 'fixed', 1),
(53, 1, 9, 'Bu-Jacial',        85.00, 60, 'fixed', 1),
(54, 1, 9, 'Back-Jacial',      85.00, 60, 'fixed', 1),
(55, 1, 9, 'Boo-Jacial',       85.00, 60, 'fixed', 1),
(56, 1, 9, 'Full Body Scrub',  95.00, 60, 'fixed', 1),
(57, 1, 9, 'Intimate Bleach',  60.00, 30, 'fixed', 1);

-- Body Treatments
INSERT INTO services (id, salon_id, category_id, name, price, duration_min, price_type, is_active) VALUES
(58, 1, 10, 'Body Sculpting',     120.00, 60, 'fixed', 1),
(59, 1, 10, 'Lymphatic Massage',  100.00, 60, 'fixed', 1),
(60, 1, 10, 'Vacuum BBL',         110.00, 60, 'fixed', 1),
(61, 1, 10, 'Body Massage',        90.00, 60, 'fixed', 1);

-- Permanent Makeup
INSERT INTO services (id, salon_id, category_id, name, price, duration_min, price_type, is_active) VALUES
(62, 1, 11, 'Permanent Eyebrows (Microblading)', 200.00, 120, 'fixed', 1),
(63, 1, 11, 'Permanent Eyeliner',                180.00,  90, 'fixed', 1),
(64, 1, 11, 'Ear Piercing',                       30.00,  15, 'fixed', 1),
(65, 1, 11, 'Henna Tattoo',                       35.00,  30, 'from',  1);

-- Specials
INSERT INTO services (id, salon_id, category_id, name, price, duration_min, price_type, is_active) VALUES
(66, 1, 12, 'Lash Lift with Tint',      75.00, 60, 'fixed', 1),
(67, 1, 12, 'Brow Lamination with Tint',65.00, 60, 'fixed', 1),
(68, 1, 12, 'Eyebrow Tinting',          30.00, 20, 'fixed', 1),
(69, 1, 12, 'Under Arms Lightening',    45.00, 30, 'fixed', 1);

-- Hair
INSERT INTO services (id, salon_id, category_id, name, price, duration_min, price_type, is_active) VALUES
(70, 1, 13, 'Balayage',          220.00, 180, 'from',  1),
(71, 1, 13, 'Full Color',        150.00,  90, 'from',  1),
(72, 1, 13, 'Highlights',        140.00, 120, 'from',  1),
(73, 1, 13, 'Haircut & Blowout',  85.00,  60, 'fixed', 1),
(74, 1, 13, 'Mens Cut',           45.00,  30, 'fixed', 1),
(75, 1, 13, 'Keratin Treatment', 280.00, 180, 'from',  1),
(76, 1, 13, 'Deep Conditioning',  55.00,  45, 'fixed', 1),
(77, 1, 13, 'Blowout',            65.00,  45, 'fixed', 1),
(78, 1, 13, 'Updo / Event Style',120.00,  60, 'from',  1);
