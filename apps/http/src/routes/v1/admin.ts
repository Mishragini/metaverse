import { Router } from 'express';
import { CreateAvatarSchema, CreateElementSchema, CreateMapSchema, UpdateElementSchema } from '../../types';
import { dbClient } from '@repo/db/dbClient';
import { adminMiddleware } from '../../middlewares/admin';

export const adminRouter = Router();
adminRouter.use(adminMiddleware)

adminRouter.post('/element', async (req, res) => {
    const parsedData = CreateElementSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Invalid inputs" })
        return
    }

    const element = await dbClient.element.create({
        data: {
            width: parsedData.data.width,
            height: parsedData.data.height,
            imageUrl: parsedData.data.imageUrl,
            static: parsedData.data.static
        }
    })
    res.json({ id: element.id })
})

adminRouter.put('/element/:elementId', async (req, res) => {
    const parsedData = UpdateElementSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Invalid inputs" })
        return
    }
    const elementId = req.params.elementId;

    await dbClient.element.update({
        where: {
            id: elementId
        },
        data: {
            imageUrl: parsedData.data.imageUrl
        }
    })

    res.json({ message: "Element updated" })

})

adminRouter.post('/avatar', async (req, res) => {
    const parsedData = CreateAvatarSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Invalid inputs" })
        return
    }

    const avatar = await dbClient.avatar.create({
        data: {
            imageUrl: parsedData.data.imageUrl,
            name: parsedData.data.name
        }
    })

    res.json({ avatarId: avatar.id })
})

adminRouter.post('/map', async (req, res) => {
    const parsedData = CreateMapSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Invalid inputs" })
        return
    }

    const map = await dbClient.map.create({
        data: {
            name: parsedData.data.name,
            width: parseInt(parsedData.data.dimensions.split('x')[0]!),
            height: parseInt(parsedData.data.dimensions.split('x')[1]!),
            thumbnail: parsedData.data.thumbnail,
            mapElements: {
                create: parsedData.data.defaultElements.map(e => ({
                    elementId: e.elementId,
                    x: e.x,
                    y: e.y
                }))
            }
        }
    })

    res.json({ mapId: map.id })

})