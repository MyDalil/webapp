import * as migration_20261005_160816_initial from './20261005_160816_initial';
import * as migration_20261006_092317_places from './20261006_092317_places';
import * as migration_20261006_092318_seed_places from './20261006_092318_seed_places';
import * as migration_20261006_102828_newsletter_confirm from './20261006_102828_newsletter_confirm';
import * as migration_20261006_104343_emails from './20261006_104343_emails';

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
    name: '20261006_104343_emails'
  },
];
