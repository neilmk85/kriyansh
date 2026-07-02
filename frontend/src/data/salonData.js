export const CATEGORIES = [
  'All', 'Threading', 'Face Waxing', 'Body Waxing', 'Facials',
  'Body Cavitation', 'Eyelashes', 'Packages', 'Others',
]

export const SERVICES = [
  // Threading
  { id: 1,  category: 'Threading',       name: 'Eyebrow Threading',       duration: 15,  price: 12,  popular: true,  gender: null,     description: 'Precision eyebrow shaping using the ancient art of threading. We define your arch to perfectly frame your face for a clean, polished look.' },
  { id: 2,  category: 'Threading',       name: 'Upper Lip Threading',     duration: 10,  price: 8,   popular: false, gender: null,     description: 'Quick and precise upper lip hair removal using thread. Gentle on skin and longer-lasting than waxing or shaving.' },
  { id: 3,  category: 'Threading',       name: 'Full Face Threading',     duration: 30,  price: 28,  popular: false, gender: null,     description: 'Complete facial hair removal including eyebrows, upper lip, chin, cheeks, and forehead. Leave with a flawlessly smooth complexion.' },
  { id: 4,  category: 'Threading',       name: 'Forehead Threading',      duration: 10,  price: 8,   popular: false, gender: null,     description: 'Removes fine hair from the forehead for a cleaner, more defined hairline and smoother skin texture.' },
  // Face Waxing
  { id: 5,  category: 'Face Waxing',     name: 'Eyebrow Wax',             duration: 15,  price: 14,  popular: false, gender: null,     description: 'Smooth, defined brows using warm wax. Removes unwanted hair with precision, leaving a clean shape that lasts 3–4 weeks.' },
  { id: 6,  category: 'Face Waxing',     name: 'Upper Lip Wax',           duration: 10,  price: 10,  popular: false, gender: null,     description: 'Fast and effective upper lip wax for smooth, hair-free skin. Results last up to 4 weeks.' },
  { id: 7,  category: 'Face Waxing',     name: 'Full Face Wax',           duration: 30,  price: 35,  popular: false, gender: null,     description: 'A comprehensive facial wax that targets all areas — brows, lip, chin, cheeks, and sideburns — for beautifully smooth skin.' },
  // Body Waxing
  { id: 8,  category: 'Body Waxing',     name: 'Brazilian Waxing',        duration: 30,  price: 50,  popular: true,  gender: 'female', description: 'Full frontal wax of the bikini area and backside strip down center. Performed by our experienced specialists using premium wax for minimal discomfort.' },
  { id: 9,  category: 'Body Waxing',     name: 'Half Leg Wax',            duration: 30,  price: 40,  popular: false, gender: null,     description: 'Removes hair from the knee down (or knee up). Leaves legs smooth and hair-free for up to 4–6 weeks.' },
  { id: 10, category: 'Body Waxing',     name: 'Full Leg Wax',            duration: 45,  price: 65,  popular: false, gender: null,     description: 'Complete leg waxing from ankle to upper thigh. Enjoy silky smooth legs that last weeks longer than shaving.' },
  { id: 11, category: 'Body Waxing',     name: 'Underarm Wax',            duration: 15,  price: 20,  popular: false, gender: null,     description: 'Quick and effective underarm waxing for smooth, irritation-free skin. Lasts up to 4 weeks.' },
  // Facials
  { id: 12, category: 'Facials',         name: 'Deep Cleansing Facial',   duration: 45,  price: 99,  popular: true,  gender: null,     description: 'A thorough cleanse that unclogs pores, removes impurities, and leaves skin refreshed and glowing. Includes steam, extraction, and a hydrating mask.' },
  { id: 13, category: 'Facials',         name: 'BioRepeel Treatment',     duration: 30,  price: 199, popular: false, gender: null,     description: 'A professional-grade chemical peel using TCA technology that stimulates skin regeneration, reduces fine lines, and dramatically improves skin texture and tone.' },
  { id: 14, category: 'Facials',         name: 'Hydrating Glow Facial',   duration: 60,  price: 120, popular: false, gender: null,     description: 'Deeply nourishing treatment designed to restore moisture, plump fine lines, and deliver an immediate luminous glow. Perfect for dry or dull skin.' },
  { id: 15, category: 'Facials',         name: 'Anti-Aging Facial',       duration: 60,  price: 145, popular: false, gender: null,     description: 'Targets fine lines, wrinkles, and loss of elasticity using advanced serums and lifting techniques. Visibly firms and rejuvenates mature skin.' },
  // Body Cavitation
  { id: 16, category: 'Body Cavitation', name: 'Cavitation Session',      duration: 60,  price: 150, popular: false, gender: null,     description: 'Non-invasive ultrasound therapy that targets and breaks down stubborn fat cells. Ideal for contouring the abdomen, thighs, and love handles.' },
  { id: 17, category: 'Body Cavitation', name: 'Cavitation + RF Lift',    duration: 90,  price: 210, popular: false, gender: null,     description: 'Our most advanced body contouring treatment — combines ultrasound cavitation with radiofrequency skin tightening for maximum fat reduction and lift.' },
  // Eyelashes
  { id: 18, category: 'Eyelashes',       name: 'Classic Lash Set',        duration: 90,  price: 85,  popular: true,  gender: 'female', description: 'One extension per natural lash for a beautifully natural, mascara-like look. Lightweight, comfortable, and lasts 4–6 weeks with proper care.' },
  { id: 19, category: 'Eyelashes',       name: 'Volume Lash Set',         duration: 120, price: 115, popular: false, gender: 'female', description: 'Multiple ultra-fine extensions fanned onto each lash for a full, dramatic look. Perfect for special occasions or those who want maximum impact.' },
  { id: 20, category: 'Eyelashes',       name: 'Lash Fill',               duration: 60,  price: 55,  popular: false, gender: 'female', description: 'Maintenance appointment to fill in grown-out or shed extensions. Recommended every 2–3 weeks to keep your lashes looking full and fresh.' },
  // Packages
  { id: 21, category: 'Packages',        name: 'Glow Package',            duration: 90,  price: 175, popular: true,  gender: null,     description: 'Our bestselling combo: Deep Cleansing Facial + Eyebrow Threading + Upper Lip Threading. Walk in for a treatment, walk out glowing.' },
  { id: 22, category: 'Packages',        name: 'Bridal Package',          duration: 180, price: 350, popular: false, gender: 'female', description: 'The ultimate pre-wedding experience: Hydrating Facial + Classic Lash Set + Full Face Threading + Eyebrow Wax. Look and feel your absolute best on your big day.' },
  // Others
  { id: 23, category: 'Others',          name: 'Henna Art (Hands)',       duration: 45,  price: 35,  popular: false, gender: null,     description: 'Traditional henna designs applied to both hands by our skilled artists. Perfect for weddings, festivals, or simply treating yourself.' },
  { id: 24, category: 'Others',          name: 'Skin Consultation',       duration: 30,  price: 0,   popular: false, gender: null,     description: "A complimentary one-on-one skin assessment with our aesthetician. We'll analyse your skin type, discuss your goals, and recommend the best treatments for you." },
]
