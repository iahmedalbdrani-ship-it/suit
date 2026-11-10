/** Clearly-marked demo content. Replace with real apartments before launch. */

export const CITIES = [
  { slug: "riyadh", name_ar: "الرياض", name_en: "Riyadh", region_ar: "منطقة الرياض", region_en: "Riyadh Region", lat: 24.7136, lng: 46.6753 },
  { slug: "jeddah", name_ar: "جدة", name_en: "Jeddah", region_ar: "منطقة مكة المكرمة", region_en: "Makkah Region", lat: 21.5433, lng: 39.1728 },
  { slug: "makkah", name_ar: "مكة المكرمة", name_en: "Makkah", region_ar: "منطقة مكة المكرمة", region_en: "Makkah Region", lat: 21.3891, lng: 39.8579 },
  { slug: "madinah", name_ar: "المدينة المنورة", name_en: "Madinah", region_ar: "منطقة المدينة المنورة", region_en: "Madinah Region", lat: 24.5247, lng: 39.5692 },
  { slug: "dammam", name_ar: "الدمام", name_en: "Dammam", region_ar: "المنطقة الشرقية", region_en: "Eastern Province", lat: 26.4207, lng: 50.0888 },
  { slug: "khobar", name_ar: "الخبر", name_en: "Al Khobar", region_ar: "المنطقة الشرقية", region_en: "Eastern Province", lat: 26.2172, lng: 50.1971 },
  { slug: "abha", name_ar: "أبها", name_en: "Abha", region_ar: "منطقة عسير", region_en: "Asir Region", lat: 18.2164, lng: 42.5053 },
  { slug: "taif", name_ar: "الطائف", name_en: "Taif", region_ar: "منطقة مكة المكرمة", region_en: "Makkah Region", lat: 21.2703, lng: 40.4158 },
  { slug: "alula", name_ar: "العلا", name_en: "AlUla", region_ar: "منطقة المدينة المنورة", region_en: "Madinah Region", lat: 26.6085, lng: 37.9232 },
];

type SeedListing = {
  slug: string;
  host: 0 | 1 | 2;
  city: string;
  title_ar: string;
  title_en: string;
  district_ar: string;
  district_en: string;
  desc_ar: string;
  desc_en: string;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  max_guests: number;
  area: number;
  amenities: string[];
  price: number;
  weekend?: number;
  cleaning: number;
  min_nights?: number;
  weekly?: number;
  monthly?: number;
  policy: "flexible" | "moderate" | "strict";
  featured?: boolean;
  dLat: number;
  dLng: number;
  palette: number;
};

const RULES_AR = "• يُمنع التدخين داخل الشقة.\n• يُرجى المحافظة على الهدوء بعد الساعة 11 مساءً.\n• لا يُسمح بإقامة الحفلات.";
const RULES_EN = "• No smoking inside the apartment.\n• Please keep noise down after 11 pm.\n• No parties or events.";

export const LISTINGS: SeedListing[] = [
  {
    slug: "riyadh-malqa-modern-2br", host: 0, city: "riyadh", featured: true, palette: 0, dLat: 0.09, dLng: -0.05,
    title_ar: "شقة عصرية بغرفتين في الملقا", title_en: "Modern 2-bedroom apartment in Al Malqa",
    district_ar: "الملقا", district_en: "Al Malqa",
    desc_ar: "شقة حديثة التشطيب بإضاءة طبيعية واسعة، تضم غرفتي نوم وصالة مريحة ومطبخًا مجهزًا بالكامل. قريبة من المطاعم والمقاهي وطرق رئيسية تسهّل التنقل في شمال الرياض. مناسبة للعائلات ورحلات العمل.",
    desc_en: "A newly finished apartment with generous natural light, two bedrooms, a comfortable living room and a fully equipped kitchen. Close to cafés, restaurants and main roads in north Riyadh. Great for families and business trips.",
    bedrooms: 2, beds: 3, bathrooms: 2, max_guests: 4, area: 120, price: 420, weekend: 480, cleaning: 60, weekly: 10, monthly: 20, policy: "moderate",
    amenities: ["wifi", "parking", "ac", "kitchen", "washer", "tv", "elevator", "self_checkin", "family", "workspace"],
  },
  {
    slug: "riyadh-olaya-business-studio", host: 1, city: "riyadh", palette: 3, dLat: 0.0, dLng: 0.0,
    title_ar: "استوديو أعمال في العليا", title_en: "Business studio in Olaya",
    district_ar: "العليا", district_en: "Olaya",
    desc_ar: "استوديو عملي في قلب حي العليا التجاري، مع مساحة عمل هادئة وإنترنت سريع ودخول ذاتي. خيار مناسب لرحلات العمل القصيرة.",
    desc_en: "A practical studio in the heart of Olaya’s business district, with a quiet workspace, fast Wi-Fi and self check-in. Ideal for short business trips.",
    bedrooms: 0, beds: 1, bathrooms: 1, max_guests: 2, area: 45, price: 260, cleaning: 40, weekly: 8, policy: "flexible",
    amenities: ["wifi", "ac", "kitchen", "tv", "elevator", "workspace", "self_checkin", "coffee", "gym"],
  },
  {
    slug: "riyadh-hittin-family-3br", host: 2, city: "riyadh", featured: true, palette: 4, dLat: 0.07, dLng: -0.1,
    title_ar: "شقة عائلية بثلاث غرف في حطين", title_en: "Family 3-bedroom apartment in Hittin",
    district_ar: "حطين", district_en: "Hittin",
    desc_ar: "شقة واسعة بثلاث غرف نوم ومجلس مستقل وجلسة خارجية، في حي سكني هادئ. تتسع للعائلات الكبيرة مع موقف خاص.",
    desc_en: "A spacious apartment with three bedrooms, a separate majlis and outdoor seating in a quiet residential area. Fits larger families, with private parking.",
    bedrooms: 3, beds: 4, bathrooms: 3, max_guests: 7, area: 190, price: 650, weekend: 750, cleaning: 90, weekly: 10, monthly: 18, policy: "moderate",
    amenities: ["wifi", "parking", "ac", "kitchen", "washer", "tv", "family", "garden", "coffee"],
  },
  {
    slug: "jeddah-shati-sea-view", host: 0, city: "jeddah", featured: true, palette: 1, dLat: 0.06, dLng: -0.06,
    title_ar: "شقة بإطلالة بحرية في الشاطئ", title_en: "Sea-view apartment in Al Shati",
    district_ar: "الشاطئ", district_en: "Al Shati",
    desc_ar: "استيقظ على إطلالة البحر الأحمر من شرفة هذه الشقة المريحة. قريبة من الكورنيش والمطاعم، مع مسبح مشترك ومواقف.",
    desc_en: "Wake up to Red Sea views from this comfortable apartment’s balcony. Close to the Corniche and restaurants, with a shared pool and parking.",
    bedrooms: 2, beds: 2, bathrooms: 2, max_guests: 4, area: 130, price: 550, weekend: 650, cleaning: 70, weekly: 10, policy: "moderate",
    amenities: ["wifi", "parking", "ac", "kitchen", "tv", "pool", "elevator", "sea_view", "balcony", "family"],
  },
  {
    slug: "jeddah-rawdah-cozy-1br", host: 1, city: "jeddah", palette: 5, dLat: 0.02, dLng: -0.02,
    title_ar: "شقة دافئة بغرفة نوم في الروضة", title_en: "Cozy 1-bedroom in Al Rawdah",
    district_ar: "الروضة", district_en: "Al Rawdah",
    desc_ar: "شقة مرتبة بغرفة نوم واحدة وصالة صغيرة، قريبة من مراكز التسوق وشارع الأمير سلطان.",
    desc_en: "A tidy one-bedroom apartment with a small living area, close to malls and Prince Sultan Road.",
    bedrooms: 1, beds: 1, bathrooms: 1, max_guests: 2, area: 70, price: 290, cleaning: 40, policy: "flexible",
    amenities: ["wifi", "ac", "kitchen", "tv", "elevator", "self_checkin"],
  },
  {
    slug: "jeddah-obhur-chalet-style", host: 2, city: "jeddah", palette: 2, dLat: 0.21, dLng: -0.03,
    title_ar: "شقة واسعة قرب أبحر", title_en: "Spacious apartment near Obhur",
    district_ar: "أبحر الشمالية", district_en: "North Obhur",
    desc_ar: "شقة بثلاث غرف قريبة من شواطئ أبحر، مع جلسة خارجية ومسبح خاص صغير. مناسبة للعطلات العائلية.",
    desc_en: "A three-bedroom apartment near Obhur’s beaches with outdoor seating and a small private pool. Made for family holidays.",
    bedrooms: 3, beds: 5, bathrooms: 3, max_guests: 8, area: 220, price: 900, weekend: 1100, cleaning: 120, min_nights: 2, policy: "strict",
    amenities: ["wifi", "parking", "ac", "kitchen", "washer", "tv", "pool", "family", "garden", "sea_view"],
  },
  {
    slug: "makkah-aziziyah-family", host: 1, city: "makkah", featured: true, palette: 3, dLat: 0.02, dLng: 0.03,
    title_ar: "شقة عائلية في العزيزية", title_en: "Family apartment in Al Aziziyah",
    district_ar: "العزيزية", district_en: "Al Aziziyah",
    desc_ar: "شقة نظيفة ومجهزة بغرفتين في حي العزيزية، قريبة من الخدمات ووسائل النقل. مناسبة للعائلات القادمة لأداء العمرة.",
    desc_en: "A clean, well-equipped two-bedroom apartment in Al Aziziyah, close to services and transport. Suitable for families visiting for Umrah.",
    bedrooms: 2, beds: 4, bathrooms: 2, max_guests: 6, area: 110, price: 380, weekend: 450, cleaning: 50, weekly: 7, policy: "moderate",
    amenities: ["wifi", "ac", "kitchen", "washer", "tv", "elevator", "family"],
  },
  {
    slug: "makkah-shisha-studio", host: 0, city: "makkah", palette: 0, dLat: 0.04, dLng: 0.0,
    title_ar: "استوديو مرتب في الششة", title_en: "Neat studio in Al Shisha",
    district_ar: "الششة", district_en: "Al Shisha",
    desc_ar: "استوديو اقتصادي ومريح لشخصين، مع مطبخ صغير ودخول ذاتي.",
    desc_en: "An affordable, comfortable studio for two with a kitchenette and self check-in.",
    bedrooms: 0, beds: 1, bathrooms: 1, max_guests: 2, area: 40, price: 210, cleaning: 30, policy: "flexible",
    amenities: ["wifi", "ac", "kitchen", "tv", "self_checkin"],
  },
  {
    slug: "madinah-quba-calm-2br", host: 2, city: "madinah", featured: true, palette: 4, dLat: -0.04, dLng: 0.0,
    title_ar: "شقة هادئة بغرفتين قرب قباء", title_en: "Calm 2-bedroom near Quba",
    district_ar: "قباء", district_en: "Quba",
    desc_ar: "شقة هادئة بتصميم بسيط وألوان مريحة، قريبة من مسجد قباء والخدمات. تضم غرفتي نوم وصالة ومطبخًا مجهزًا.",
    desc_en: "A calm apartment with simple design and soothing colours, close to Quba Mosque and services. Two bedrooms, a living room and an equipped kitchen.",
    bedrooms: 2, beds: 3, bathrooms: 2, max_guests: 5, area: 115, price: 360, weekend: 420, cleaning: 50, weekly: 10, policy: "moderate",
    amenities: ["wifi", "parking", "ac", "kitchen", "washer", "tv", "family", "elevator"],
  },
  {
    slug: "madinah-qurban-studio", host: 1, city: "madinah", palette: 5, dLat: -0.02, dLng: 0.02,
    title_ar: "استوديو عملي في قربان", title_en: "Practical studio in Qurban",
    district_ar: "قربان", district_en: "Qurban",
    desc_ar: "استوديو مناسب لشخصين مع مساحة عمل ومطبخ صغير، في موقع قريب من الطرق الرئيسية.",
    desc_en: "A studio for two with a workspace and kitchenette, near main roads.",
    bedrooms: 0, beds: 1, bathrooms: 1, max_guests: 2, area: 42, price: 230, cleaning: 30, policy: "flexible",
    amenities: ["wifi", "ac", "kitchen", "tv", "workspace", "self_checkin"],
  },
  {
    slug: "khobar-corniche-1br", host: 0, city: "khobar", featured: true, palette: 1, dLat: 0.07, dLng: 0.03,
    title_ar: "شقة أنيقة قرب كورنيش الخبر", title_en: "Elegant 1-bedroom near Khobar Corniche",
    district_ar: "الكورنيش", district_en: "Corniche",
    desc_ar: "شقة أنيقة بغرفة نوم وشرفة، على مسافة قريبة من كورنيش الخبر والمقاهي. مناسبة للأزواج ورحلات العمل.",
    desc_en: "An elegant one-bedroom with a balcony, a short distance from Khobar Corniche and cafés. Great for couples and work trips.",
    bedrooms: 1, beds: 1, bathrooms: 1, max_guests: 2, area: 80, price: 340, weekend: 390, cleaning: 45, weekly: 8, policy: "moderate",
    amenities: ["wifi", "parking", "ac", "kitchen", "tv", "elevator", "balcony", "sea_view", "gym", "coffee"],
  },
  {
    slug: "dammam-faisaliyah-3br", host: 2, city: "dammam", palette: 2, dLat: -0.02, dLng: -0.05,
    title_ar: "شقة بثلاث غرف في الفيصلية", title_en: "3-bedroom apartment in Al Faisaliyah",
    district_ar: "الفيصلية", district_en: "Al Faisaliyah",
    desc_ar: "شقة رحبة لعائلة كبيرة مع صالتين وموقف خاص، قريبة من المدارس والأسواق.",
    desc_en: "A roomy apartment for a large family with two living areas and private parking, near schools and markets.",
    bedrooms: 3, beds: 4, bathrooms: 2, max_guests: 7, area: 175, price: 480, weekend: 540, cleaning: 70, monthly: 20, policy: "moderate",
    amenities: ["wifi", "parking", "ac", "kitchen", "washer", "tv", "family"],
  },
  {
    slug: "abha-muftaha-mountain", host: 1, city: "abha", featured: true, palette: 4, dLat: 0.0, dLng: 0.0,
    title_ar: "شقة بإطلالة جبلية في أبها", title_en: "Mountain-view apartment in Abha",
    district_ar: "المفتاحة", district_en: "Al Muftaha",
    desc_ar: "شقة بغرفتين وشرفة تطل على جبال عسير، بأجواء معتدلة وقرب من مقاهي المفتاحة. تجربة مريحة للعائلات والأصدقاء.",
    desc_en: "A two-bedroom apartment with a balcony overlooking the Asir mountains, mild weather and cafés of Al Muftaha nearby. Comfortable for families and friends.",
    bedrooms: 2, beds: 3, bathrooms: 2, max_guests: 5, area: 105, price: 390, weekend: 460, cleaning: 50, policy: "moderate",
    amenities: ["wifi", "parking", "kitchen", "tv", "balcony", "family", "coffee", "garden"],
  },
  {
    slug: "taif-hada-retreat", host: 2, city: "taif", palette: 2, dLat: 0.07, dLng: -0.1,
    title_ar: "شقة استجمام في الهدا", title_en: "Retreat apartment in Al Hada",
    district_ar: "الهدا", district_en: "Al Hada",
    desc_ar: "شقة هادئة في الهدا مع جلسة خارجية، مناسبة لعطلات نهاية الأسبوع في أجواء الطائف المعتدلة.",
    desc_en: "A peaceful apartment in Al Hada with outdoor seating, perfect for weekend breaks in Taif’s mild climate.",
    bedrooms: 2, beds: 2, bathrooms: 1, max_guests: 4, area: 95, price: 330, weekend: 400, cleaning: 45, min_nights: 2, policy: "strict",
    amenities: ["wifi", "parking", "kitchen", "tv", "garden", "family", "coffee"],
  },
  {
    slug: "alula-desert-loft", host: 0, city: "alula", featured: true, palette: 5, dLat: 0.0, dLng: 0.02,
    title_ar: "لوفت بطابع صحراوي في العلا", title_en: "Desert-inspired loft in AlUla",
    district_ar: "وسط العلا", district_en: "Central AlUla",
    desc_ar: "لوفت بتصميم مستوحى من ألوان الصحراء ومواد طبيعية، قاعدة مريحة لاستكشاف العلا. يضم غرفة نوم وجلسة خارجية.",
    desc_en: "A loft inspired by desert tones and natural materials — a comfortable base for exploring AlUla. One bedroom and outdoor seating.",
    bedrooms: 1, beds: 2, bathrooms: 1, max_guests: 3, area: 85, price: 620, weekend: 700, cleaning: 80, min_nights: 2, policy: "strict",
    amenities: ["wifi", "parking", "ac", "kitchen", "garden", "coffee", "self_checkin"],
  },
  {
    slug: "riyadh-narjis-duplex", host: 1, city: "riyadh", palette: 1, dLat: 0.12, dLng: -0.03,
    title_ar: "دوبلكس حديث في النرجس", title_en: "Modern duplex in Al Narjis",
    district_ar: "النرجس", district_en: "Al Narjis",
    desc_ar: "دوبلكس بثلاث غرف وتصميم مفتوح وجلسة سطح، مع موقفين. مناسب للعائلات والإقامات الطويلة.",
    desc_en: "A three-bedroom duplex with open-plan design, rooftop seating and two parking spaces. Ideal for families and longer stays.",
    bedrooms: 3, beds: 4, bathrooms: 3, max_guests: 6, area: 210, price: 720, weekend: 820, cleaning: 100, weekly: 12, monthly: 25, policy: "moderate",
    amenities: ["wifi", "parking", "ac", "kitchen", "washer", "tv", "family", "garden", "workspace"],
  },
];

export const REVIEW_POOL: { ar: string; en: string }[] = [
  { ar: "الشقة نظيفة ومطابقة للصور، والدخول كان سهلًا.", en: "Clean and exactly like the photos. Check-in was easy." },
  { ar: "موقع ممتاز وقريب من كل شيء، والمضيف متعاون.", en: "Great location close to everything, and a helpful host." },
  { ar: "التجهيزات كاملة وما احتجنا شيء طوال الإقامة.", en: "Fully equipped — we didn’t need anything during our stay." },
  { ar: "هادئة ومريحة، والسرير ممتاز.", en: "Quiet and comfortable, with a great bed." },
  { ar: "تجربة جميلة، نتمنى فقط لو كان الموقف أوسع.", en: "Lovely stay — only wish the parking was a bit wider." },
  { ar: "مناسبة جدًا للعائلة، والأطفال استمتعوا.", en: "Very family friendly, the kids loved it." },
  { ar: "سرعة الإنترنت ممتازة ومساحة العمل مريحة.", en: "Fast internet and a comfortable workspace." },
  { ar: "السعر مناسب مقارنة بالمستوى، وسأكررها.", en: "Good value for the quality — I’d book again." },
];

export const REVIEWERS = ["أبو خالد", "سارة", "محمد", "ريم", "عبدالله", "Lina", "Omar", "هند", "تركي", "Daniel"];
