import { Router } from 'express';
import { query } from 'express-validator';
import * as controller from '../controllers/group';
import requestValidator from '../middlewares/request-validator';
import sessionValidator from '../middlewares/session-validator';

const router = Router({ mergeParams: true });
router.get(
  '/',
  query('cursor').isNumeric().optional(),
  query('limit').isNumeric().optional(),
  requestValidator,
  controller.list
);
router.get('/:jid', sessionValidator, controller.find);
router.get('/:jid/invite', sessionValidator, controller.getInvite);
router.get('/:jid/photo', sessionValidator, controller.photo);
router.post('/', sessionValidator, controller.create);
router.put('/subject', sessionValidator, controller.updateSubject);
router.put('/description', sessionValidator, controller.updateDescription);
router.post('/participants', sessionValidator, controller.addParticipants);
router.delete('/participants', sessionValidator, controller.removeParticipants);

export default router;
