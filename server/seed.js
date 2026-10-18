// Sample catalogue and orders. Order dates are set relative to the day the database is first created.
import { addDays, today, quoteLine, orderTotals, lateCharges, settle, damagePreset } from './logic.js';
import { hashPassword } from './auth.js';

// Monthly plan prices (30+ day rentals), in line with long-term furniture rental in Indian metros.
export const MONTHLY = {
  'Three-Seater Fabric Sofa': 1199, 'L-Shaped Sectional Sofa': 1799, 'Two-Seater Leatherette Sofa': 899,
  'Queen Bed with Mattress': 1099, 'Single Bed with Mattress': 649, 'King Hydraulic Storage Bed': 1599,
  'Ergonomic Mesh Office Chair': 399, 'Cushioned Banquet Chair': 120, 'Chiavari Gold Chair': 299, 'Accent Armchair': 499,
  'Six-Seater Dining Table Set': 1299, 'Round Banquet Table (6 ft)': 499, 'Sheesham Coffee Table': 349, 'Ten-Seater Conference Table': 2499,
  'Cocktail High Table': 299, 'Study Desk with Drawer': 449, 'Height-Adjustable Standing Desk': 999, 'Four-Seat Workstation Cluster': 3499,
  'Three-Door Wardrobe': 899, 'Five-Tier Bookshelf': 299, 'Four-Drawer Filing Cabinet': 349, 'Arc Floor Lamp': 249,
  'Stage Backdrop Frame': 3999, 'Jute Area Rug (5 x 8 ft)': 349,
};

// Footprint in cm (width x depth), used by the Room Fit Check. Dining set includes its chairs pulled in.
export const SIZES = {
  'Three-Seater Fabric Sofa': [210, 90], 'L-Shaped Sectional Sofa': [260, 170], 'Two-Seater Leatherette Sofa': [150, 85],
  'Queen Bed with Mattress': [165, 210], 'Single Bed with Mattress': [95, 200], 'King Hydraulic Storage Bed': [190, 215],
  'Ergonomic Mesh Office Chair': [65, 65], 'Cushioned Banquet Chair': [45, 50], 'Chiavari Gold Chair': [40, 45], 'Accent Armchair': [80, 80],
  'Six-Seater Dining Table Set': [240, 170], 'Round Banquet Table (6 ft)': [183, 183], 'Sheesham Coffee Table': [107, 56], 'Ten-Seater Conference Table': [300, 120],
  'Cocktail High Table': [60, 60], 'Study Desk with Drawer': [107, 55], 'Height-Adjustable Standing Desk': [152, 76], 'Four-Seat Workstation Cluster': [240, 150],
  'Three-Door Wardrobe': [150, 55], 'Five-Tier Bookshelf': [80, 30], 'Four-Drawer Filing Cabinet': [47, 62], 'Arc Floor Lamp': [40, 40],
  'Stage Backdrop Frame': [490, 60], 'Jute Area Rug (5 x 8 ft)': [152, 244],
};

const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

export const FURNITURE = [
  ['Three-Seater Fabric Sofa', 'Sofa', 450, 3000, 'Like New', 4, 'Home,Office', 'Deep-seated sofa in slate grey fabric with removable, washable cushion covers. Seats three comfortably.', img('1555041469-a586c61ea9bc')],
  ['L-Shaped Sectional Sofa', 'Sofa', 750, 5000, 'Good', 2, 'Home', 'Corner sectional with a reversible chaise. Fits living rooms from 12 x 14 ft upward.', img('1493663284031-b7e3aefcae8e')],
  ['Two-Seater Leatherette Sofa', 'Sofa', 380, 2500, 'New', 3, 'Home,Office', 'Compact tan leatherette sofa for reception areas and studio apartments. Wipe-clean finish.', img('1540574163026-643ea20ade25')],
  ['Queen Bed with Mattress', 'Bed', 520, 4000, 'Like New', 5, 'Home', 'Engineered wood queen bed (60 x 78 in) with a 6-inch orthopaedic mattress. Sanitised before every rental.', img('1505693416388-ac5ce068fe85')],
  ['Single Bed with Mattress', 'Bed', 300, 2000, 'Good', 6, 'Home', 'Single bed (36 x 78 in) with a 5-inch foam mattress. A good fit for PG rooms and guest rooms.', img('1522771739844-6a9f6d5f14af')],
  ['King Hydraulic Storage Bed', 'Bed', 800, 6000, 'New', 2, 'Home', 'King bed (72 x 78 in) with gas-lift storage under the mattress. Mattress included.', img('1519710164239-da123dc03ef4')],
  ['Ergonomic Mesh Office Chair', 'Chair', 120, 800, 'Like New', 20, 'Office,Home', 'Breathable mesh back, adjustable lumbar support, 3D armrests and a synchro-tilt mechanism.', img('1580480055273-228ff5388ef8')],
  ['Cushioned Banquet Chair', 'Chair', 25, 100, 'Good', 300, 'Event', 'Stackable steel-frame banquet chair with a padded seat. Chair covers available on request.', img('1519167758481-83f550bb49b3')],
  ['Chiavari Gold Chair', 'Chair', 60, 250, 'Like New', 150, 'Event', 'Classic gold chiavari chair with an ivory seat pad. Popular for receptions and stage seating.', img('1464366400600-7168b8af9bc3')],
  ['Accent Armchair', 'Chair', 180, 1500, 'New', 4, 'Home', 'Mustard velvet armchair with solid wood legs. Works as a reading corner or a living room accent.', img('1567538096630-e0c55bd6374c')],
  ['Six-Seater Dining Table Set', 'Table', 600, 4500, 'Good', 3, 'Home', 'Sheesham wood dining table with six upholstered chairs. Table top measures 72 x 36 in.', img('1617806118233-18e1de247200')],
  ['Round Banquet Table (6 ft)', 'Table', 150, 800, 'Good', 40, 'Event', 'Folding round table that seats 8 to 10 guests. Linen available as an add-on at the venue.', img('1511795409834-ef04bbd61622')],
  ['Sheesham Coffee Table', 'Table', 140, 1000, 'Like New', 6, 'Home,Office', 'Solid sheesham coffee table with a lower shelf. 42 x 22 in top.', img('1532372320572-cda25653a26d')],
  ['Ten-Seater Conference Table', 'Table', 900, 7000, 'Like New', 2, 'Office', 'Walnut-finish conference table with a central cable tray and power module.', img('1497366811353-6870744d04b2')],
  ['Cocktail High Table', 'Table', 90, 500, 'Good', 30, 'Event', 'Bar-height standing table for networking events and cocktail evenings. Spandex cover included.', img('1530103862676-de8c9debad1d')],
  ['Study Desk with Drawer', 'Desk', 160, 1200, 'Good', 8, 'Home,Office', 'Compact 42-inch desk with a drawer and cable cut-out. Fits bedrooms and small home offices.', img('1518455027359-f3f8164ba6bd')],
  ['Height-Adjustable Standing Desk', 'Desk', 350, 3000, 'New', 5, 'Office,Home', 'Dual-motor standing desk, 60 x 30 in, with four memory presets. Range 28 to 48 in.', img('1595515106969-1ce29566ff1c')],
  ['Four-Seat Workstation Cluster', 'Desk', 1100, 8000, 'Like New', 3, 'Office', 'Linear workstation for four with privacy screens, pedestals and wire management.', img('1524758631624-e2822e304c36')],
  ['Three-Door Wardrobe', 'Storage', 380, 3000, 'Good', 4, 'Home', 'Three-door wardrobe with a mirror, locker and hanging space. 60 x 21 x 78 in.', img('1558997519-83ea9252edf8')],
  ['Five-Tier Bookshelf', 'Storage', 110, 800, 'Like New', 6, 'Home,Office', 'Open bookshelf in oak finish. Holds around 150 books or display pieces.', img('1594620302200-9a762244a156')],
  ['Four-Drawer Filing Cabinet', 'Storage', 130, 1000, 'Good', 5, 'Office', 'Steel filing cabinet with a central lock and full-extension drawers for A4 and legal files.', img('1600585152220-90363fe7e115')],
  ['Arc Floor Lamp', 'Decor', 90, 600, 'New', 8, 'Home,Event', 'Brushed steel arc lamp with a marble base and a linen shade. Warm LED bulb included.', img('1507473885765-e6ed057f782c')],
  ['Stage Backdrop Frame', 'Decor', 1200, 5000, 'Good', 3, 'Event', 'Modular 16 x 8 ft backdrop frame for weddings and product launches. Setup crew included.', img('1478146896981-b80fe463b330')],
  ['Jute Area Rug (5 x 8 ft)', 'Decor', 150, 1000, 'Like New', 6, 'Home,Event', 'Hand-woven jute rug with a cotton border. Professionally cleaned between rentals.', img('1600166898405-da9535204843')],
];

export function seedDatabase({ run, get, transaction }) {
  transaction(() => {
    for (const [name, category, price, deposit, condition, stock, uses, description, image] of FURNITURE) {
      run(
        `INSERT INTO furniture (name, category, price_per_day, deposit, condition, stock, uses, description, image_url)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [name, category, price, deposit, condition, stock, uses, description, image]
      );
    }
    for (const [name, m] of Object.entries(MONTHLY)) run('UPDATE furniture SET price_per_month = ? WHERE name = ?', [m, name]);
    for (const [name, [w, d]] of Object.entries(SIZES)) run('UPDATE furniture SET width_cm = ?, depth_cm = ? WHERE name = ?', [w, d, name]);
    // One item under maintenance so the admin status feature is visible from the start.
    run(`UPDATE furniture SET status = 'Maintenance' WHERE name = 'L-Shaped Sectional Sofa'`);

    const t = today();
    const orders = [
      {
        customer: ['Karthik Ramanathan', '9840213576', 'karthik.r@example.in', '14, 3rd Cross Street, Besant Nagar, Chennai 600090'],
        purpose: 'Home', status: 'Delivered', payment: ['UPI', 'Paid'],
        lines: [['Queen Bed with Mattress', 1, addDays(t, -6), addDays(t, 23)], ['Three-Seater Fabric Sofa', 1, addDays(t, -6), addDays(t, 23)], ['Three-Door Wardrobe', 1, addDays(t, -6), addDays(t, 23)]],
      },
      {
        customer: ['Meenakshi Sundaram', '9791045823', 'meena.events@example.in', 'Sri Lakshmi Mahal, Arcot Road, Vadapalani, Chennai 600026'],
        purpose: 'Event', status: 'Confirmed', payment: ['Card', 'Paid'],
        lines: [['Cushioned Banquet Chair', 220, addDays(t, 4), addDays(t, 5)], ['Round Banquet Table (6 ft)', 24, addDays(t, 4), addDays(t, 5)], ['Stage Backdrop Frame', 1, addDays(t, 4), addDays(t, 5)]],
      },
      {
        customer: ['Farhan Qureshi', '9003187462', 'farhan@example.in', 'Level 4, Tidel Park, Taramani, Chennai 600113'],
        purpose: 'Office', status: 'Delivered', payment: ['Cash on delivery', 'Paid'],
        lines: [['Ergonomic Mesh Office Chair', 12, addDays(t, -10), addDays(t, 1)], ['Four-Seat Workstation Cluster', 2, addDays(t, -10), addDays(t, 1)]],
      },
      {
        customer: ['Divya Prakash', '8667209154', 'divya.p@example.in', '22, Nehru Street, Porur, Chennai 600116'],
        purpose: 'Home', status: 'Returned', payment: ['UPI', 'Paid'],
        lines: [['Study Desk with Drawer', 1, addDays(t, -40), addDays(t, -11)], ['Arc Floor Lamp', 1, addDays(t, -40), addDays(t, -11)]],
        returnedOn: addDays(t, -9), // came back 2 days late
        damage: ['Minor', 'Scratch on the study desk top'],
      },
      {
        customer: ['Arvind Balaji', '9500612378', 'arvind.b@example.in', '8, Gandhi Road, Tambaram West, Chennai 600045'],
        purpose: 'Event', status: 'Cancelled', payment: ['Card', 'Refunded'],
        lines: [['Chiavari Gold Chair', 60, addDays(t, 9), addDays(t, 9)]],
      },
      {
        customer: ['Lavanya Krishnan', '9884470125', 'lavanya.k@example.in', '5B, Sterling Road, Nungambakkam, Chennai 600034'],
        purpose: 'Home', status: 'Delivered', payment: ['UPI', 'Paid'],
        lines: [['Six-Seater Dining Table Set', 1, addDays(t, -9), addDays(t, -3)]],
      },
      {
        // Demo customer's finished rental: ready to be rated in My bookings.
        customer: ['Karthik Ramanathan', '9840213576', 'karthik.r@example.in', '14, 3rd Cross Street, Besant Nagar, Chennai 600090'],
        purpose: 'Home', status: 'Returned', payment: ['UPI', 'Paid'],
        lines: [['Two-Seater Leatherette Sofa', 1, addDays(t, -34), addDays(t, -20)], ['Sheesham Coffee Table', 1, addDays(t, -34), addDays(t, -20)]],
        returnedOn: addDays(t, -20),
      },
      {
        // Demo customer's rental ending tomorrow: triggers the automatic "pick-up tomorrow" reminder.
        customer: ['Karthik Ramanathan', '9840213576', 'karthik.r@example.in', '14, 3rd Cross Street, Besant Nagar, Chennai 600090'],
        purpose: 'Home', status: 'Delivered', payment: ['UPI', 'Paid'],
        lines: [['Accent Armchair', 1, addDays(t, -5), addDays(t, 1)], ['Jute Area Rug (5 x 8 ft)', 1, addDays(t, -5), addDays(t, 1)]],
      },
      {
        // Demo customer's overdue rental: shows live late charges in My bookings.
        customer: ['Karthik Ramanathan', '9840213576', 'karthik.r@example.in', '14, 3rd Cross Street, Besant Nagar, Chennai 600090'],
        purpose: 'Office', status: 'Delivered', payment: ['Card', 'Paid'],
        lines: [['Height-Adjustable Standing Desk', 1, addDays(t, -12), addDays(t, -2)], ['Ergonomic Mesh Office Chair', 1, addDays(t, -12), addDays(t, -2)]],
      },
    ];

    orders.forEach((o, idx) => {
      const lines = o.lines.map(([name, qty, start, end]) => {
        const item = get('SELECT * FROM furniture WHERE name = ?', [name]);
        return { item, qty, start, end, ...quoteLine(item, qty, start, end) };
      });
      const tot = orderTotals(lines);
      const created = addDays(o.lines[0][2] < t ? o.lines[0][2] : t, -2) + ' 11:2' + idx + ':00';
      const { lastInsertRowid: id } = run(
        `INSERT INTO orders (customer_name, phone, email, address, purpose, subtotal, discount, gst, delivery, deposit, total,
          payment_method, payment_ref, payment_status, status, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [...o.customer, o.purpose, tot.subtotal, tot.discount, tot.gst, tot.delivery, tot.deposit, tot.total,
          o.payment[0], 'PAY' + (48213 + idx * 731), o.payment[1], o.status, created]
      );
      run('UPDATE orders SET order_code = ? WHERE id = ?', ['RR-' + (1000 + id), id]);
      for (const l of lines) {
        run(
          `INSERT INTO order_items (order_id, furniture_id, qty, start_date, end_date, days, rent, deposit, rate) VALUES (?,?,?,?,?,?,?,?,?)`,
          [id, l.item.id, l.qty, l.start, l.end, l.days, l.rent, l.deposit, l.rate]
        );
      }
      if (o.status === 'Returned') {
        const returnedOn = o.returnedOn || o.lines[0][3];
        const late = lateCharges(lines.map((l) => ({ rate: l.rate, qty: l.qty, end_date: l.end })), returnedOn);
        const [level, note] = o.damage || ['None', ''];
        const damage = damagePreset(level, tot.deposit);
        const { refund, due } = settle(tot.deposit, late.total + damage);
        run(`UPDATE orders SET returned_on = ?, late_days = ?, late_fee = ?, late_gst = ?, deposit_refund = ?, balance_due = ?,
               damage_level = ?, damage_charge = ?, damage_note = ? WHERE id = ?`,
          [returnedOn, late.days, late.fee, late.gst, refund, due, level, damage, note, id]);
      }
    });
  });
}

// Demo customer accounts. Their existing sample orders are linked by mobile number.
export const DEMO_USERS = [
  ['Karthik Ramanathan', 'karthik.r@example.in', '9840213576', 'Rent@1234'],
  ['Meenakshi Sundaram', 'meena.events@example.in', '9791045823', 'Rent@1234'],
];

export function seedUsers({ run, transaction }) {
  transaction(() => {
    for (const [name, email, phone, password] of DEMO_USERS) {
      const { lastInsertRowid } = run('INSERT INTO users (name, email, phone, password_hash) VALUES (?,?,?,?)', [name, email, phone, hashPassword(password)]);
      run('UPDATE orders SET user_id = ? WHERE phone = ? AND user_id IS NULL', [lastInsertRowid, phone]);
    }
    // A saved wishlist for the first demo customer.
    run(`INSERT INTO wishlist (user_id, furniture_id) SELECT 1, id FROM furniture WHERE name IN ('Accent Armchair', 'Arc Floor Lamp', 'Jute Area Rug (5 x 8 ft)')`);
  });
}

// Ready-made packs sold at a pack discount.
const BUNDLES = [
  ['1BHK Starter Pack', 'Everything a new flat needs on day one', 'Home', 12, img('1586023492125-27b2c045efd7'),
    [['Queen Bed with Mattress', 1], ['Three-Seater Fabric Sofa', 1], ['Three-Door Wardrobe', 1], ['Sheesham Coffee Table', 1], ['Study Desk with Drawer', 1]]],
  ['Work-from-Home Kit', 'A proper desk setup for long workdays', 'Office', 10, img('1518455027359-f3f8164ba6bd'),
    [['Height-Adjustable Standing Desk', 1], ['Ergonomic Mesh Office Chair', 1], ['Five-Tier Bookshelf', 1], ['Arc Floor Lamp', 1]]],
  ['Office Pod for 4', 'Seats a small team from Monday', 'Office', 10, img('1497366216548-37526070297c'),
    [['Four-Seat Workstation Cluster', 1], ['Ergonomic Mesh Office Chair', 4], ['Four-Drawer Filing Cabinet', 1]]],
  ['Wedding Reception, 100 guests', 'Seating, tables and a stage for the big day', 'Event', 15, img('1519167758481-83f550bb49b3'),
    [['Cushioned Banquet Chair', 100], ['Round Banquet Table (6 ft)', 12], ['Stage Backdrop Frame', 1]]],
  ['Cocktail Evening, 40 guests', 'Standing tables, gold chairs and warm light', 'Event', 12, img('1530103862676-de8c9debad1d'),
    [['Cocktail High Table', 10], ['Chiavari Gold Chair', 20], ['Arc Floor Lamp', 4]]],
];

export function seedBundles({ run, get, transaction }) {
  transaction(() => {
    for (const [name, tagline, use, pct, image, items] of BUNDLES) {
      const { lastInsertRowid } = run('INSERT INTO bundles (name, tagline, use, discount_pct, image_url) VALUES (?,?,?,?,?)', [name, tagline, use, pct, image]);
      for (const [fname, qty] of items) {
        const f = get('SELECT id FROM furniture WHERE name = ?', [fname]);
        if (f) run('INSERT INTO bundle_items (bundle_id, furniture_id, qty) VALUES (?,?,?)', [lastInsertRowid, f.id, qty]);
      }
    }
  });
}

// Earlier customers' reviews so ratings show from the first run.
const REVIEWS = [
  ['Three-Seater Fabric Sofa', 'Anitha Suresh', 5, 'Spotless and very comfortable. Delivery team set it up in ten minutes.'],
  ['Three-Seater Fabric Sofa', 'Rahul Menon', 4, 'Good condition, one cushion cover was slightly faded.'],
  ['Queen Bed with Mattress', 'Deepa Iyer', 5, 'The mattress felt new. Slept well from the first night.'],
  ['Queen Bed with Mattress', 'Sanjay Kumar', 4, 'Sturdy frame. Pick-up was on time.'],
  ['Queen Bed with Mattress', 'Fathima Rahman', 5, 'Great for my 4 month project posting.'],
  ['Ergonomic Mesh Office Chair', 'Vignesh R', 5, 'My back thanks you. Lumbar support is excellent.'],
  ['Ergonomic Mesh Office Chair', 'Priyanka Das', 4, 'Comfortable. Armrest height took a minute to figure out.'],
  ['Height-Adjustable Standing Desk', 'Arjun Nair', 5, 'Quiet motor, memory presets work perfectly.'],
  ['Height-Adjustable Standing Desk', 'Kavya Ramesh', 5, 'Changed how I work from home.'],
  ['Cushioned Banquet Chair', 'S. Chandrasekar', 5, '220 chairs, all clean and delivered at 7 am.'],
  ['Cushioned Banquet Chair', 'Mohammed Irfan', 4, 'Good value. Two chairs had loose seat pads.'],
  ['Round Banquet Table (6 ft)', 'Revathi Balan', 5, 'Seated 10 easily. Setup crew was polite.'],
  ['Chiavari Gold Chair', 'Nandini Krishnan', 5, 'Looked beautiful in the reception photos.'],
  ['Six-Seater Dining Table Set', 'Harish Gopal', 4, 'Solid wood, a few minor scratches.'],
  ['Three-Door Wardrobe', 'Meera Pillai', 4, 'Plenty of space. Mirror was a nice bonus.'],
  ['Accent Armchair', 'Aditi Sharma', 5, 'The mustard velvet is gorgeous.'],
  ['Arc Floor Lamp', 'Karan Malhotra', 5, 'Warm light, great for the living room.'],
  ['Stage Backdrop Frame', 'Lakshmi Events', 5, 'Crew assembled it in under an hour.'],
  ['Study Desk with Drawer', 'Divya Prakash', 4, 'Compact and sturdy. Perfect for my room.'],
  ['Jute Area Rug (5 x 8 ft)', 'Suresh Babu', 4, 'Clean and ties the room together.'],
];

export function seedReviews({ run, get, transaction }) {
  transaction(() => {
    REVIEWS.forEach(([fname, who, rating, comment], i) => {
      const f = get('SELECT id FROM furniture WHERE name = ?', [fname]);
      if (f) run(`INSERT INTO reviews (furniture_id, reviewer_name, rating, comment, created_at) VALUES (?,?,?,?, datetime('now','localtime', ?))`,
        [f.id, who, rating, comment, `-${(i * 3) % 60 + 5} days`]);
    });
  });
}
