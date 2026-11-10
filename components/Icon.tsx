import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  MagnifyingGlass, CalendarBlank, UsersThree, Bed, Bathtub, ArrowsOut, Star, MapPin, WifiHigh, Car, Snowflake, CookingPot,
  WashingMachine, Television, SwimmingPool, Elevator, Laptop, Key, HouseLine, Waves, Barbell, Coffee, Plant, ShieldCheck,
  Check, X, CaretLeft, CaretRight, List, Globe, Info, WarningCircle, Clock, Tag, Receipt, User, Plus, Image, Trash,
  LockSimple, House, Sparkle, SignOut, CreditCard, EnvelopeSimple, Phone, Door, Tree, Armchair,
} from "@phosphor-icons/react/ssr";


/** One icon family (Phosphor) and one weight across the whole product. */
const MAP: Record<string, PhosphorIcon> = {
  search: MagnifyingGlass, calendar: CalendarBlank, users: UsersThree, bed: Bed, bath: Bathtub, area: ArrowsOut, star: Star,
  pin: MapPin, wifi: WifiHigh, parking: Car, ac: Snowflake, kitchen: CookingPot, washer: WashingMachine, tv: Television,
  pool: SwimmingPool, elevator: Elevator, workspace: Laptop, self_checkin: Key, family: HouseLine, sea_view: Waves, gym: Barbell,
  coffee: Coffee, balcony: Door, garden: Tree, shield: ShieldCheck, check: Check, x: X, chevronL: CaretLeft, chevronR: CaretRight,
  menu: List, globe: Globe, info: Info, alert: WarningCircle, clock: Clock, tag: Tag, key: Key, receipt: Receipt, user: User,
  plus: Plus, image: Image, trash: Trash, lock: LockSimple, home: House, sparkle: Sparkle, logout: SignOut, card: CreditCard,
  mail: EnvelopeSimple, phone: Phone, armchair: Armchair,
};

export type IconName = keyof typeof MAP;

export function Icon({ name, size = 20, className, label, filled }: { name: IconName | string; size?: number; className?: string; label?: string; filled?: boolean }) {
  const C = MAP[name] ?? Sparkle;
  return label
    ? <C size={size} weight={filled ? "fill" : "regular"} className={className} role="img" aria-label={label} />
    : <C size={size} weight={filled ? "fill" : "regular"} className={className} aria-hidden />;
}

/** Direction-aware chevron: "forward" points left in RTL and right in LTR. */
export function Chevron({ dir, rtl, size = 18 }: { dir: "forward" | "back"; rtl: boolean; size?: number }) {
  const right = (dir === "forward") !== rtl;
  return <Icon name={right ? "chevronR" : "chevronL"} size={size} />;
}
