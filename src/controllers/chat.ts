import { serializePrisma } from '@kevineduardo/baileys-store';
import type { RequestHandler } from 'express';
import { logger, prisma } from '../shared';
import { getWebhookPayload } from './common';
import { getSession } from '../wa';

export const list: RequestHandler = async (req, res) => {

  try {
    const { sessionId } = req.params;
  
    const chats = (
      await prisma.message.groupBy({
        by: ['remoteJid'],
        where: { sessionId },
      })
    ).map((c) => serializePrisma(c));

    res.status(200).json({
      data: chats,
      totalRecords: chats.length,
    });
  } catch (e) {
    const message = 'An error occured during chat list';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};

export const find: RequestHandler = async (req, res) => {
  const take: number = process.env.PAGINATION_LIMIT ? Number(process.env.PAGINATION_LIMIT) : 25;
  let skip: number = 0;
  try {
    const { sessionId, jid } = req.params;
    const { page = 1 } = req.query;
    skip = take * Number(page) - take;
    const total = await prisma.message.count({
      where: { sessionId, remoteJid: jid },
    });
    const totalPages = Math.ceil(total / take);
    const messages = (
      await prisma.message.findMany({
        skip: skip,
        take: take,
        where: { sessionId, remoteJid: jid },
        orderBy: { messageTimestamp: 'desc' },
      })
    ).map((m) => serializePrisma(m));
   
    const serialized: any = [];
    const session = getSession(sessionId)!;

    for await (let message of messages) {
      const protoMessage = message;
      const serializedMessage = await getWebhookPayload(protoMessage, session, sessionId);
      serialized.push(serializedMessage);
    }

    res.status(200).json({
      data: serialized,
      records: messages.length,
      totalRecords: total,
      hasNextPage: Number(page) < totalPages,
      hasPreviousPage: Number(page) > 1,
      page: Number(page),
      totalPages: totalPages,
    });
  } catch (e) {
    const message = 'An error occured during chat find';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};
