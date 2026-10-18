-- Key Solutions demo data: a small Addis Ababa café.
--
-- Re-runnable: it wipes and reloads tables, menu, stock and ALL orders.
-- It does not touch auth users or profiles (see scripts/create-demo-users.sh).
--
-- Beef opens at 5.3 kg with a 5 kg threshold, so the demo order
-- (2 Beef Tibs at 0.25 kg each) pushes it into low stock, and
-- "+10 kg beef" clears the alert.

begin;

truncate table
  public.stock_movements,
  public.order_items,
  public.orders,
  public.recipe_items,
  public.ingredients,
  public.menu_items,
  public.menu_categories,
  public.dining_tables
restart identity cascade;

-- ---------------------------------------------------------------- tables

insert into public.dining_tables (number, seats) values
  (1, 2), (2, 2), (3, 4), (4, 4), (5, 4), (6, 6), (7, 2), (8, 8);

-- ---------------------------------------------------------------- menu

insert into public.menu_categories (name, sort_order) values
  ('Breakfast', 1),
  ('Main dishes', 2),
  ('Hot drinks', 3),
  ('Cold drinks', 4);

insert into public.menu_items (category_id, name, description, price_etb, sort_order)
select c.id, m.name, m.description, m.price_etb, m.sort_order
from (values
  ('Breakfast',   'Firfir',          'Torn injera tossed in spiced berbere sauce',          260.00, 1),
  ('Breakfast',   'Chechebsa',       'Flatbread pieces with niter kibbeh and berbere',     280.00, 2),
  ('Breakfast',   'Ful',             'Mashed fava beans with onion, topped with egg',      220.00, 3),
  ('Breakfast',   'Enqulal Firfir',  'Scrambled eggs with onion and green pepper',         240.00, 4),
  ('Main dishes', 'Beef Tibs',       'Sautéed beef cubes with onion and rosemary',         650.00, 1),
  ('Main dishes', 'Kitfo',           'Minced beef with mitmita and niter kibbeh',          720.00, 2),
  ('Main dishes', 'Shiro Wot',       'Chickpea stew served bubbling with injera',          320.00, 3),
  ('Main dishes', 'Misir Wot',       'Red lentil stew in berbere sauce with injera',       300.00, 4),
  ('Hot drinks',  'Macchiato',       'Espresso with steamed milk',                          70.00, 1),
  ('Hot drinks',  'Buna',            'Traditional Ethiopian coffee from the jebena',        50.00, 2),
  ('Hot drinks',  'Tea',             'Black tea with spices',                               35.00, 3),
  ('Cold drinks', 'Mango juice',     'Fresh blended mango',                                140.00, 1),
  ('Cold drinks', 'Avocado juice',   'Thick fresh avocado',                                150.00, 2),
  ('Cold drinks', 'Spris',           'Layered avocado and mango juice',                    160.00, 3)
) as m (category, name, description, price_etb, sort_order)
join public.menu_categories c on c.name = m.category;

-- ---------------------------------------------------------------- ingredients

insert into public.ingredients (name, unit, low_stock_threshold) values
  ('Beef',          'kg',  5),
  ('Berbere',       'kg',  0.5),
  ('Niter kibbeh',  'kg',  1),
  ('Injera',        'pcs', 30),
  ('Shiro powder',  'kg',  1),
  ('Red lentils',   'kg',  1),
  ('Fava beans',    'kg',  1),
  ('Wheat flour',   'kg',  2),
  ('Onion',         'kg',  2),
  ('Eggs',          'pcs', 24),
  ('Coffee beans',  'kg',  1),
  ('Tea leaves',    'kg',  0.3),
  ('Milk',          'L',   5),
  ('Sugar',         'kg',  2),
  ('Mango',         'kg',  3),
  ('Avocado',       'kg',  3);

-- Opening stock goes through stock_movements; the trigger sets quantity_on_hand.
insert into public.stock_movements (ingredient_id, change, reason, created_by)
select i.id, s.qty, 'adjustment', null
from (values
  ('Beef',          5.3),
  ('Berbere',       3),
  ('Niter kibbeh',  4),
  ('Injera',        120),
  ('Shiro powder',  4),
  ('Red lentils',   5),
  ('Fava beans',    5),
  ('Wheat flour',   8),
  ('Onion',         10),
  ('Eggs',          90),
  ('Coffee beans',  6),
  ('Tea leaves',    1.5),
  ('Milk',          20),
  ('Sugar',         10),
  ('Mango',         15),
  ('Avocado',       12)
) as s (ingredient, qty)
join public.ingredients i on i.name = s.ingredient;

-- ---------------------------------------------------------------- recipes (per one item sold)

insert into public.recipe_items (menu_item_id, ingredient_id, quantity_per_item)
select mi.id, i.id, r.qty
from (values
  ('Firfir',         'Injera',        2),
  ('Firfir',         'Berbere',       0.02),
  ('Firfir',         'Niter kibbeh',  0.03),
  ('Firfir',         'Onion',         0.05),
  ('Chechebsa',      'Wheat flour',   0.2),
  ('Chechebsa',      'Berbere',       0.015),
  ('Chechebsa',      'Niter kibbeh',  0.04),
  ('Ful',            'Fava beans',    0.15),
  ('Ful',            'Onion',         0.04),
  ('Ful',            'Eggs',          1),
  ('Enqulal Firfir', 'Eggs',          3),
  ('Enqulal Firfir', 'Onion',         0.05),
  ('Enqulal Firfir', 'Niter kibbeh',  0.02),
  ('Beef Tibs',      'Beef',          0.25),
  ('Beef Tibs',      'Onion',         0.08),
  ('Beef Tibs',      'Niter kibbeh',  0.03),
  ('Beef Tibs',      'Injera',        2),
  ('Kitfo',          'Beef',          0.25),
  ('Kitfo',          'Niter kibbeh',  0.05),
  ('Kitfo',          'Injera',        1),
  ('Shiro Wot',      'Shiro powder',  0.1),
  ('Shiro Wot',      'Onion',         0.05),
  ('Shiro Wot',      'Niter kibbeh',  0.02),
  ('Shiro Wot',      'Injera',        2),
  ('Misir Wot',      'Red lentils',   0.15),
  ('Misir Wot',      'Berbere',       0.02),
  ('Misir Wot',      'Onion',         0.05),
  ('Misir Wot',      'Injera',        2),
  ('Macchiato',      'Coffee beans',  0.018),
  ('Macchiato',      'Milk',          0.1),
  ('Macchiato',      'Sugar',         0.01),
  ('Buna',           'Coffee beans',  0.02),
  ('Buna',           'Sugar',         0.01),
  ('Tea',            'Tea leaves',    0.003),
  ('Tea',            'Sugar',         0.01),
  ('Mango juice',    'Mango',         0.35),
  ('Mango juice',    'Sugar',         0.02),
  ('Avocado juice',  'Avocado',       0.3),
  ('Avocado juice',  'Sugar',         0.02),
  ('Spris',          'Mango',         0.2),
  ('Spris',          'Avocado',       0.15),
  ('Spris',          'Sugar',         0.02)
) as r (item, ingredient, qty)
join public.menu_items mi on mi.name = r.item
join public.ingredients i on i.name = r.ingredient;

commit;
