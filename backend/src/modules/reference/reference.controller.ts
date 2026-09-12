import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export async function getItemsHandler(req: Request, res: Response): Promise<void> {
  try {
    const items = await prisma.item.findMany({
      include: { category: true },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, data: { items } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

export async function getLocationsHandler(req: Request, res: Response): Promise<void> {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, data: { locations } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

export async function getCategoriesHandler(req: Request, res: Response): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, data: { categories } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

export async function getUsersHandler(req: Request, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'OPERATIONS'] }
      },
      select: {
        id: true,
        name: true,
        role: true,
        email: true
      },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, data: { users } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}
