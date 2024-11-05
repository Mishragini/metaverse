import { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../config";



export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(' ')[1];

    if (!token) {
        res.status(401).json({ message: "Unauthorized" })
        return
    }

    try {
        const decoded = jwt.verify(token, JWT_PASSWORD) as jwt.JwtPayload

        if (decoded.role !== "Admin") {
            res.status(401).json({ message: "Unauthorized" })
            return
        }

        req.userId = decoded.userId
        next()
    } catch (e) {
        res.status(401).json({ message: "Unauthorized" })
        return
    }
}