import * as migration_20261005_160816_initial from './20261005_160816_initial';
import * as migration_20261006_092317_places from './20261006_092317_places';
import * as migration_20261006_092318_seed_places from './20261006_092318_seed_places';
import * as migration_20261006_102828_newsletter_confirm from './20261006_102828_newsletter_confirm';
import * as migration_20261006_104343_emails from './20261006_104343_emails';
import * as migration_20261008_070412_places_open_data from './20261008_070412_places_open_data';
import * as migration_20261008_100000_import_open_places from './20261008_100000_import_open_places';
import * as migration_20261015_230401_sante_rendez_vous from './20261015_230401_sante_rendez_vous';
import * as migration_20261015_233450_langues_demo from './20261015_233450_langues_demo';
import * as migration_20261016_120000_demo_praticien from './20261016_120000_demo_praticien';
import * as migration_20261016_173803_services_prestataires from './20261016_173803_services_prestataires';
import * as migration_20261016_180000_demo_prestataire from './20261016_180000_demo_prestataire';
import * as migration_20261016_183051_services_photos_pieces from './20261016_183051_services_photos_pieces';
import * as migration_20261016_200000_rate_limits from './20261016_200000_rate_limits';

export const migrations = [
  {
    up: migration_20261005_160816_initial.up,
    down: migration_20261005_160816_initial.down,
    name: '20261005_160816_initial',
  },
  {
    up: migration_20261006_092317_places.up,
    down: migration_20261006_092317_places.down,
    name: '20261006_092317_places',
  },
  {
    up: migration_20261006_092318_seed_places.up,
    down: migration_20261006_092318_seed_places.down,
    name: '20261006_092318_seed_places',
  },
  {
    up: migration_20261006_102828_newsletter_confirm.up,
    down: migration_20261006_102828_newsletter_confirm.down,
    name: '20261006_102828_newsletter_confirm',
  },
  {
    up: migration_20261006_104343_emails.up,
    down: migration_20261006_104343_emails.down,
    name: '20261006_104343_emails',
  },
  {
    up: migration_20261008_070412_places_open_data.up,
    down: migration_20261008_070412_places_open_data.down,
    name: '20261008_070412_places_open_data',
  },
  {
    up: migration_20261008_100000_import_open_places.up,
    down: migration_20261008_100000_import_open_places.down,
    name: '20261008_100000_import_open_places',
  },
  {
    up: migration_20261015_230401_sante_rendez_vous.up,
    down: migration_20261015_230401_sante_rendez_vous.down,
    name: '20261015_230401_sante_rendez_vous',
  },
  {
    up: migration_20261015_233450_langues_demo.up,
    down: migration_20261015_233450_langues_demo.down,
    name: '20261015_233450_langues_demo',
  },
  {
    up: migration_20261016_120000_demo_praticien.up,
    down: migration_20261016_120000_demo_praticien.down,
    name: '20261016_120000_demo_praticien',
  },
  {
    up: migration_20261016_173803_services_prestataires.up,
    down: migration_20261016_173803_services_prestataires.down,
    name: '20261016_173803_services_prestataires',
  },
  {
    up: migration_20261016_180000_demo_prestataire.up,
    down: migration_20261016_180000_demo_prestataire.down,
    name: '20261016_180000_demo_prestataire',
  },
  {
    up: migration_20261016_183051_services_photos_pieces.up,
    down: migration_20261016_183051_services_photos_pieces.down,
    name: '20261016_183051_services_photos_pieces',
  },
  {
    up: migration_20261016_200000_rate_limits.up,
    down: migration_20261016_200000_rate_limits.down,
    name: '20261016_200000_rate_limits',
  },
];
