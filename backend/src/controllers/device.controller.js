import { prisma } from '../config/db.js';
export class DeviceController {
    static async getDevices(req, res) {
        try {
            const devices = await prisma.device.findMany({
                where: { userId: req.userId },
                include: {
                    _count: {
                        select: { screenshots: true, usageRecords: true },
                    },
                },
                orderBy: { createdAt: 'asc' },
            });
            return res.json({ devices });
        }
        catch (error) {
            return res.status(500).json({ error: 'Failed to fetch devices.' });
        }
    }
    static async createDevice(req, res) {
        try {
            const { name, deviceType, os, timezone } = req.body;
            if (!name) {
                return res.status(400).json({ error: 'Device name is required.' });
            }
            const device = await prisma.device.create({
                data: {
                    userId: req.userId,
                    name,
                    deviceType: deviceType || 'PHONE',
                    os: os || 'ANDROID',
                    timezone: timezone || 'Asia/Kolkata',
                    status: 'HEALTHY',
                },
            });
            return res.status(201).json({ device });
        }
        catch (error) {
            return res.status(500).json({ error: 'Failed to create device.' });
        }
    }
    static async updateDevice(req, res) {
        try {
            const { id } = req.params;
            const { name, deviceType, os, timezone, status } = req.body;
            const device = await prisma.device.updateMany({
                where: { id, userId: req.userId },
                data: {
                    name,
                    deviceType,
                    os,
                    timezone,
                    status,
                },
            });
            return res.json({ message: 'Device updated successfully.' });
        }
        catch (error) {
            return res.status(500).json({ error: 'Failed to update device.' });
        }
    }
    static async deleteDevice(req, res) {
        try {
            const { id } = req.params;
            await prisma.device.deleteMany({
                where: { id, userId: req.userId },
            });
            return res.json({ message: 'Device deleted successfully.' });
        }
        catch (error) {
            return res.status(500).json({ error: 'Failed to delete device.' });
        }
    }
}
