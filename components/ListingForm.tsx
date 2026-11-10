import { saveListingAction } from "@/app/actions/host";
import { SubmitButton } from "./SubmitButton";
import { Icon } from "./Icon";
import { AMENITIES, type City, type Listing } from "@/lib/data/listings";
import type { Dict, Locale } from "@/lib/i18n";
import { sar } from "@/lib/format";

export function ListingForm({ locale, t, cities, listing }: { locale: Locale; t: Dict; cities: City[]; listing?: Listing }) {
  const h = t.host;
  const amen = new Set<string>(listing ? JSON.parse(listing.amenities) : []);
  const v = (k: keyof Listing) => (listing ? String(listing[k] ?? "") : "");
  const money = (k: "base_price" | "weekend_price" | "cleaning_fee") => (listing && listing[k] != null ? sar(listing[k] as number) : "");

  return (
    <form action={saveListingAction} className="stack">
      <input type="hidden" name="locale" value={locale} />
      {listing && <input type="hidden" name="id" value={listing.id} />}

      <fieldset className="card card-pad stack">
        <legend className="sr-only">{h.sectionBasics}</legend>
        <h2 style={{ fontSize: "1.15rem", margin: 0 }}>{h.sectionBasics}</h2>
        <div className="grid-2">
          <label className="field"><span>{h.titleAr} *</span><input className="input" name="title_ar" required maxLength={120} defaultValue={v("title_ar")} dir="rtl" lang="ar" /></label>
          <label className="field"><span>{h.titleEn} *</span><input className="input" name="title_en" required maxLength={120} defaultValue={v("title_en")} dir="ltr" lang="en" /></label>
        </div>
        <div className="grid-2">
          <label className="field"><span>{h.descAr}</span><textarea className="textarea" name="description_ar" rows={5} maxLength={4000} defaultValue={v("description_ar")} dir="rtl" lang="ar" /></label>
          <label className="field"><span>{h.descEn}</span><textarea className="textarea" name="description_en" rows={5} maxLength={4000} defaultValue={v("description_en")} dir="ltr" lang="en" /></label>
        </div>
        <div className="grid-3">
          <label className="field"><span>{h.city} *</span>
            <select className="select" name="city_slug" required defaultValue={v("city_slug")}>
              <option value="" disabled>—</option>
              {cities.map((c) => <option key={c.slug} value={c.slug}>{locale === "ar" ? c.name_ar : c.name_en}</option>)}
            </select>
          </label>
          <label className="field"><span>{h.districtAr}</span><input className="input" name="district_ar" maxLength={80} defaultValue={v("district_ar")} dir="rtl" /></label>
          <label className="field"><span>{h.districtEn}</span><input className="input" name="district_en" maxLength={80} defaultValue={v("district_en")} dir="ltr" /></label>
        </div>
        <label className="field"><span>{h.address}</span><input className="input" name="address" maxLength={300} defaultValue={v("address")} /></label>
        <div className="grid-2">
          <label className="field"><span>{h.lat}</span><input className="input" name="lat" inputMode="decimal" dir="ltr" defaultValue={v("lat")} /></label>
          <label className="field"><span>{h.lng}</span><input className="input" name="lng" inputMode="decimal" dir="ltr" defaultValue={v("lng")} /></label>
        </div>
      </fieldset>

      <fieldset className="card card-pad stack">
        <h2 style={{ fontSize: "1.15rem", margin: 0 }}>{h.sectionDetails}</h2>
        <div className="grid-4">
          <label className="field"><span>{h.bedrooms}</span><input className="input" type="number" name="bedrooms" min={0} max={20} defaultValue={v("bedrooms") || "1"} /></label>
          <label className="field"><span>{h.beds}</span><input className="input" type="number" name="beds" min={1} max={40} defaultValue={v("beds") || "1"} /></label>
          <label className="field"><span>{h.bathrooms}</span><input className="input" type="number" name="bathrooms" min={1} max={20} defaultValue={v("bathrooms") || "1"} /></label>
          <label className="field"><span>{h.maxGuests}</span><input className="input" type="number" name="max_guests" min={1} max={30} defaultValue={v("max_guests") || "2"} /></label>
        </div>
        <label className="field" style={{ maxWidth: 240 }}><span>{h.area}</span><input className="input" type="number" name="area_sqm" min={0} defaultValue={v("area_sqm")} /></label>
        <fieldset>
          <legend className="label" style={{ marginBottom: "0.5rem" }}>{t.listing.amenities}</legend>
          <div className="chips">
            {AMENITIES.map((a) => (
              <label className="chip-input" key={a}>
                <input type="checkbox" name="amenities" value={a} defaultChecked={amen.has(a)} />
                <span><Icon name={a} size={14} />{t.amenities[a]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </fieldset>

      <fieldset className="card card-pad stack">
        <h2 style={{ fontSize: "1.15rem", margin: 0 }}>{h.sectionPricing}</h2>
        <div className="grid-3">
          <label className="field"><span>{h.basePrice} *</span><input className="input" name="base_price" required inputMode="decimal" dir="ltr" defaultValue={money("base_price")} /></label>
          <label className="field"><span>{h.weekendPrice}</span><input className="input" name="weekend_price" inputMode="decimal" dir="ltr" defaultValue={money("weekend_price")} /></label>
          <label className="field"><span>{h.cleaningFee}</span><input className="input" name="cleaning_fee" inputMode="decimal" dir="ltr" defaultValue={money("cleaning_fee") || "0"} /></label>
        </div>
        <div className="grid-4">
          <label className="field"><span>{h.minNights}</span><input className="input" type="number" name="min_nights" min={1} max={60} defaultValue={v("min_nights") || "1"} /></label>
          <label className="field"><span>{h.maxNights}</span><input className="input" type="number" name="max_nights" min={1} max={365} defaultValue={v("max_nights") || "30"} /></label>
          <label className="field"><span>{h.weeklyDiscount}</span><input className="input" type="number" name="weekly_discount" min={0} max={60} defaultValue={v("weekly_discount") || "0"} /></label>
          <label className="field"><span>{h.monthlyDiscount}</span><input className="input" type="number" name="monthly_discount" min={0} max={70} defaultValue={v("monthly_discount") || "0"} /></label>
        </div>
      </fieldset>

      <fieldset className="card card-pad stack">
        <h2 style={{ fontSize: "1.15rem", margin: 0 }}>{h.sectionRules}</h2>
        <div className="grid-3">
          <label className="field"><span>{h.policy}</span>
            <select className="select" name="cancellation_policy" defaultValue={v("cancellation_policy") || "moderate"}>
              {(["flexible", "moderate", "strict"] as const).map((p) => <option key={p} value={p}>{t.policies[p]}</option>)}
            </select>
          </label>
          <label className="field"><span>{h.checkIn}</span><input className="input" type="time" name="check_in_time" defaultValue={v("check_in_time") || "15:00"} /></label>
          <label className="field"><span>{h.checkOut}</span><input className="input" type="time" name="check_out_time" defaultValue={v("check_out_time") || "12:00"} /></label>
        </div>
        <div className="grid-2">
          <label className="field"><span>{h.rulesAr}</span><textarea className="textarea" name="house_rules_ar" rows={4} dir="rtl" defaultValue={v("house_rules_ar")} /></label>
          <label className="field"><span>{h.rulesEn}</span><textarea className="textarea" name="house_rules_en" rows={4} dir="ltr" defaultValue={v("house_rules_en")} /></label>
        </div>
      </fieldset>

      <div><SubmitButton className="btn btn-lg">{listing ? h.save : h.create}</SubmitButton></div>
    </form>
  );
}
