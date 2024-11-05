import { Router } from 'express';
import { userMiddleware } from '../../middlewares/user';
import { UpdateMetadataSchema } from '../../types';
import { dbClient } from '@repo/db/dbClient';

export const userRouter = Router();

userRouter.post("/metadata", userMiddleware, async (req, res) => {
    const parsedData = UpdateMetadataSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.json(400).json({ message: "Invalid inputs" })
        return
    }

    try {
        await dbClient.user.update({
            where: {
                id: req.userId
            },
            data: {
                avatarId: parsedData.data.avatarId
            }
        })
        res.json({ message: 'Updated metadata' })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occured'
        res.status(500).json({ message })

    }
})

userRouter.get('/metadata/bulk', async (req, res) => {
    const userIdsString = req.query.userIds as string;
    const userIdsArray = userIdsString?.slice(1, userIdsString.length - 1).split(',')

    try {
        const users = await dbClient.user.findMany({
            where: {
                id: {
                    in: userIdsArray
                }
            }, select: {
                id: true,
                avatar: {
                    select: {
                        imageUrl: true
                    }
                }
            }
        })

        const avatars = users.map(user => ({
            userId: user.id,
            imageUrl: user.avatar?.imageUrl
        }))

        res.json({ avatars })

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user metadata'
        res.status(500).json({ errorMessage });
    }
})