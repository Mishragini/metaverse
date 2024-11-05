import { User } from "./user";

export class RoomManager {
    public rooms: Map<string, User[]>
    public static instance: RoomManager;

    private constructor() {
        this.rooms = new Map()
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new RoomManager();
        }

        return this.instance;
    }

    public addUser(spaceId: string, user: User) {
        if (!this.rooms.has(spaceId)) {
            this.rooms.set(spaceId, [user])
        }
        this.rooms.set(spaceId, [...this.rooms.get(spaceId) ?? [], user])
    }

    public broadcast(user: User, spaceId: string, message: string) {
        if (!this.rooms.has(spaceId)) {
            return;
        }
        this.rooms.get(spaceId)?.forEach((u) => {
            if (u.id !== user.id)
                u.ws.send(message)
        })
    }

    public removeUser(user: User, spaceId: string) {
        if (!this.rooms.has(spaceId)) {
            return;
        }
        this.rooms.set(spaceId, this.rooms.get(spaceId)?.filter(u => u.id !== user.id) ?? [])
    }
}