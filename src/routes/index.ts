import { Router } from 'express';
import chatRoutes from './chats';
import contactRoutes from './contacts';
import groupRoutes from './groups';
import messageRoutes from './messages';
import sessionRoutes from './sessions';
import profileRoutes from './profile';

const router = Router();
router.use('/sessions', sessionRoutes);
router.use('/:sessionId/chats', chatRoutes);
router.use('/:sessionId/contacts', contactRoutes);
router.use('/:sessionId/groups', groupRoutes);
router.use('/:sessionId/messages', messageRoutes);
router.use('/:sessionId/profile', profileRoutes);

export default router;
