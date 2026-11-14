/**
 * Réponses préparées de la boîte unique (français, style ASD-STE100). Point de départ seulement :
 * l’équipe les complète avant l’envoi. Aucune ne promet un délai ni une information non vérifiée.
 */
export const PREPARED_REPLIES: Array<{ key: string; label: string; kinds: string[]; text: string }> = [
  { key: 'merci', label: 'Merci, nous regardons', kinds: ['*'], text: 'Bonjour,\n\nMerci pour votre message. L’équipe DALIL l’a bien reçu et l’examine.\n\nBien à vous,\nL’équipe DALIL' },
  { key: 'infos', label: 'Il manque des informations', kinds: ['*'], text: 'Bonjour,\n\nMerci pour votre message. Pour avancer, nous avons besoin de :\n- \n\nRépondez simplement à cet email.\n\nBien à vous,\nL’équipe DALIL' },
  { key: 'contribution', label: 'Contribution en vérification', kinds: ['contribution'], text: 'Bonjour,\n\nMerci pour votre contribution. Nous vérifions chaque information avant publication. Nous vous écrivons quand la fiche est en ligne.\n\nBien à vous,\nL’équipe DALIL' },
  { key: 'pro', label: 'Candidature reçue', kinds: ['application'], text: 'Bonjour,\n\nMerci pour votre candidature. Nous contrôlons les pièces transmises. Un abonnement ne donne aucun droit au label DALIL : la vérification est indépendante.\n\nBien à vous,\nL’équipe DALIL' },
  { key: 'signalement', label: 'Signalement traité', kinds: ['report'], text: 'Bonjour,\n\nMerci pour votre signalement. Nous avons contrôlé l’annonce et pris les mesures utiles.\n\nBien à vous,\nL’équipe DALIL' },
  { key: 'orientation', label: 'Orienter vers le bon interlocuteur', kinds: ['*'], text: 'Bonjour,\n\nMerci pour votre message. Pour cette demande, l’interlocuteur compétent est :\n- \n\nBien à vous,\nL’équipe DALIL' },
]
