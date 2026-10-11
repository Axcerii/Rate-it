// =====================================================================================
// TEXTES DE LA PAGE PLAY (écran des joueurs) — à modifier librement
//
// Tout ce que le joueur lit pendant une partie est ici. Vous pouvez changer, ajouter ou
// retirer des phrases sans toucher au reste du code :
//   - gardez les guillemets autour de chaque phrase et la virgule à la fin de la ligne ;
//   - une apostrophe dans une phrase entre guillemets simples s'écrit \' (ou utilisez "…") ;
//   - dans les listes de réactions, une phrase est choisie parmi celles de la liste : plus
//     il y en a, moins elles se répètent. Il en faut au moins une par liste.
// =====================================================================================

// Le petit mot affiché à côté de chaque note
export const RATING_LABELS: Record<number, string> = {
  1: 'Skip, vite !',
  2: 'Oubliable',
  3: 'Honnête',
  4: 'Hop, dans ma playlist',
  5: 'Aucun défaut',
};

// Textes de l'écran de vote
export const VOTE_TEXTS = {
  // Avant d'avoir voté
  prompt: 'Choisissez votre note',
  // Une fois la note donnée
  voted: 'Voté ! Encore modifiable',
};

// Textes de la salle d'attente
export const WAITING_ROOM_TEXTS = {
  title: 'En attente de l\'hôte',
  description: 'La partie commencera dès que l\'hôte lancera la session. Préparez-vous !',
  // Au-dessus de la liste des joueurs présents
  playersTitle: 'Dans la salle',
  // Quand le joueur est le seul arrivé
  aloneHint: 'Vous êtes le premier arrivé, les autres ne devraient pas tarder.',
};

// À partir de quel écart avec la moyenne de la salle on change de réaction.
// Exemple : avec 0.5 et 1.5, une note à 4 pour une moyenne de 3.2 (écart 0.8) est « un peu au-dessus »,
// une note à 5 pour une moyenne de 3 (écart 2) est « très au-dessus ».
export const REACTION_GAPS = {
  same: 1,
  far: 2,
};

// Réactions affichées au joueur quand la note de la salle tombe, selon sa propre note
export const VOTE_REACTIONS = {
  // Sa note est très proche de la moyenne
  same: [
    'Dans la moyenne de la salle.',
    'Vous êtes raccord avec tout le monde.',
    'La Ruche pense comme vous.',
  ],
  // Un peu plus généreux que la salle
  bitAbove: [
    'Un peu plus généreux que votre entourage.',
    'Vous appréciez cette musique plus que les autres.',
    'Vous l\'aimez un peu plus que les autres.',
  ],
  // Beaucoup plus généreux que la salle
  wayAbove: [
    'Soit vous êtes un hipster, soit un visionnaire.',
    'Vous êtes plus généreux que la salle.',
    'Vous adorez, pas eux.',
  ],
  // Un peu plus sévère que la salle
  bitBelow: [
    'Un peu plus sévère que la salle.',
    'Vous avez moins apprécié que les autres.',
    'Petite haine sur celle-ci.',
  ],
  // Beaucoup plus sévère que la salle
  wayBelow: [
    'Soit vous êtes un hipster, soit un monstre.',
    'TOUT ÇA ?!',
    'Tout le monde a aimé… sauf vous.',
  ],
  // Il est le seul à avoir voté
  alone: [
    'Seul votant, seul juge.',
  ],
  // Il n'a pas voté
  noVote: [
    'Pas de vote.',
  ],
};

// Choisit la réaction à afficher. `seed` (le numéro de la vidéo) garantit que la même phrase reste
// affichée tant qu'on est sur la même vidéo, au lieu de changer à chaque mise à jour de l'écran.
export function pickVoteReaction(myVote: number | undefined, average: number, votesCount: number, seed: number): string {
  let list: string[];
  if (myVote === undefined || myVote === null) list = VOTE_REACTIONS.noVote;
  else if (votesCount <= 1) list = VOTE_REACTIONS.alone;
  else {
    const gap = myVote - average;
    if (Math.abs(gap) < REACTION_GAPS.same) list = VOTE_REACTIONS.same;
    else if (gap > 0) list = gap >= REACTION_GAPS.far ? VOTE_REACTIONS.wayAbove : VOTE_REACTIONS.bitAbove;
    else list = -gap >= REACTION_GAPS.far ? VOTE_REACTIONS.wayBelow : VOTE_REACTIONS.bitBelow;
  }
  return list[Math.abs(seed) % list.length] || '';
}
