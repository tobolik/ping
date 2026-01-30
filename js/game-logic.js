// Game logic - win condition, service state, score updates
import { state } from './state.js';
import { isDoubleTournament, getSidePlayerIds, cloneState } from './utils.js';

export function checkWinCondition(match, pointsToWin) {
    if (match.score1 >= pointsToWin && match.score1 >= match.score2 + 2) return 1;
    if (match.score2 >= pointsToWin && match.score2 >= match.score1 + 2) return 2;
    return null;
}

export function getDoubleServeBlockSize(match, tournament) {
    const base = tournament.pointsToWin === 21 ? 5 : 2;
    const deuceThreshold = tournament.pointsToWin - 1;
    if (match.score1 >= deuceThreshold && match.score2 >= deuceThreshold) {
        return 1;
    }
    return base;
}

export function initializeDoubleRotationState(tournament, match, firstServerSide) {
    const team1Players = getSidePlayerIds(tournament, match, 1);
    const team2Players = getSidePlayerIds(tournament, match, 2);
    const order = [
        { playerId: team1Players[0], side: 1 },
        { playerId: team2Players[0], side: 2 },
        { playerId: team1Players[1], side: 1 },
        { playerId: team2Players[1], side: 2 }
    ].filter(entry => entry.playerId);
    if (!order.length) {
        match.doubleRotationState = null;
        match.servingPlayer = null;
        return;
    }
    const startingIndex = firstServerSide === 1 ? 0 : 1;
    match.doubleRotationState = {
        order,
        currentIndex: startingIndex % order.length,
        pointsServedThisTurn: 0
    };
    match.servingPlayer = order[startingIndex % order.length]?.playerId ?? null;
}

export function advanceDoubleServeState(match, tournament) {
    if (!match.doubleRotationState || !match.doubleRotationState.order?.length) return;
    const blockSize = getDoubleServeBlockSize(match, tournament);
    const oldIndex = match.doubleRotationState.currentIndex;
    const oldPoints = match.doubleRotationState.pointsServedThisTurn || 0;
    // Zvýšíme počet odehraných bodů v tomto bloku
    match.doubleRotationState.pointsServedThisTurn = oldPoints + 1;
    // Pokud jsme dosáhli konce bloku, přejdeme na dalšího hráče
    if (match.doubleRotationState.pointsServedThisTurn >= blockSize) {
        match.doubleRotationState.pointsServedThisTurn = 0;
        match.doubleRotationState.currentIndex = (match.doubleRotationState.currentIndex + 1) % match.doubleRotationState.order.length;
    }
    // Aktualizujeme servingPlayer podle aktuálního indexu
    match.servingPlayer = match.doubleRotationState.order[match.doubleRotationState.currentIndex]?.playerId ?? null;
}

export function reverseDoubleServeState(match, tournament) {
    if (!match.doubleRotationState || !match.doubleRotationState.order?.length) return;
    const blockSize = getDoubleServeBlockSize(match, tournament);
    match.doubleRotationState.pointsServedThisTurn = (match.doubleRotationState.pointsServedThisTurn || 0) - 1;
    if (match.doubleRotationState.pointsServedThisTurn < 0) {
        match.doubleRotationState.currentIndex = (match.doubleRotationState.currentIndex - 1 + match.doubleRotationState.order.length) % match.doubleRotationState.order.length;
        match.doubleRotationState.pointsServedThisTurn = blockSize - 1;
    }
    match.servingPlayer = match.doubleRotationState.order[match.doubleRotationState.currentIndex]?.playerId ?? null;
}

export function recalculateServiceState(match, tournament) {
    if (isDoubleTournament(tournament)) {
        if (match.doubleRotationState && match.doubleRotationState.order?.length) {
            // Recalculate pointsServedThisTurn based on current score
            const totalScore = match.score1 + match.score2;
            const blockSize = getDoubleServeBlockSize(match, tournament);

            if (totalScore === 0) {
                // Před prvním bodem
                match.doubleRotationState.pointsServedThisTurn = 0;
                const startingIndex = match.firstServer === 1 ? 0 : 1;
                match.doubleRotationState.currentIndex = startingIndex % match.doubleRotationState.order.length;
            } else {
                // Calculate how many points have been served in the current block
                const pointsInCurrentBlock = totalScore % blockSize;
                match.doubleRotationState.pointsServedThisTurn = pointsInCurrentBlock === 0 ? blockSize : pointsInCurrentBlock;

                // Calculate which player should be serving based on the block
                const currentBlockIndex = Math.floor(totalScore / blockSize);
                const startingIndex = match.firstServer === 1 ? 0 : 1;
                const playerIndexInRotation = (startingIndex + currentBlockIndex) % match.doubleRotationState.order.length;
                match.doubleRotationState.currentIndex = playerIndexInRotation;
            }
            match.servingPlayer = match.doubleRotationState.order[match.doubleRotationState.currentIndex]?.playerId ?? null;
        }
        return;
    }
    const pointsToWin = tournament.pointsToWin;
    const totalScore = match.score1 + match.score2;
    const p1Id = match.player1Id;
    const p2Id = match.player2Id;

    if (!match.firstServer) {
        match.servingPlayer = null;
        return;
    }

    const firstServerId = match.firstServer === 1 ? p1Id : p2Id;
    const otherPlayerId = match.firstServer === 1 ? p2Id : p1Id;

    const deuceThreshold = pointsToWin - 1;
    if (match.score1 >= deuceThreshold && match.score2 >= deuceThreshold) {
        const pointsIntoDeuce = (match.score1 - deuceThreshold) + (match.score2 - deuceThreshold);
        const serverAtDeuceStart = (Math.floor((deuceThreshold * 2) / 2) % 2 === 0) ? firstServerId : otherPlayerId;
        match.servingPlayer = (pointsIntoDeuce % 2 === 0) ? serverAtDeuceStart : (serverAtDeuceStart === firstServerId ? otherPlayerId : firstServerId);
        return;
    }

    if (totalScore === 0) {
        match.servingPlayer = firstServerId;
        return;
    }

    // Blok 0 (body 0-1): první hráč, Blok 1 (body 2-3): druhý hráč, Blok 2 (body 4-5): první hráč, atd.
    const serviceBlockIndex = Math.floor(totalScore / 2);

    if (serviceBlockIndex % 2 === 0) { // Blocks 0, 2, 4...
        match.servingPlayer = firstServerId;
    } else { // Blocks 1, 3, 5...
        match.servingPlayer = otherPlayerId;
    }
}
