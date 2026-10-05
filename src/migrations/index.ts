import * as migration_20261005_143211_initial from './20261005_143211_initial';

export const migrations = [
  {
    up: migration_20261005_143211_initial.up,
    down: migration_20261005_143211_initial.down,
    name: '20261005_143211_initial'
  },
];
