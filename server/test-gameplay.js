import http from 'http';
import { WebSocket } from 'ws';
import express from 'express';
import cors from 'cors';
import { setupWebSocket } from './src/websocket.js';

async function runTests() {
  console.log('--- Starting Chess Backend Integration Tests ---');

  const app = express();
  app.use(cors());
  const server = http.createServer(app);
  const { gameManager } = setupWebSocket(server);

  const TEST_PORT = 3099;
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`Test server running on port ${TEST_PORT}`);

  const wsUrl = `ws://localhost:${TEST_PORT}`;

  function createClient() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const messages = [];
      const listeners = [];

      ws.on('open', () => resolve({ ws, messages, waitForMessage, clearMessages }));
      ws.on('error', reject);

      ws.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        for (let i = 0; i < listeners.length; i++) {
          const l = listeners[i];
          if (l.predicate(parsed)) {
            listeners.splice(i, 1);
            l.resolve(parsed);
            return;
          }
        }
        messages.push(parsed);
      });

      function clearMessages() {
        messages.length = 0;
      }

      function waitForMessage(predicate, timeout = 3000) {
        const foundIndex = messages.findIndex(predicate);
        if (foundIndex !== -1) {
          const [msg] = messages.splice(foundIndex, 1);
          return Promise.resolve(msg);
        }

        return new Promise((res, rej) => {
          const timer = setTimeout(() => {
            const idx = listeners.findIndex((l) => l.resolve === res);
            if (idx !== -1) listeners.splice(idx, 1);
            rej(new Error('Timeout waiting for message'));
          }, timeout);

          listeners.push({
            predicate,
            resolve: (msg) => {
              clearTimeout(timer);
              res(msg);
            },
          });
        });
      }
    });
  }

  try {
    // 1. Connect Client 1 (White)
    console.log('Test 1: Creating game room...');
    const client1 = await createClient();
    client1.ws.send(JSON.stringify({ type: 'create_game' }));

    const createdMsg = await client1.waitForMessage((m) => m.type === 'game_created');
    console.log('✓ Received game_created:', createdMsg);
    if (!createdMsg.roomId || createdMsg.roomId.length !== 6 || createdMsg.color !== 'white') {
      throw new Error(`Unexpected game_created payload: ${JSON.stringify(createdMsg)}`);
    }

    const roomId = createdMsg.roomId;

    // 2. Connect Client 2 (Black) and Join
    console.log('Test 2: Joining game room...');
    const client2 = await createClient();
    client2.ws.send(JSON.stringify({ type: 'join_game', roomId }));

    const startMsg1 = await client1.waitForMessage((m) => m.type === 'game_started');
    const startMsg2 = await client2.waitForMessage((m) => m.type === 'game_started');
    console.log('✓ Both players received game_started');
    if (startMsg1.color !== 'white' || startMsg2.color !== 'black') {
      throw new Error('Player colors mismatch');
    }

    // 3. Test: Black tries to move out of turn
    console.log("Test 3: Black moves on White's turn (should fail)...");
    client2.ws.send(JSON.stringify({ type: 'make_move', roomId, from: 'e7', to: 'e5' }));
    const errTurn = await client2.waitForMessage((m) => m.type === 'error');
    console.log('✓ Properly rejected out-of-turn move:', errTurn.message);

    // 4. White moves 1. e4
    console.log('Test 4: White moves e2 -> e4...');
    client1.ws.send(JSON.stringify({ type: 'make_move', roomId, from: 'e2', to: 'e4' }));
    const stateMsg1 = await client1.waitForMessage((m) => m.type === 'game_state');
    const stateMsg2 = await client2.waitForMessage((m) => m.type === 'game_state');
    console.log('✓ e4 move broadcast to both:', stateMsg1.lastMove);
    if (stateMsg1.turn !== 'black') throw new Error('Turn should now be black');

    // 5. White tries to move again (should fail)
    console.log('Test 5: White moves again immediately (should fail)...');
    client1.ws.send(JSON.stringify({ type: 'make_move', roomId, from: 'g1', to: 'f3' }));
    const errTurn2 = await client1.waitForMessage((m) => m.type === 'error');
    console.log('✓ Properly rejected White moving twice:', errTurn2.message);

    // 6. Black moves 1... e5
    console.log('Test 6: Black moves e7 -> e5...');
    client2.ws.send(JSON.stringify({ type: 'make_move', roomId, from: 'e7', to: 'e5' }));
    await client1.waitForMessage((m) => m.type === 'game_state');
    await client2.waitForMessage((m) => m.type === 'game_state');
    console.log('✓ e5 move acknowledged');

    // 7. White attempts illegal move
    console.log('Test 7: White attempts illegal move e4 -> e6 (should fail)...');
    client1.ws.send(JSON.stringify({ type: 'make_move', roomId, from: 'e4', to: 'e6' }));
    const errIllegal = await client1.waitForMessage((m) => m.type === 'error');
    console.log('✓ Rejected illegal move:', errIllegal.message);

    // 8. Scholar's Mate sequence:
    console.log("Test 8: Testing Scholar's Mate sequence...");
    // 2. Qh5
    client1.ws.send(JSON.stringify({ type: 'make_move', roomId, from: 'd1', to: 'h5' }));
    await client1.waitForMessage((m) => m.type === 'game_state');
    await client2.waitForMessage((m) => m.type === 'game_state');

    // 2... Nc6
    client2.ws.send(JSON.stringify({ type: 'make_move', roomId, from: 'b8', to: 'c6' }));
    await client1.waitForMessage((m) => m.type === 'game_state');
    await client2.waitForMessage((m) => m.type === 'game_state');

    // 3. Bc4
    client1.ws.send(JSON.stringify({ type: 'make_move', roomId, from: 'f1', to: 'c4' }));
    await client1.waitForMessage((m) => m.type === 'game_state');
    await client2.waitForMessage((m) => m.type === 'game_state');

    // 3... Nf6
    client2.ws.send(JSON.stringify({ type: 'make_move', roomId, from: 'g8', to: 'f6' }));
    await client1.waitForMessage((m) => m.type === 'game_state');
    await client2.waitForMessage((m) => m.type === 'game_state');

    // 4. Qxf7#
    client1.ws.send(JSON.stringify({ type: 'make_move', roomId, from: 'h5', to: 'f7' }));
    const gameOverMsg1 = await client1.waitForMessage((m) => m.type === 'game_over');
    const gameOverMsg2 = await client2.waitForMessage((m) => m.type === 'game_over');
    console.log('✓ Checkmate detected and game_over event received:', gameOverMsg1);
    if (gameOverMsg1.result !== 'checkmate' || gameOverMsg1.winner !== 'white') {
      throw new Error(`Unexpected game_over data: ${JSON.stringify(gameOverMsg1)}`);
    }

    // 9. Test Disconnect Handling
    console.log('Test 9: Disconnect handling...');
    client2.ws.close();
    const disconnectMsg = await client1.waitForMessage((m) => m.type === 'opponent_disconnected');
    console.log('✓ Opponent received disconnect notice:', disconnectMsg.message);

    // Clean up
    client1.ws.close();
    server.close();
    console.log('\n>>> ALL 9 INTEGRATION TESTS PASSED SUCCESSFULLY! <<<\n');
    process.exit(0);
  } catch (err) {
    console.error('Test Failed:', err);
    server.close();
    process.exit(1);
  }
}

runTests();
