/** Icônes de la maquette DALIL (traits 1,8 px, currentColor). */
const P: Record<string, React.ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8Z" />,
  bookmark: <path d="M6 3h12v18l-6-4-6 4V3Z" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  home: <path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7" />,
  school: <path d="m3 10 9-5 9 5-9 5-9-5ZM7 13v4c3 2 7 2 10 0v-4M21 10v7" />,
  health: (
    <>
      <path d="M12 21s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.5-8 11-8 11Z" />
      <path d="M8 12h2l1-2 2 4 1-2h2" />
    </>
  ),
  car: (
    <>
      <path d="m5 11 2-5h10l2 5M4 11h16v7H4v-7ZM7 18v2M17 18v2" />
      <circle cx="7" cy="14" r="1" />
      <circle cx="17" cy="14" r="1" />
    </>
  ),
  file: (
    <>
      <path d="M6 2h8l4 4v16H6V2Z" />
      <path d="M14 2v5h5M9 12h6M9 16h6" />
    </>
  ),
  building: <path d="M4 21V7l8-4 8 4v14M8 10h2M14 10h2M8 14h2M14 14h2M10 21v-3h4v3" />,
  users: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="3" cy="6" r="1" />
      <circle cx="3" cy="12" r="1" />
      <circle cx="3" cy="18" r="1" />
    </>
  ),
  upload: <path d="M12 16V3M7 8l5-5 5 5M4 14v7h16v-7" />,
  passport: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M9 16h6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9v.01M18 15v.01" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
    </>
  ),
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />,
  truck: (
    <>
      <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </>
  ),
  mosque: <path d="M12 2c2 2 4 3 4 6H8c0-3 2-4 4-6ZM6 8h12v13H6zM3 21h18M10 21v-5a2 2 0 0 1 4 0v5M4 21V10M20 21V10" />,
  book: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5ZM4 19a2 2 0 0 1 2-2h13M9 7h6" />,
  books: <path d="M4 4h4v16H4zM10 4h4v16h-4zM15.5 5.2l3.9-1 3.6 15.5-3.9 1z" />,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
  kaaba: <path d="M4 7l8-3 8 3v12l-8 3-8-3V7ZM4 7l8 3 8-3M12 10v12M4 11l8 3 8-3" />,
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  leaf: <path d="M11 20A7 7 0 0 1 4 13c0-6 6-9 16-10-1 10-4 16-10 16ZM4 21c3-6 7-9 11-11" />,
  ticket: <path d="M3 8V6h18v2a2 2 0 0 0 0 4v2H3v-2a2 2 0 0 0 0-4ZM3 14v4h18v-4M13 6v12" />,
  cup: <path d="M4 8h13v5a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V8ZM17 9h1.5a2.5 2.5 0 0 1 0 5H17M7 3v2M10.5 3v2M14 3v2" />,
  utensils: <path d="M6 3v8a2 2 0 0 0 2 2v8M10 3v8a2 2 0 0 1-2 2M8 3v6M17 21V3c-2 1-3 4-3 7v3h3" />,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  wrench: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  drop: <path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12Z" />,
  brush: <path d="M18 3l3 3-9 9-3-3 9-9ZM9 12l-3 1c-2 .7-2 3-3 5 2 0 5 .5 7-1.5l2-1.5" />,
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9M17 6l3 3M14 9l2 2" />
    </>
  ),
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />,
  box: <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9ZM3 7.5l9 4.5 9-4.5M12 12v9" />,
  phone: <path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  laptop: <path d="M5 5h14v10H5zM2 19h20M9 19l.5-1h5l.5 1" />,
  camera: (
    <>
      <path d="M3 8h4l2-3h6l2 3h4v11H3V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  baby: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M10 8h.01M14 8h.01M10.5 10c1 .7 2 .7 3 0M6 21c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </>
  ),
  paw: (
    <>
      <circle cx="7" cy="9" r="1.8" />
      <circle cx="11" cy="5.5" r="1.8" />
      <circle cx="15.5" cy="6.5" r="1.8" />
      <circle cx="18" cy="11" r="1.8" />
      <path d="M8 18c0-3 2-6 4.5-6s4.5 3 4 5.5c-.4 2-2.5 2-4.3 1.5-1.6-.4-4.2 1.2-4.2-1Z" />
    </>
  ),
  dumbbell: <path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12" />,
  music: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  shirt: <path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3Z" />,
  bike: (
    <>
      <circle cx="6" cy="16" r="3.5" />
      <circle cx="18" cy="16" r="3.5" />
      <path d="M6 16l4-7h5l3 7M10 9 8.5 6H6M15 9l-1-3h2" />
    </>
  ),
  tag: <path d="M3 12V3h9l9 9-9 9-9-9ZM7.5 7.5h.01" />,
}

/** Pictogramme d’un intitulé de catégorie (mots-clés), pour les liens qui n’en ont pas. */
export function iconFor(label: string, fallback = 'arrow'): string {
  const l = label.toLowerCase()
  const map: [RegExp, string][] = [
    [/téléphone|appeler|^\+?\d[\d\s]+$/, 'phone'],
    [/e-?mail|courriel/, 'mail'],
    [/site officiel|en ligne/, 'globe'],
    [/coran|tajwid|hifz|coranique/, 'book'],
    [/plomberie|arrosage|piscine/, 'drop'],
    [/électricit/, 'bolt'],
    [/peinture|carrelage/, 'brush'],
    [/serrurerie/, 'key'],
    [/électroménager|objet|accessoire/, 'tag'],
    [/ménage|nettoyage|repassage|lavage|vitres/, 'sparkle'],
    [/déménagement|débarras|fourgon|transport|encombrant/, 'box'],
    [/meuble|travaux|fixation|climatisation|dépannage|bricol/, 'wrench'],
    [/pelouse|haie|arbre|jardin|promenade|nature|randonn/, 'leaf'],
    [/école|scolaire/, 'school'],
    [/baby|bébé|enfant|garde/, 'baby'],
    [/animaux|nourrissage|chien|chat/, 'paw'],
    [/informatique|pc|internet|wifi|smartphone|tablette|ordinateur/, 'laptop'],
    [/caméra|surveillance/, 'camera'],
    [/forme|musculation|yoga|pilates|martiaux|sport|coach/, 'dumbbell'],
    [/musique/, 'music'],
    [/mode|vêtement/, 'shirt'],
    [/moto|scooter/, 'bike'],
    [/utilitaire|camion/, 'truck'],
    [/entrepreneur|entreprise/, 'briefcase'],
    [/voiture|automobile|véhicule|permis|pièces/, 'car'],
    [/appartement|maison|villa|chambre|colocation|logement|immobilier|installer/, 'home'],
    [/terrain/, 'pin'],
    [/local|bureau|commercial|emploi|stage|mission|entreprise|business|travail|entrepreneur/, 'briefcase'],
    [/soutien|devoirs|bac|bem|cours|langue|lecture|initiation/, 'school'],
    [/livre/, 'books'],
    [/âgée|auxiliaire|compagnie|accompagnement|rendez-vous/, 'heart'],
    [/courses|repas/, 'utensils'],
    [/vie de tous les jours|quotidien/, 'clock'],
    [/vie musulmane/, 'mosque'],
    [/sortir|découvrir/, 'sun'],
    [/ville|région|wilaya|quartier|autour/, 'pin'],
    [/événement|agenda|week-end|sortie/, 'calendar'],
    [/monument|site historique|monuments et sites/, 'star'],
    [/festival|fête/, 'calendar'],
    [/spectacle|concert/, 'ticket'],
    [/en famille/, 'users'],
    [/musée|patrimoine|culture/, 'building'],
    [/plage|mer|côte/, 'sun'],
    [/jardin|promenade|nature|parc naturel|randonn/, 'leaf'],
    [/attraction|loisir|activité/, 'ticket'],
    [/café|thé/, 'cup'],
    [/restaurant|table|gastronom|cuisine/, 'utensils'],
    [/entrepreneur|entreprise|emploi|business|travail/, 'briefcase'],
    [/guide|lire|article/, 'book'],
    [/santé|médecin|clinique|pharmac/, 'health'],
    [/logement|immobilier|maison/, 'home'],
    [/école|éducation|universit|diplôme/, 'school'],
    [/voiture|automobile|véhicule|permis/, 'car'],
    [/banque|argent|prix|paiement|facture/, 'cash'],
    [/famille|enfant/, 'users'],
    [/mosquée|prière/, 'mosque'],
    [/passeport|identité|visa/, 'passport'],
    [/consulat|ambassade|étranger|monde/, 'globe'],
    [/démarche|document|acte/, 'file'],
    [/vérifi|label|confiance/, 'shield'],
  ]
  return map.find(([re]) => re.test(l))?.[1] ?? fallback
}

export function Icon({ name }: { name: keyof typeof P | string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {P[name]}
    </svg>
  )
}

/** Couleur fixe d’un pictogramme (palette --p1…--p8 de v1.css) : un même sujet garde la même couleur partout. */
const TONE: Record<string, number> = { pin: 1, calendar: 4, building: 7, sun: 3, leaf: 1, ticket: 5, cup: 7, utensils: 8, briefcase: 2, book: 4, health: 8, home: 3, school: 2, car: 6, cash: 1, users: 5, mosque: 1, passport: 2, globe: 6, file: 4, shield: 1, heart: 5, list: 6, grid: 3, clock: 4, wrench: 7, bolt: 3, drop: 2, brush: 5, key: 7, sparkle: 6, box: 3, phone: 1, mail: 2, laptop: 2, camera: 8, baby: 5, paw: 7, dumbbell: 8, music: 4, shirt: 3, bike: 3, tag: 6, books: 4, truck: 3, star: 3 }
export function iconTone(name: string): string {
  const n = TONE[name] ?? ([...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 8) + 1
  return `var(--p${n})`
}

/** Intitulé de catégorie précédé de son pictogramme en couleur (même rendu partout : chips, pastilles, boutons). */
export function IconLabel({ label, icon }: { label: string; icon?: string }) {
  const name = icon ?? iconFor(label)
  return (
    <>
      <span className="ico-dot" style={{ ['--ic' as string]: iconTone(name) }} aria-hidden="true">
        <Icon name={name} />
      </span>
      {label}
    </>
  )
}
