import * as migration_20261005_160816_initial from './20261005_160816_initial';

export const migrations = [
  {
    up: migration_20261005_160816_initial.up,
    down: migration_20261005_160816_initial.down,
    name: '20261005_160816_initial'
  },
];
