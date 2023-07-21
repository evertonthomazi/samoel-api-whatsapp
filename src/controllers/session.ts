import type { RequestHandler } from 'express';
import {
  createSession,
  deleteSession,
  getSession,
  getSessionStatus,
  listSessions,
  sessionExists,
} from '../wa';

import axios from 'axios';

export const list: RequestHandler = (req, res) => {
  res.status(200).json(listSessions());
};

export const find: RequestHandler = (req, res) =>
  res.status(200).json({ message: 'Session found' });

export const status: RequestHandler = async (req, res) => {
  const session = getSession(req.params.sessionId)!;
  const status = getSessionStatus(session);
  const jid = `${session.user?.id}`;
  let picture = null;
  if (status == 'AUTHENTICATED') {
    try {
      picture = await session.profilePictureUrl(jid, 'image');
    } catch (e) {
      picture = null;
    }
  }
  res.status(200).json({
    status: status ? status : 'AWAITING_SCAN',
    me: {
      name: status == 'AUTHENTICATED' ? session.user?.name : false,
      jid: status == 'AUTHENTICATED' ? jid : false,
      picture: picture,
    },
  });
};

export const add: RequestHandler = async (req, res) => {
  const { sessionId, readIncomingMessages, ...socketConfig } = req.body;

  if (sessionExists(sessionId)) return res.status(400).json({ error: 'Session already exists' });
  createSession({ sessionId, res, readIncomingMessages, socketConfig });
};

export const addSSE: RequestHandler = async (req, res) => {
  const { sessionId } = req.params;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  if (sessionExists(sessionId)) {
    res.write(`data: ${JSON.stringify({ error: 'Session already exists' })}\n\n`);
    res.end();
    return;
  }
  createSession({ sessionId, res, SSE: true });
};

export const del: RequestHandler = async (req, res) => {
  await deleteSession(req.params.sessionId);
  res.status(200).json({ message: 'Session deleted' });
};

const createSessionHttp = async (sessionId: string) => {
  type createSessionHttpResult = {
    data: [];
  };
  const URL = `http://${process.env.HOST}:${process.env.PORT}/sessions/add`;
  try {
    const { data } = await axios.request<createSessionHttpResult>({
      method: 'post',
      url: URL,
      maxBodyLength: Infinity,
      headers: {
        secret: `${process.env.SECRET}`,
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({ sessionId }),
    });
    return { error: false };
  } catch (e) {
    return { error: true };
  }
};

export const code: RequestHandler = async (req, res) => {
  try {
    const { sessionId, phone } = req.body;
    if (sessionExists(sessionId)) return res.status(400).json({ error: 'Session already exists' });

    const { error } = await createSessionHttp(sessionId);

    if (error) {
      return res.status(500).json({ error: 'An error occured during code request' });
    }

    const session = getSession(sessionId)!;
    const code = await session.requestPairingCode(phone);
    return res.status(200).json({ code });
  } catch (e) {
    const message = 'An error occured during code request';

    res.status(500).json({ error: message });
  }
};
