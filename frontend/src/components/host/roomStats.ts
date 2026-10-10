import type { GameSession } from '../../../../shared/types';

// Values derived from the session that several host views need: who is there, who voted to skip
export function getRoomStats(session: GameSession) {
  const playersList = Object.values(session.players || {});
  const activeConnectedPlayers = playersList.filter(p => p.isConnected);
  const skipsCount = Object.keys(session.skips || {}).filter(id => session.players[id]?.isConnected && session.skips?.[id]).length;
  const revealSkipsCount = Object.keys(session.revealSkips || {}).filter(id => session.players[id]?.isConnected && session.revealSkips?.[id]).length;
  const hostPlayerId = session.hostPlayerId || Object.values(session.players || {}).find(p => p.isHost)?.id || '';
  const hostHasSkipped = session.phase === 'REVEAL'
    ? Boolean(hostPlayerId && session.revealSkips?.[hostPlayerId])
    : Boolean(hostPlayerId && session.skips?.[hostPlayerId]);

  return { playersList, activeConnectedPlayers, skipsCount, revealSkipsCount, hostPlayerId, hostHasSkipped };
}
