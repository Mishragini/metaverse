import { WebSocketServer } from 'ws';
import { User } from './user';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws) {
    let user = new User(ws)

    ws.on('error', console.error);
    ws.on('close', () => {
        user.destroy();
    })

    ws.send('something');
});