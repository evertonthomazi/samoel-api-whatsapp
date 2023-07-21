import type { RequestHandler } from 'express';
import { logger } from '../shared';
import { getSession } from '../wa';
import { addExtraNine, numberIsBrazillian, urlToBuffer } from './common';
import { makePhotoURLHandler } from './misc';
import { getJid } from './message';

export const picture: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const jid: any = await getJid(req.params, sessionId);
    if (!jid) {
      return res.status(400).json({
        error: "Unable to fetch number's jid",
      });
    }
    const session = getSession(sessionId)!;
    let picture = null;
    try {
      picture = await session.profilePictureUrl(jid, 'image');
    } catch (e) {}
    res.status(200).json({ picture });
  } catch (e) {
    const message = 'An error occured while looking for profile picture';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};

export const updateProfilePicture: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { jid, url } = req.body;

    const session = getSession(sessionId)!;
    try {
      const buffer = await urlToBuffer(url);
      const result = await session.updateProfilePicture(jid, buffer); // com erro, verificar o type content;
      return res.status(200).json({ message: 'updated' });
    } catch (e) {
      return res
        .status(500)
        .json({ error: "We're were unable to update the profile picture now. Try again later!" });
    }
  } catch (e) {
    console.log(e);
    const message = 'An error occured while updating profile picture';
    logger.error(e, message);
    return res.status(500).json({ error: message });
  }
};

export const getOfficialJid: RequestHandler = async (req, res) => {
  try {
    const { sessionId, number } = req.params;

    const session = getSession(sessionId)!;

    let contact = await session.onWhatsApp(number);

    if (!contact[0] && numberIsBrazillian(number) && number.length === 12) {
      const numberWithExtraNine = addExtraNine(number);
      contact = await session.onWhatsApp(numberWithExtraNine);
    }

    const result = {
      exists: contact[0] ? contact[0]?.exists : false,
      jid: contact[0] ? contact[0]?.jid : null,
    };

    return res.status(200).json(result);
  } catch (e) {
    console.log(e);
    const message = 'An error occured while fetching number information';
    logger.error(e, message);
    return res.status(500).json({ error: message });
  }
};

export const photo = makePhotoURLHandler();
