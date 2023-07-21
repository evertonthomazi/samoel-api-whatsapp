import { serializePrisma } from '@kevineduardo/baileys-store';
import type { proto, WAGenericMediaMessage, WAMessage } from '@whiskeysockets/baileys';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import type { RequestHandler } from 'express';
import { logger, prisma } from '../shared';
import { delay as delayMs } from '../utils';
import { getSession, jidExists, sendPresenceUpdate } from '../wa';
import {
  addExtraNine,
  getVcard,
  messageOptionsAreValid,
  numberIsBrazillian,
  parseOptionsAsText,
  str_replace,
} from './common';

export const list: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { cursor = undefined, limit = 25 } = req.query;
    const messages = (
      await prisma.message.findMany({
        cursor: cursor ? { pkId: Number(cursor) } : undefined,
        take: Number(limit),
        skip: cursor ? 1 : 0,
        where: { sessionId },
      })
    ).map((m) => serializePrisma(m));

    res.status(200).json({
      data: messages,
      cursor:
        messages.length !== 0 && messages.length === Number(limit)
          ? messages[messages.length - 1].pkId
          : null,
    });
  } catch (e) {
    const message = 'An error occured during message list';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};

const messageExists = async (jid: any, id: any, sessionId: any) => {
  const messages = (
    await prisma.message.findMany({
      take: Number(1),
      where: {
        sessionId,
        remoteJid: jid,
        id: id,
      },
    })
  ).map((m) => serializePrisma(m));

  return messages;
};

export const deleteMessage: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, type = 'number' } = req.body;
    const jid: any = await getJid(req.body, sessionId);
    if (!jid) {
      return res.status(400).json({
        error: "Unable to fetch number's jid",
      });
    }
    const session = getSession(sessionId)!;

    const hasSentMessage = await messageExists(
      jid,
      req.body.message.id,
      sessionId
    );
    if (hasSentMessage.length == 0) {
      return res.status(400).json({
        error: `There is no message sent to ${req.body.jid} with id ${req.body.message.id}`,
      });
    }

    const result = await session.sendMessage(jid, {
      delete: {
        remoteJid: jid,
        fromMe: true,
        id: message.id,
      },
    });

    res.status(200).json({
      message: result,
    });
  } catch (e) {
    const message = 'An error occured during message update';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};

export const update: RequestHandler = async (req, res) => {
  try {
    const { message, type = 'number' } = req.body;
    const { sessionId } = req.params;
    const jid: any = await getJid(req.body, sessionId);
    if (!jid) {
      return res.status(400).json({
        error: "Unable to fetch number's jid",
      });
    }
    const session = getSession(sessionId)!;

    const hasSentMessage = await messageExists(jid, req.body.message.id, sessionId);
    if (hasSentMessage.length == 0) {
      return res.status(400).json({
        error: `There is no message sent to ${req.body.jid} with id ${req.body.message.id}`,
      });
    }

    if (req.body.delay) {
      await sendPresenceUpdate(message, jid, req.body.delay, session);
    }

    const result = await session.sendMessage(jid, {
      text: message.text,
      edit: {
        remoteJid: jid,
        fromMe: true,
        id: message.id,
      },
    });

    res.status(200).json({
      message: result,
    });
  } catch (e) {
    const message = 'An error occured during message update';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};

const getJidFromStorage = async (number: string) => {
  try {
    const jid = await prisma.jidWhiteList.findFirst({
      where: { number: number },
    });
    return jid ? jid.jid : false;
  } catch (e) {
    console.log(e);
    return false;
  }
};

const storeJid = async (number: string, jid: string) => {
  try {
    const stored = await prisma.jidWhiteList.create({
      data: { number, jid },
    });
    return stored;
  } catch (e) {
    return false;
  }
};

export const getJid = async (body: any, sessionId: string) => {
  if (body.jid) {
    return body.jid;
  }
  if (body.number) {
    body.number = str_replace(['(', ')', '-', ' ', '+'], '', body.number);
    const jidFromStorage = await getJidFromStorage(body.number);
    if (jidFromStorage) {
      return jidFromStorage;
    }
    const session = getSession(sessionId)!;
    let contact = await session.onWhatsApp(body.number);
    if (!contact[0] && numberIsBrazillian(body.number) && body.number.length === 12) {
      const numberWithExtraNine = addExtraNine(body.number);
      contact = await session.onWhatsApp(numberWithExtraNine);
    }
    if (!contact[0]) {
      return false;
    }
    await storeJid(body.number, contact[0].jid);
    return contact[0].jid;
  }
  return false;
};

export const send: RequestHandler = async (req, res) => {
  try {
    const { message, options, delay } = req.body;
    const { sessionId } = req.params;
    const session = getSession(sessionId)!;
    const jid: any = await getJid(req.body, sessionId);
    if (!jid) {
      return res.status(400).json({
        error: "Unable to fetch number's jid",
      });
    }

    if (message.audio) {
      message.ptt = true;
    }
    if (message.options) {
      if (!messageOptionsAreValid(message)) {
        return res.status(400).json({
          error: 'Options must be higher than one and lower or equal to ten',
        });
      }
      message.text = parseOptionsAsText(message.text, message.options);
    }

    if (message.contact) {
      const vcard = await getVcard(session, message);
      message.contacts = {
        displayName: message.contact.name,
        contacts: [{ vcard }],
      };
    }

    if (delay) {
      await sendPresenceUpdate(message, jid, delay, session);
    }

    const result = await session.sendMessage(jid, message, options);
    return res.status(200).json(result);
  } catch (e) {
    const message = 'An error occured during message send';
    logger.error(e, message);
    return res.status(500).json({ error: message });
  }
};

export const sendBulk: RequestHandler = async (req, res) => {
  const session = getSession(req.params.sessionId)!;
  const results: { index: number; result: proto.WebMessageInfo | undefined }[] = [];
  const errors: { index: number; error: string }[] = [];

  for (const [
    index,
    { jid, type = 'number', delay = 1000, message, options },
  ] of req.body.entries()) {
    try {
      const exists = await jidExists(session, jid, type);
      if (!exists) {
        errors.push({ index, error: 'JID does not exists' });
        continue;
      }

      if (index > 0) await delayMs(delay);
      const result = await session.sendMessage(jid, message, options);
      results.push({ index, result });
    } catch (e) {
      const message = 'An error occured during message send';
      logger.error(e, message);
      errors.push({ index, error: message });
    }
  }

  res
    .status(req.body.length !== 0 && errors.length === req.body.length ? 500 : 200)
    .json({ results, errors });
};

export const presence: RequestHandler = async (req, res) => {
  const { jid, presence } = req.body;
  const session = getSession(req.params.sessionId)!;
  if (!['composing', 'recording'].includes(presence)) {
    res.status(400).json({ error: 'Invalid presence' });
    return;
  }
  try {
    await session.sendPresenceUpdate(presence, jid);
  } catch (e) {
    res.status(500).json({
      error: 'Error while sending presence update',
    });
    return;
  }

  res.status(200).json({
    success: true,
  });
};

export const download: RequestHandler = async (req, res) => {
  try {
    const session = getSession(req.params.sessionId)!;
    const message = req.body as WAMessage;
    const type = Object.keys(message.message!)[0] as keyof proto.IMessage;
    const content = message.message![type] as WAGenericMediaMessage;
    const buffer = await downloadMediaMessage(
      message,
      'buffer',
      {},
      { logger, reuploadRequest: session.updateMediaMessage }
    );

    res.setHeader('Content-Type', content.mimetype!);
    res.write(buffer);
    res.end();
  } catch (e) {
    const message = 'An error occured during message media download';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};
