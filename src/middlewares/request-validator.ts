import type { RequestHandler } from 'express';
import { validationResult } from 'express-validator';

const validate: RequestHandler = (req, res, next) => {
  if (req.headers.secret !== process.env.SECRET) {
    return res.status(401).json({
      error: 'Acesso negado',
    });
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

export default validate;
