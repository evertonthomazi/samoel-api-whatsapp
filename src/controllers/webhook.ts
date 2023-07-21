import axios from 'axios';
import { prisma } from '../shared';

const WEBHOOK_URL = `${process.env.WEBHOOK_URL}`;

const webhookLog = async (data: any) => {
  if(!data.payload.sessionId){
    return;
  }
  await prisma.webhook.create({
    data: {
      sessionId: data.payload.sessionId,
      dispatch_status: data.dispatch_status,
      payload: JSON.stringify(data.payload),
      response: data.response ? JSON.stringify(data.response) : null,
    },
  });
};
export const webhook = async (payload: any, send: boolean = true) => {
  type Webhook = {
    succes: boolean;
  };
  type GetWebhookResponse = {
    data: Webhook[];
  };



  if (!send) {
    await webhookLog({
      payload: payload,
      dispatch_status: 'NOT_SENT',
      response: '',
    });
    return;
  }

  if (payload.event == 'NEW_MESSAGE') {
    if (payload.message.type == 'protocol') {
      //console.log('PROTOCOL MESSAGE FOUND. WEBHOOK WILL NOT BE SENT');
      return;
    }
  }
  //console.log(`SENDING: ${JSON.stringify(payload)}`);
  if (!WEBHOOK_URL || WEBHOOK_URL.length == 0 || WEBHOOK_URL == 'undefined') {
    await webhookLog({
      payload: payload,
      dispatch_status: 'NOT_SENT',
      response: 'WEBHOOK NÃO DEFINIDO .env',
    });
    //console.log('WEBHOOK NÃO DEFINIDO .env');

    return;
  }
  //console.log(`TO ${WEBHOOK_URL}`);

  try {
    const { data } = await axios.post<GetWebhookResponse>(WEBHOOK_URL, {
      data: payload,
      headers: {
        Accept: 'application/json',
      },
    });
    await webhookLog({
      payload: payload,
      dispatch_status: 'SENT_SUCCESSFULLY',
      response: JSON.stringify(data),
    });
    //console.log('WEBHOOK RESPONSE', data);

    return data;
  } catch (e) {
    await webhookLog({
      payload: payload,
      dispatch_status: 'FAILED',
      response: JSON.stringify(e),
    });
    //console.log('WEBHOOK FAILED', e);
  }
};
