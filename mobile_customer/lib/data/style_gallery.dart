class StyleItem {
  final String id;
  final String name;
  final String category;
  final String imageUrl;      // Reference photo shown in gallery
  final String prompt;        // Sent to FLUX Kontext Pro
  final String description;

  const StyleItem({
    required this.id,
    required this.name,
    required this.category,
    required this.imageUrl,
    required this.prompt,
    required this.description,
  });
}

class StyleCategory {
  final String name;
  final String emoji;
  final List<StyleItem> styles;
  const StyleCategory({required this.name, required this.emoji, required this.styles});
}

// ---------------------------------------------------------------------------
// Curated gallery — Kriyansh Beauty Bar service menu + hair expansion
// Reference images: Unsplash (free, no attribution required for app use)
// ---------------------------------------------------------------------------

const kStyleCategories = [

  StyleCategory(name: 'Lash Styles', emoji: '👁️', styles: [
    StyleItem(
      id: 'lash_natural',
      name: 'Natural Classic',
      category: 'Lash Styles',
      imageUrl: 'https://images.unsplash.com/photo-1515688594390-b649af70d282?w=400&fit=crop&q=80',
      prompt: 'natural classic eyelash extensions, one-to-one lash mapping, subtle definition, no makeup look',
      description: 'Subtle, everyday lashes',
    ),
    StyleItem(
      id: 'lash_wispy',
      name: 'Wispy Hybrid',
      category: 'Lash Styles',
      imageUrl: 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=400&fit=crop&q=80',
      prompt: 'wispy hybrid eyelash extensions, feathery fluffy texture, natural-to-glam, subtle curl',
      description: 'Feathery, fluttery look',
    ),
    StyleItem(
      id: 'lash_volume',
      name: 'Volume Lashes',
      category: 'Lash Styles',
      imageUrl: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=400&fit=crop&q=80',
      prompt: 'volume eyelash extensions, dramatic full lashes, fan technique, bold eye look',
      description: 'Full, dramatic lashes',
    ),
    StyleItem(
      id: 'lash_mega',
      name: 'Mega Volume',
      category: 'Lash Styles',
      imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&fit=crop&q=80',
      prompt: 'mega volume eyelash extensions, ultra fluffy dramatic lashes, maximum volume, glamorous',
      description: 'Ultra-glam, show-stopping',
    ),
    StyleItem(
      id: 'lash_cat',
      name: 'Cat Eye',
      category: 'Lash Styles',
      imageUrl: 'https://images.unsplash.com/photo-1596704017234-0b5d64b8c870?w=400&fit=crop&q=80',
      prompt: 'cat eye eyelash extensions, longer at outer corners, lifted almond eye effect, elegant',
      description: 'Lifted, feline eye shape',
    ),
    StyleItem(
      id: 'lash_doll',
      name: 'Doll Eye',
      category: 'Lash Styles',
      imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&fit=crop&q=80',
      prompt: 'doll eye eyelash extensions, longest in center, wide open eye effect, cute youthful look',
      description: 'Wide, open, bright eyes',
    ),
  ]),

  StyleCategory(name: 'Eyebrows', emoji: '✨', styles: [
    StyleItem(
      id: 'brow_natural',
      name: 'Natural Arch',
      category: 'Eyebrows',
      imageUrl: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&fit=crop&q=80',
      prompt: 'perfectly shaped natural eyebrows, soft arch, filled and defined, groomed with threading',
      description: 'Soft, flattering natural arch',
    ),
    StyleItem(
      id: 'brow_high',
      name: 'High Arch',
      category: 'Eyebrows',
      imageUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&fit=crop&q=80',
      prompt: 'high arched eyebrows, bold defined shape, dramatic lifted arch, clean threading',
      description: 'Dramatic, lifted arch',
    ),
    StyleItem(
      id: 'brow_straight',
      name: 'Straight / Korean',
      category: 'Eyebrows',
      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&fit=crop&q=80',
      prompt: 'straight flat eyebrows, Korean beauty style, minimal arch, horizontal brow shape, youthful',
      description: 'Trendy Korean straight brow',
    ),
    StyleItem(
      id: 'brow_feathered',
      name: 'Feathered Brow',
      category: 'Eyebrows',
      imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&fit=crop&q=80',
      prompt: 'feathered fluffy eyebrows, brushed up texture, full natural brows, soap brow effect',
      description: 'Full, fluffy soap-brow look',
    ),
  ]),

  StyleCategory(name: 'Hair Colour', emoji: '🎨', styles: [
    StyleItem(
      id: 'colour_balayage',
      name: 'Balayage',
      category: 'Hair Colour',
      imageUrl: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=400&fit=crop&q=80',
      prompt: 'balayage hair colour, sun-kissed natural highlights, hand-painted technique, brunette to caramel, soft blended',
      description: 'Sun-kissed, natural gradient',
    ),
    StyleItem(
      id: 'colour_highlights',
      name: 'Blonde Highlights',
      category: 'Hair Colour',
      imageUrl: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=400&fit=crop&q=80',
      prompt: 'blonde highlights, foil highlights, bright dimensional colour, chunky highlights, salon fresh',
      description: 'Bright, dimensional blonde',
    ),
    StyleItem(
      id: 'colour_ombre',
      name: 'Ombre',
      category: 'Hair Colour',
      imageUrl: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400&fit=crop&q=80',
      prompt: 'ombre hair colour, dark roots blending to light ends, smooth gradient transition, brunette to blonde',
      description: 'Dark roots to light ends',
    ),
    StyleItem(
      id: 'colour_rosegold',
      name: 'Rose Gold',
      category: 'Hair Colour',
      imageUrl: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&fit=crop&q=80',
      prompt: 'rose gold hair colour, pink peachy gold tones, glossy vibrant colour, trendy fashion hair',
      description: 'Soft pink-gold tones',
    ),
    StyleItem(
      id: 'colour_auburn',
      name: 'Auburn Red',
      category: 'Hair Colour',
      imageUrl: 'https://images.unsplash.com/photo-1523263685509-57c1d050d19b?w=400&fit=crop&q=80',
      prompt: 'auburn red hair colour, rich warm red-brown tones, vibrant copper red, glossy finish',
      description: 'Rich warm copper red',
    ),
  ]),

  StyleCategory(name: 'Hair Cuts', emoji: '✂️', styles: [
    StyleItem(
      id: 'cut_bob',
      name: 'Classic Bob',
      category: 'Hair Cuts',
      imageUrl: 'https://images.unsplash.com/photo-1595499280688-1b1d9b3be0e5?w=400&fit=crop&q=80',
      prompt: 'classic bob haircut, chin length blunt cut, sleek straight bob, clean sharp ends, salon fresh',
      description: 'Timeless chin-length bob',
    ),
    StyleItem(
      id: 'cut_lob',
      name: 'Long Bob (Lob)',
      category: 'Hair Cuts',
      imageUrl: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&fit=crop&q=80',
      prompt: 'long bob haircut, shoulder length lob, slightly angled, textured ends, modern versatile style',
      description: 'Shoulder-length modern cut',
    ),
    StyleItem(
      id: 'cut_layers',
      name: 'Long Layers',
      category: 'Hair Cuts',
      imageUrl: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&fit=crop&q=80',
      prompt: 'long layered haircut, face-framing layers, movement and volume, long flowing hair with soft layers',
      description: 'Flowing layers with movement',
    ),
    StyleItem(
      id: 'cut_bangs',
      name: 'Curtain Bangs',
      category: 'Hair Cuts',
      imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&fit=crop&q=80',
      prompt: 'curtain bangs, middle-parted fringe, soft face-framing bangs, 70s inspired, wispy curtain fringe',
      description: 'Soft parted fringe',
    ),
    StyleItem(
      id: 'cut_pixie',
      name: 'Pixie Cut',
      category: 'Hair Cuts',
      imageUrl: 'https://images.unsplash.com/photo-1551956765-f85ac7f1a918?w=400&fit=crop&q=80',
      prompt: 'pixie cut haircut, short cropped hair, textured top, bold chic short hairstyle',
      description: 'Bold, chic short style',
    ),
    StyleItem(
      id: 'cut_wolf',
      name: 'Wolf Cut',
      category: 'Hair Cuts',
      imageUrl: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&fit=crop&q=80',
      prompt: 'wolf cut hairstyle, shaggy layered cut, heavy curtain bangs, 70s shag, voluminous textured layers',
      description: 'Shaggy, rock-inspired layers',
    ),
  ]),

  StyleCategory(name: 'Makeup', emoji: '💄', styles: [
    StyleItem(
      id: 'makeup_natural',
      name: 'Clean Natural',
      category: 'Makeup',
      imageUrl: 'https://images.unsplash.com/photo-1503236823255-94609f598e71?w=400&fit=crop&q=80',
      prompt: 'clean natural makeup look, dewy skin, subtle blush, nude lip, no-makeup makeup, fresh glowing skin',
      description: 'Fresh, no-makeup makeup',
    ),
    StyleItem(
      id: 'makeup_glam',
      name: 'Glam Evening',
      category: 'Makeup',
      imageUrl: 'https://images.unsplash.com/photo-1512163143273-bde0e3cc7407?w=400&fit=crop&q=80',
      prompt: 'glamorous evening makeup, smoky eye, bold lashes, contoured cheeks, nude or red lip, full glam',
      description: 'Full glam for evenings',
    ),
    StyleItem(
      id: 'makeup_smoky',
      name: 'Smoky Eye',
      category: 'Makeup',
      imageUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&fit=crop&q=80',
      prompt: 'dramatic smoky eye makeup, blended dark eyeshadow, sultry intense eye, nude lip, defined brows',
      description: 'Intense, sultry smoky look',
    ),
    StyleItem(
      id: 'makeup_bridal',
      name: 'Bridal Soft',
      category: 'Makeup',
      imageUrl: 'https://images.unsplash.com/photo-1470259078422-826894b933aa?w=400&fit=crop&q=80',
      prompt: 'soft bridal makeup, rosy cheeks, soft pink lip, luminous skin, romantic elegant bridal look',
      description: 'Romantic, luminous bridal',
    ),
  ]),
];

// Flat list of all styles for search/featured use
List<StyleItem> get kAllStyles =>
    kStyleCategories.expand((c) => c.styles).toList();
