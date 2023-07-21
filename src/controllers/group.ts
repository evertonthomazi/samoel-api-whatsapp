import { serializePrisma } from '@kevineduardo/baileys-store';
import type { RequestHandler } from 'express';
import { logger, prisma } from '../shared';
import { getSession } from '../wa';
import { getJid } from './message';
import { makePhotoURLHandler } from './misc';

export const list: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const groups = (
      await prisma.message.groupBy({
        by: ['remoteJid'],
        where: { remoteJid: { endsWith: 'g.us' }, sessionId },
      })
    ).map((c) => serializePrisma(c));

    res.status(200).json({
      data: groups,
      totalRecords: groups.length,
    });
  } catch (e) {
    const message = 'An error occured during group list';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};

export const find: RequestHandler = async (req, res) => {
  try {
    const { sessionId, jid } = req.params;
    const session = getSession(sessionId)!;
    const data = await session.groupMetadata(jid);
    res.status(200).json(data);
  } catch (e) {
    const message = 'An error occured during group metadata fetch';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};

const getParticipantsJid = async (participants: [], sessionId: string) => {
  const normalized: string[] = [];
  for await (let participant of participants) {
    const jid: string = await getJid({ number: participant }, sessionId);
    normalized.push(jid);
  }
  return normalized;
};

export const create: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { subject } = req.body;
    const session = getSession(sessionId)!;
    const participants: any = await getParticipantsJid(req.body.participants, sessionId);

    const group = await session.groupCreate(subject, participants);
    res.status(200).json({ group });
  } catch (e) {
    const message = 'An error occured during group create';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};

export const addParticipants: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { jid } = req.body;
    const session = getSession(sessionId)!;
    const participants: any = await getParticipantsJid(req.body.participants, sessionId);
    const result = await session.groupParticipantsUpdate(jid, participants, 'add');
    res.status(200).json({ result });
  } catch (e) {
    const message = 'An error occured while adding participants to a group';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};

export const removeParticipants: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { jid } = req.body;
    const session = getSession(sessionId)!;
    const participants: any = await getParticipantsJid(req.body.participants, sessionId);
    const result = await session.groupParticipantsUpdate(jid, participants, 'remove');
    res.status(200).json({ result });
  } catch (e) {
    const message = 'An error occured while removing participants from a group';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};

export const updateSubject: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { jid, subject } = req.body;
    if (!subject || subject.length === 0) {
      return res.status(400).json({ error: 'A subject must be provided' });
    }
    const session = getSession(sessionId)!;

    const result = await session.groupUpdateSubject(jid, subject);

    res.status(200).json({ message: 'updated' });
  } catch (e) {
    const message = 'An error occured while updating group information';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};

export const updateDescription: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { jid, description } = req.body;
    if (!description || description.length === 0) {
      return res.status(400).json({ error: 'A description must be provided' });
    }
    const session = getSession(sessionId)!;

    const result = await session.groupUpdateDescription(jid, description);

    res.status(200).json({ message: 'updated' });
  } catch (e) {
    const message = 'An error occured while updating group information';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};

export const getInvite: RequestHandler = async (req, res) => {
  try {
    const { sessionId, jid } = req.params;
    const session = getSession(sessionId)!;
    const link = await session.groupInviteCode(jid);
    return res.status(200).json({ link: `https://chat.whatsapp.com/${link}` });
  } catch (e) {
    const message = 'An error occured while fetching group invite';
    logger.error(e, message);
    res.status(500).json({ error: message });
  }
};

export const photo = makePhotoURLHandler('group');
