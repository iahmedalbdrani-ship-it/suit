import type { Locale } from "./i18n/config";

/** Long-form copy for help pages. Legal texts are initial drafts and need legal review before launch. */

export const about: Record<Locale, { lead: string; sections: { h: string; p: string }[] }> = {
  ar: {
    lead: "Suitly منصة سعودية لحجز الشقق المفروشة، هدفها أن يجد الضيف مكانًا مريحًا بسعر واضح، وأن يدير المضيف شقته بسهولة.",
    sections: [
      { h: "ما الذي نقدمه", p: "نجمع شققًا مفروشة في مدن المملكة في مكان واحد، مع صور ووصف ومرافق وتقييمات وسياسة إلغاء واضحة لكل شقة، ورحلة حجز تعرض السعر الإجمالي قبل الدفع." },
      { h: "كيف نعمل مع المضيفين", p: "يضيف المضيف شقته ويحدد الأسعار والأيام المتاحة. يراجع فريق Suitly كل إعلان قبل نشره، ويتابع الحجوزات والمدفوعات من خلال المنصة." },
      { h: "التزامنا", p: "الشفافية في الأسعار، وحماية بيانات المستخدمين، والدفع عبر بوابات مرخّصة، والتعامل السريع مع أي استفسار أو مشكلة." },
    ],
  },
  en: {
    lead: "Suitly is a Saudi platform for booking furnished apartments — helping guests find a comfortable place at a clear price, and helping hosts manage their homes with ease.",
    sections: [
      { h: "What we offer", p: "Furnished apartments across Saudi cities in one place, each with photos, description, amenities, reviews and a clear cancellation policy, plus a booking flow that shows the full total before payment." },
      { h: "How we work with hosts", p: "Hosts add their place and set prices and open dates. The Suitly team reviews every listing before it goes live, and bookings and payments are tracked through the platform." },
      { h: "Our commitment", p: "Transparent pricing, protecting user data, payments through licensed gateways, and quick responses to any question or issue." },
    ],
  },
};

export const faq: Record<Locale, { q: string; a: string }[]> = {
  ar: [
    { q: "كيف أحجز شقة؟", a: "ابحث بالمدينة والتواريخ وعدد الضيوف، اختر الشقة المناسبة، راجع السعر الإجمالي والرسوم، ثم أكمل الدفع الإلكتروني. يظهر تأكيد الحجز في حسابك مباشرة بعد نجاح الدفع." },
    { q: "هل السعر المعروض نهائي؟", a: "نعم، صفحة إتمام الحجز تعرض تفاصيل السعر كاملة: سعر الليالي، والخصومات إن وجدت، ورسوم التنظيف، ورسوم الخدمة، وضريبة القيمة المضافة، ثم الإجمالي الذي ستدفعه." },
    { q: "ما طرق الدفع المتاحة؟", a: "يتم الدفع عبر بوابة دفع إلكترونية آمنة. تعتمد الطرق المتاحة على بوابة الدفع المفعّلة، ولا نحفظ بيانات بطاقتك على خوادمنا." },
    { q: "كيف ألغي حجزي؟", a: "من صفحة «حجوزاتي» اختر الحجز ثم «إلغاء الحجز». يظهر لك المبلغ المسترد المتوقع حسب سياسة إلغاء الشقة قبل التأكيد." },
    { q: "متى أحصل على عنوان الشقة؟", a: "يظهر العنوان الدقيق في صفحة الحجز بعد تأكيده. قبل ذلك نعرض الموقع التقريبي فقط حفاظًا على خصوصية المضيف." },
    { q: "ماذا لو دفعت ولم يتأكد الحجز؟", a: "لا نؤكد أي حجز إلا بعد التحقق من الدفع من بوابة الدفع مباشرة. إذا تمت عملية الدفع ولم تعد التواريخ متاحة، يتواصل معك فريقنا لإعادة المبلغ كاملًا." },
    { q: "كيف أضيف شقتي كمضيف؟", a: "أنشئ حسابًا واختر «أرغب بإضافة شقق كمضيف»، ثم أضف تفاصيل الشقة وصورها وأسعارها. ستظهر الشقة للضيوف بعد مراجعتها والموافقة عليها." },
  ],
  en: [
    { q: "How do I book an apartment?", a: "Search by city, dates and guests, choose a place, review the full total and fees, then pay online. Your confirmation appears in your account right after the payment succeeds." },
    { q: "Is the price shown final?", a: "Yes. Checkout itemises the price: nightly total, any discounts, cleaning fee, service fee and VAT, then the total you will pay." },
    { q: "Which payment methods are available?", a: "Payments are made through a secure online gateway. Available methods depend on the active gateway, and we never store your card details on our servers." },
    { q: "How do I cancel?", a: "Go to “My bookings”, open the booking and choose “Cancel booking”. You’ll see the expected refund under the place’s cancellation policy before confirming." },
    { q: "When do I get the address?", a: "The exact address appears on your booking page once it’s confirmed. Before that we show the approximate area only, to protect the host’s privacy." },
    { q: "What if I paid but the booking wasn’t confirmed?", a: "We only confirm after verifying the payment directly with the gateway. If a payment succeeded but the dates are no longer available, our team will contact you to refund the full amount." },
    { q: "How do I list my apartment?", a: "Create an account and tick “I want to list apartments as a host”, then add your place’s details, photos and prices. It goes live after our team reviews and approves it." },
  ],
};

export const privacy: Record<Locale, { h: string; p: string[] }[]> = {
  ar: [
    { h: "البيانات التي نجمعها", p: ["بيانات الحساب: الاسم والبريد الإلكتروني ورقم الجوال.", "بيانات الحجز: الشقة والتواريخ وعدد الضيوف والملاحظات.", "بيانات تقنية ضرورية لتشغيل الموقع وحمايته، مثل ملف تعريف الجلسة."] },
    { h: "كيف نستخدمها", p: ["لإنشاء الحجوزات وإدارتها والتواصل معك بشأنها.", "لمشاركة البيانات اللازمة مع المضيف لإتمام إقامتك (الاسم ورقم الجوال وتفاصيل الحجز).", "لتحسين الخدمة ومنع الاحتيال والامتثال للأنظمة المعمول بها في المملكة العربية السعودية."] },
    { h: "المدفوعات", p: ["تتم معالجة المدفوعات عبر مزود دفع مرخّص. لا نخزن أرقام البطاقات على خوادمنا."] },
    { h: "ملفات تعريف الارتباط", p: ["نستخدم ملف تعريف ارتباط ضروري لتسجيل الدخول، وآخر لحفظ اللغة المفضلة. لا نستخدم ملفات إعلانية."] },
    { h: "حقوقك", p: ["يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها عبر صفحة التواصل، وفق نظام حماية البيانات الشخصية."] },
  ],
  en: [
    { h: "Data we collect", p: ["Account data: name, email and mobile number.", "Booking data: the place, dates, number of guests and notes.", "Technical data needed to run and protect the site, such as a session cookie."] },
    { h: "How we use it", p: ["To create and manage bookings and contact you about them.", "To share what the host needs for your stay (name, mobile and booking details).", "To improve the service, prevent fraud and comply with applicable Saudi regulations."] },
    { h: "Payments", p: ["Payments are processed by a licensed payment provider. We do not store card numbers on our servers."] },
    { h: "Cookies", p: ["We use one essential cookie for sign-in and one to remember your language. No advertising cookies."] },
    { h: "Your rights", p: ["You can ask to access, correct or delete your data through the contact page, in line with the Personal Data Protection Law."] },
  ],
};

export const terms: Record<Locale, { h: string; p: string[]; id?: string }[]> = {
  ar: [
    { h: "استخدام المنصة", p: ["باستخدامك Suitly فإنك توافق على هذه الشروط. يجب أن تكون البيانات التي تقدمها صحيحة ومحدثة.", "المنصة وسيط بين الضيف والمضيف، والمضيف مسؤول عن دقة وصف شقته وجاهزيتها."] },
    { h: "الحجز والدفع", p: ["يُعرض السعر الإجمالي قبل الدفع، ويشمل الرسوم والضريبة.", "تُحجز التواريخ مؤقتًا لمدة محددة أثناء الدفع، ولا يُؤكد الحجز إلا بعد التحقق من نجاح الدفع."] },
    { id: "cancellation", h: "سياسات الإلغاء", p: ["مرنة: استرداد كامل عند الإلغاء قبل موعد الوصول بـ 24 ساعة على الأقل.", "متوسطة: استرداد كامل قبل 5 أيام على الأقل، و50% قبل يوم واحد على الأقل.", "صارمة: استرداد 50% قبل 7 أيام على الأقل.", "إذا ألغى المضيف الحجز يُسترد المبلغ كاملًا للضيف."] },
    { h: "الإقامة", p: ["يلتزم الضيف بقواعد الإقامة الخاصة بكل شقة وبعدد الضيوف المحدد في الحجز.", "أي أضرار تقع أثناء الإقامة تخضع للتسوية بين الضيف والمضيف بمتابعة من Suitly."] },
    { h: "التواصل", p: ["لأي استفسار عن هذه الشروط تواصل معنا عبر صفحة «تواصل معنا»."] },
  ],
  en: [
    { h: "Using the platform", p: ["By using Suitly you agree to these terms. Information you provide must be accurate and up to date.", "The platform connects guests and hosts; hosts are responsible for the accuracy and readiness of their place."] },
    { h: "Booking & payment", p: ["The full total, including fees and VAT, is shown before payment.", "Dates are held for a limited time during payment, and a booking is confirmed only after the payment is verified."] },
    { id: "cancellation", h: "Cancellation policies", p: ["Flexible: full refund if cancelled at least 24 hours before check-in.", "Moderate: full refund at least 5 days before; 50% at least 1 day before.", "Strict: 50% refund at least 7 days before.", "If the host cancels, the guest receives a full refund."] },
    { h: "Your stay", p: ["Guests follow each place’s house rules and the number of guests in the booking.", "Any damage during a stay is settled between guest and host, with Suitly’s follow-up."] },
    { h: "Contact", p: ["For questions about these terms, reach us through the Contact page."] },
  ],
};
