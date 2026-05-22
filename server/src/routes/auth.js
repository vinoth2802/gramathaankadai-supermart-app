import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../db.js';

const router = Router();

/* POST /api/auth/login */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.appUser.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await prisma.appUser.update({
      where: { id: user.id },
      data:  { lastLogin: new Date() },
    });

    res.json({
      id:       user.id,
      name:     user.name,
      email:    user.email,
      role:     user.role.name,
      roleId:   user.roleId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
