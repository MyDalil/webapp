import {
  Building2,
  BookOpen,
  Bus,
  Dumbbell,
  GraduationCap,
  Hammer,
  HeartPulse,
  Home,
  Hotel,
  Landmark,
  MoonStar,
  Scale,
  ShoppingBag,
  Trees,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'

const map: Record<string, LucideIcon> = {
  utensils: UtensilsCrossed,
  graduation: GraduationCap,
  health: HeartPulse,
  wellness: Dumbbell,
  home: Home,
  hotel: Hotel,
  trees: Trees,
  mosque: MoonStar,
  shop: ShoppingBag,
  bus: Bus,
  hammer: Hammer,
  scale: Scale,
  landmark: Landmark,
  book: BookOpen,
}

export function SectorIcon({ name, className }: { name?: string | null; className?: string }) {
  const I = (name && map[name]) || Building2
  return <I className={className} aria-hidden="true" strokeWidth={1.6} />
}
