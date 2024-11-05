import { Router } from 'express';
import { AddElementSchema, CreateSpaceSchema, DeleteSpaceElementSchema } from '../../types';
import { dbClient } from '@repo/db/dbClient';
import { userMiddleware } from '../../middlewares/user';

export const spaceRouter = Router();
spaceRouter.use(userMiddleware)
spaceRouter.post('/element', async (req, res) => {
    const parsedData = AddElementSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.status(400).json({ message: "Invalid inputs" })
        return
    }

    const space = await dbClient.space.findFirst({
        where: {
            id: parsedData.data.spaceId,
            creatorId: req.userId,
        }
    })

    if (!space) {
        res.status(400).json({ message: "Space not found" })
        return
    }

    if (req.body.x < 0 || req.body.y < 0 || req.body.x > space.width || req.body.y > space.height) {
        res.status(400).json({ message: "You are trying to place the element outside the space's boundary" })
        return

    }

    await dbClient.spaceElements.create({
        data: {
            spaceId: parsedData.data.spaceId,
            elementId: parsedData.data.elementId,
            x: parsedData.data.x,
            y: parsedData.data.y
        }
    })

    res.json({ message: "Element added" })


})

spaceRouter.delete('/element', async (req, res) => {
    try {
        const parsedData = DeleteSpaceElementSchema.safeParse(req.body);
        if (!parsedData.success) {
            res.status(400).json({ message: "Invalid inputs" });
            return
        }

        const spaceElement = await dbClient.spaceElements.findUnique({
            where: {
                id: parsedData.data.id
            },
            include: {
                space: true
            }
        })

        if (spaceElement?.space.creatorId !== req.userId) {
            res.status(403).json({ message: "Unauthorized" });
        }

        await dbClient.spaceElements.delete({
            where: {
                id: parsedData.data.id
            }
        })

        res.json({ message: "Element deleted from the space" })

    } catch (error) {
        console.error('Error deleting space element:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

spaceRouter.post('/', async (req, res) => {
    try {
        const parsedData = CreateSpaceSchema.safeParse(req.body);
        if (!parsedData.success) {
            res.status(400).json({ message: "Invalid inputs" });
            return
        }

        if (!parsedData.data?.mapId) {
            const space = await dbClient.space.create({
                data: {
                    name: parsedData.data.name,
                    width: parseInt(parsedData.data.dimensions.split("x")[0]!),
                    height: parseInt(parsedData.data.dimensions.split("x")[1]!),
                    creatorId: req.userId!,
                }
            });
            res.status(200).json({ spaceId: space.id });
            return
        }

        const map = await dbClient.map.findUnique({
            where: {
                id: parsedData.data.mapId
            },
            select: {
                mapElements: true,
                width: true,
                height: true
            }
        });

        if (!map) {
            res.status(404).json({ message: "Map not found" });
            return
        }

        const space = await dbClient.space.create({
            data: {
                name: parsedData.data.name,
                width: map.width,
                height: map.height,
                creatorId: req.userId!,
                elements: {
                    create: map.mapElements
                        .filter(e => e.x !== null && e.y !== null)
                        .map(e => ({
                            elementId: e.elementId,
                            x: e.x!,
                            y: e.y!,
                        }))
                }
            }
        });

        res.status(200).json({ spaceId: space.id });

    } catch (error) {
        console.error('Error creating space:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

spaceRouter.delete('/:spaceId', async (req, res) => {

    const space = await dbClient.space.findUnique({
        where: {
            id: req.params.spaceId
        }
    })

    if (space?.creatorId !== req.userId) {
        res.status(403).json({ message: "Unauthorized" })
    }

    await dbClient.space.delete({
        where: {
            id: req.params.spaceId
        }
    })

    res.json({ message: "Space deleted" })
})

spaceRouter.get('/all', async (req, res) => {
    const spaces = await dbClient.space.findMany({
        where: {
            creatorId: req.userId
        }
    })
    const formattedSpaces = spaces.map(space => ({
        id: space.id,
        name: space.name,
        dimensions: `${space.width}x${space.height || ''}`,
        thumbnail: space.thumbnail || ''
    }));
    res.json({
        spaces: formattedSpaces
    });
})

spaceRouter.get('/:spaceId', async (req, res) => {
    const space = await dbClient.space.findFirst({
        where: {
            id: req.params.spaceId
        },
        include: {
            elements: {
                include: {
                    element: true
                }
            }
        }
    })

    if (!space) {
        res.status(400).json({ message: "Space not found" })
        return
    }

    res.json({
        dimensions: `${space.width}x${space.height}`,
        elements: space.elements.map(e => ({
            id: e.id,
            element: {
                id: e.element.id,
                imageUrl: e.element.imageUrl,
                width: e.element.width,
                height: e.element.height,
                static: e.element.static
            },
            x: e.x,
            y: e.y
        })),
    })
})

