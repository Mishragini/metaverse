import { WebSocket } from "ws";
import jwt, { JwtPayload } from 'jsonwebtoken'
import { JWT_PASSWORD } from "./config";
import { dbClient } from "@repo/db/dbClient";
import { RoomManager } from "./roomManager";

function getRandomString(length: number) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}


export class User {
    public id: string;
    public userId?: string;
    public spaceId?: string;
    private x: number;
    private y: number;
    public ws: WebSocket;

    constructor(ws: WebSocket) {
        this.id = getRandomString(10);
        this.x = 0;
        this.y = 0;
        this.ws = ws;
        this.initHandlers()
    }

    initHandlers() {
        this.ws.on("message", async (data) => {
            const parsedData = JSON.parse(data.toString());

            switch (parsedData.type) {
                case "join":
                    const userId = (jwt.verify(parsedData.payload.token, JWT_PASSWORD) as JwtPayload).userId;
                    if (!userId) {
                        this.ws.close()
                        return
                    }
                    this.userId = userId;

                    const spaceId = parsedData.payload.spaceId;
                    const space = await dbClient.space.findFirst({
                        where: {
                            id: spaceId
                        }
                    })
                    if (!space) {
                        this.ws.close()
                        return
                    }
                    this.spaceId = space.id;

                    RoomManager.getInstance().addUser(this.spaceId, this)
                    this.x = Math.floor(Math.random() * space.width);
                    this.y = Math.floor(Math.random() * space.height);

                    this.ws.send(JSON.stringify({
                        type: "space-joined",
                        payload: {
                            spawn: {
                                x: this.x,
                                y: this.y
                            },
                            users: RoomManager.getInstance().rooms.get(spaceId)?.filter(x => x.id !== this.id).map(u => ({ id: u.id })) ?? []
                        }
                    }))

                    RoomManager.getInstance().broadcast(this, this.spaceId, JSON.stringify({
                        type: "user-joined",
                        payload: {
                            userId: this.userId,
                            x: this.x,
                            y: this.y
                        }
                    }))
                    break;
                case "move":
                    const moveX = parsedData.payload.x;
                    const moveY = parsedData.payload.y;
                    const xDisplacement = Math.abs(this.x - moveX);
                    const yDisplacement = Math.abs(this.y - moveY);
                    if ((xDisplacement == 1 && yDisplacement == 0) || (xDisplacement == 0 && yDisplacement == 1)) {
                        this.x = moveX;
                        this.y = moveY;
                        RoomManager.getInstance().broadcast(this, this.spaceId!, JSON.stringify(
                            {
                                type: "movement",
                                payload: {
                                    x: this.x,
                                    y: this.y
                                }
                            }
                        ));
                        return;
                    }

                    this.ws.send(JSON.stringify({
                        type: "movement-rejected",
                        payload: {
                            x: this.x,
                            y: this.y
                        }
                    }));
            }
        })
    }
    public destroy() {
        RoomManager.getInstance().broadcast(this, this.spaceId!, JSON.stringify({
            type: "user-left",
            payload: {
                userId: this.userId
            }
        }));
        RoomManager.getInstance().removeUser(this, this.spaceId!);
    }
}