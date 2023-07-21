import { Router } from 'express';
import * as controller from '../controllers/profile';
import sessionValidator from '../middlewares/session-validator';

const router = Router({ mergeParams: true });


router.get('/:number/picture', sessionValidator, controller.picture);
router.get('/:number', sessionValidator, controller.getOfficialJid);
router.put('/picture', sessionValidator, controller.updateProfilePicture);

export default router;
