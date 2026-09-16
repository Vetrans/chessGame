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
  setupWebSocket(server);

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
    // 1. Initial Stats check on connection
    console.log('Test 1: Connecting client and verifying initial server_stats...');
    const client1 = await createClient();
    const initialStats = await client1.waitForMessage((m) => m.type === 'server_stats');
    console.log('✓ Received initial server_stats:', initialStats);

    // 2. Client 1 creates game room
    console.log('Test 2: Creating game room...');
    client1.ws.send(JSON.stringify({ type: 'create_game' }));
    const createdMsg = await client1.waitForMessage((m) => m.type === 'game_created');
    console.log('✓ Received game_created:', createdMsg.roomId);
    const roomId = createdMsg.roomId;

    // 3. Client 2 joins using join_random_game
    console.log('Test 3: Client 2 joins using join_random_game...');
    const client2 = await createClient();
    client2.ws.send(JSON.stringify({ type: 'join_random_game' }));

    const startMsg1 = await client1.waitForMessage((m) => m.type === 'game_started');
    const startMsg2 = await client2.waitForMessage((m) => m.type === 'game_started');
    console.log('✓ Both players received game_started');

    // Verify 10 minute clocks
    if (!startMsg1.state.clocks || startMsg1.state.clocks.white < 595000) {
      throw new Error(`Clock is not 10 minutes: ${JSON.stringify(startMsg1.state.clocks)}`);
    }
    console.log('✓ Default 10-minute clocks initialized (~600,000ms each)');

    // 4. White moves 1. e4 (normal move)
    console.log('Test 4: White moves e2 -> e4...');
    client1.ws.send(JSON.stringify({ type: 'make_move', roomId, from: 'e2', to: 'e4', isPremove: false }));
    const stateMsg1 = await client1.waitForMessage((m) => m.type === 'game_state');
    await client2.waitForMessage((m) => m.type === 'game_state');
    console.log('✓ e4 move broadcast:', stateMsg1.lastMove);

    // 5. Black executes premove 1... e5 (isPremove: true)
    console.log('Test 5: Black executes premove e7 -> e5 (should take 0.01s = 10ms)...');
    client2.ws.send(JSON.stringify({ type: 'make_move', roomId, from: 'e7', to: 'e5', isPremove: true }));
    const stateMsg2 = await client2.waitForMessage((m) => m.type === 'game_state');
    console.log('✓ Premove e5 broadcast. Black clock remaining:', stateMsg2.clocks.black);
    // Black clock should be deducted by exactly 10ms (600,000 - 10 = 599,990ms)
    if (stateMsg2.clocks.black !== 599990) {
      throw new Error(`Expected Black clock 599990ms but got ${stateMsg2.clocks.black}ms`);
    }
    console.log('✓ Verified: Premove deducted exactly 0.01 sec (10ms)');

    // 6. Test Draw offer and acceptance
    console.log('Test 6: White offers draw, Black accepts...');
    client1.ws.send(JSON.stringify({ type: 'offer_draw', roomId }));
    const drawOffered = await client2.waitForMessage((m) => m.type === 'draw_offered');
    console.log('✓ Black received draw offer from White:', drawOffered);

    client2.ws.send(JSON.stringify({ type: 'offer_draw', roomId }));
    const gameOverDraw = await client1.waitForMessage((m) => m.type === 'game_over');
    console.log('✓ Game over by draw agreement:', gameOverDraw);
    if (gameOverDraw.result !== 'draw_agreement') {
      throw new Error(`Expected draw_agreement result, got ${gameOverDraw.result}`);
    }

    // 7. Test Resignation on new game
    console.log('Test 7: Testing Resign in a new game...');
    const client3 = await createClient();
    client3.ws.send(JSON.stringify({ type: 'create_game' }));
    const room3 = await client3.waitForMessage((m) => m.type === 'game_created');

    const client4 = await createClient();
    client4.ws.send(JSON.stringify({ type: 'join_game', roomId: room3.roomId }));
    await client3.waitForMessage((m) => m.type === 'game_started');
    await client4.waitForMessage((m) => m.type === 'game_started');

    // Client 3 (White) resigns
    client3.ws.send(JSON.stringify({ type: 'resign', roomId: room3.roomId }));
    const resignOver1 = await client3.waitForMessage((m) => m.type === 'game_over');
    const resignOver2 = await client4.waitForMessage((m) => m.type === 'game_over');
    console.log('✓ Resignation broadcast to both players. Winner:', resignOver1.winner, 'Result:', resignOver1.result);
    if (resignOver1.result !== 'resignation' || resignOver1.winner !== 'black') {
      throw new Error(`Unexpected resignation payload: ${JSON.stringify(resignOver1)}`);
    }

    // Clean up
    client1.ws.close();
    client2.ws.close();
    client3.ws.close();
    client4.ws.close();
    server.close();
    console.log('\n>>> ALL 7 NEW FEATURE INTEGRATION TESTS PASSED SUCCESSFULLY! <<<\n');
    process.exit(0);
  } catch (err) {
    console.error('Test Failed:', err);
    server.close();
    process.exit(1);
  }
}

runTests();
