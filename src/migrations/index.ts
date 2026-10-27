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
import * as migration_20261016_221333_ia_consommation from './20261016_221333_ia_consommation';
import * as migration_20261016_234359_membres_espace from './20261016_234359_membres_espace';
import * as migration_20261017_082119_accueil_coups_de_coeur_destination from './20261017_082119_accueil_coups_de_coeur_destination';
import * as migration_20261017_082546_evenements from './20261017_082546_evenements';
import * as migration_20261017_083727_contributions_photos from './20261017_083727_contributions_photos';
import * as migration_20261017_090000_ai_budget_alerts from './20261017_090000_ai_budget_alerts';
import * as migration_20261017_141435_tableau_de_bord_socle from './20261017_141435_tableau_de_bord_socle';
import * as migration_20261017_141500_criteres_socle_commun from './20261017_141500_criteres_socle_commun';
import * as migration_20261017_220000_import_fiches_documentees from './20261017_220000_import_fiches_documentees';
import * as migration_20261017_230000_import_osm from './20261017_230000_import_osm';
import * as migration_20261021_082159_annonces from './20261021_082159_annonces';
import * as migration_20261023_071938_erreurs_du_site from './20261023_071938_erreurs_du_site';
import * as migration_20261024_180000_postgis_places from './20261024_180000_postgis_places';
import * as migration_20261026_174159_exemples from './20261026_174159_exemples';
import * as migration_20261026_175000_exemples_annonces from './20261026_175000_exemples_annonces';
import * as migration_20261026_175100_exemples_prestataires from './20261026_175100_exemples_prestataires';
import * as migration_20261026_190000_index_recherche from './20261026_190000_index_recherche';
import * as migration_20261026_203255_faits_lieux from './20261026_203255_faits_lieux';
import * as migration_20261026_213000_faits_lieux_donnees from './20261026_213000_faits_lieux_donnees';
import * as migration_20261026_230000_retraits from './20261026_230000_retraits';
import * as migration_20261026_235900_suppression_retraits from './20261026_235900_suppression_retraits';
import * as migration_20261027_090000_index_position from './20261027_090000_index_position';
import * as migration_20261027_130000_accompagnement from './20261027_130000_accompagnement';
import * as migration_20261027_131000_packs_initiaux from './20261027_131000_packs_initiaux';
import * as migration_20261027_120000_source_overture from './20261027_120000_source_overture';
import * as migration_20261027_121000_import_overture from './20261027_121000_import_overture';
import * as migration_20261027_122000_import_mosquees from './20261027_122000_import_mosquees';

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
  {
    up: migration_20261016_221333_ia_consommation.up,
    down: migration_20261016_221333_ia_consommation.down,
    name: '20261016_221333_ia_consommation',
  },
  {
    up: migration_20261016_234359_membres_espace.up,
    down: migration_20261016_234359_membres_espace.down,
    name: '20261016_234359_membres_espace',
  },
  {
    up: migration_20261017_082119_accueil_coups_de_coeur_destination.up,
    down: migration_20261017_082119_accueil_coups_de_coeur_destination.down,
    name: '20261017_082119_accueil_coups_de_coeur_destination',
  },
  {
    up: migration_20261017_082546_evenements.up,
    down: migration_20261017_082546_evenements.down,
    name: '20261017_082546_evenements',
  },
  {
    up: migration_20261017_083727_contributions_photos.up,
    down: migration_20261017_083727_contributions_photos.down,
    name: '20261017_083727_contributions_photos',
  },
  {
    up: migration_20261017_090000_ai_budget_alerts.up,
    down: migration_20261017_090000_ai_budget_alerts.down,
    name: '20261017_090000_ai_budget_alerts',
  },
  {
    up: migration_20261017_141435_tableau_de_bord_socle.up,
    down: migration_20261017_141435_tableau_de_bord_socle.down,
    name: '20261017_141435_tableau_de_bord_socle',
  },
  {
    up: migration_20261017_141500_criteres_socle_commun.up,
    down: migration_20261017_141500_criteres_socle_commun.down,
    name: '20261017_141500_criteres_socle_commun',
  },
  {
    up: migration_20261017_220000_import_fiches_documentees.up,
    down: migration_20261017_220000_import_fiches_documentees.down,
    name: '20261017_220000_import_fiches_documentees',
  },
  {
    up: migration_20261017_230000_import_osm.up,
    down: migration_20261017_230000_import_osm.down,
    name: '20261017_230000_import_osm',
  },
  {
    up: migration_20261021_082159_annonces.up,
    down: migration_20261021_082159_annonces.down,
    name: '20261021_082159_annonces',
  },
  {
    up: migration_20261023_071938_erreurs_du_site.up,
    down: migration_20261023_071938_erreurs_du_site.down,
    name: '20261023_071938_erreurs_du_site',
  },
  {
    up: migration_20261024_180000_postgis_places.up,
    down: migration_20261024_180000_postgis_places.down,
    name: '20261024_180000_postgis_places',
  },
  {
    up: migration_20261026_174159_exemples.up,
    down: migration_20261026_174159_exemples.down,
    name: '20261026_174159_exemples',
  },
  {
    up: migration_20261026_175000_exemples_annonces.up,
    down: migration_20261026_175000_exemples_annonces.down,
    name: '20261026_175000_exemples_annonces',
  },
  {
    up: migration_20261026_175100_exemples_prestataires.up,
    down: migration_20261026_175100_exemples_prestataires.down,
    name: '20261026_175100_exemples_prestataires',
  },
  {
    up: migration_20261026_190000_index_recherche.up,
    down: migration_20261026_190000_index_recherche.down,
    name: '20261026_190000_index_recherche',
  },
  {
    up: migration_20261026_203255_faits_lieux.up,
    down: migration_20261026_203255_faits_lieux.down,
    name: '20261026_203255_faits_lieux',
  },
  {
    up: migration_20261026_213000_faits_lieux_donnees.up,
    down: migration_20261026_213000_faits_lieux_donnees.down,
    name: '20261026_213000_faits_lieux_donnees',
  },
  {
    up: migration_20261026_230000_retraits.up,
    down: migration_20261026_230000_retraits.down,
    name: '20261026_230000_retraits',
  },
  {
    up: migration_20261026_235900_suppression_retraits.up,
    down: migration_20261026_235900_suppression_retraits.down,
    name: '20261026_235900_suppression_retraits',
  },
  {
    up: migration_20261027_090000_index_position.up,
    down: migration_20261027_090000_index_position.down,
    name: '20261027_090000_index_position',
  },
  {
    up: migration_20261027_120000_source_overture.up,
    down: migration_20261027_120000_source_overture.down,
    name: '20261027_120000_source_overture',
  },
  {
    up: migration_20261027_121000_import_overture.up,
    down: migration_20261027_121000_import_overture.down,
    name: '20261027_121000_import_overture',
  },
  {
    up: migration_20261027_122000_import_mosquees.up,
    down: migration_20261027_122000_import_mosquees.down,
    name: '20261027_122000_import_mosquees'
  },
  {
    up: migration_20261027_130000_accompagnement.up,
    down: migration_20261027_130000_accompagnement.down,
    name: '20261027_130000_accompagnement',
  },
  {
    up: migration_20261027_131000_packs_initiaux.up,
    down: migration_20261027_131000_packs_initiaux.down,
    name: '20261027_131000_packs_initiaux',
  },
];
