import { downloadMediaMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import { writeFile } from 'fs/promises';
import { get } from 'https';
import { logger } from '../shared';

const getFileExtension = (mimetype: any, fileName: any = false) => {
  if (fileName) {
    return fileName.split('.')[fileName.split('.').length - 1];
  } else {
    return mimetype.split('/')[1].replaceAll(' ', '').replace(';', '').replace('codecs=opus', '');
  }
};

const handleDownload = async (message: any, session: any) => {
  const buffer = await downloadMediaMessage(
    message,
    'buffer',
    {},
    {
      logger,
      reuploadRequest: session.updateMediaMessage,
    }
  );
  return buffer;
};

const getFileName = (message: any) => {
  if (message.message.documentWithCaptionMessage) {
    return message.message.documentWithCaptionMessage.message.documentMessage.fileName;
  } else if (message.message.documentMessage) {
    return message.message.documentMessage.fileName;
  }
  return false;
};

const getProperFolder = (message: any) => {
  const messageType = Object.keys(message.message)[0];
  if (message.message.documentWithCaptionMessage) {
    return 'document';
  } else {
    return messageType.replace('Message', '');
  }
};

const handleLocalFileSave = async (message: any, session: any, sessionId: any) => {
  const messageType = Object.keys(message.message)[0];
  const fileName = getFileName(message);
  const extension = getFileExtension(message.message[messageType].mimetype, fileName);
  const folder = getProperFolder(message);
  const filename = message.key.id + '.' + extension;

  if (fs.existsSync(`./media/${folder}/${filename}`)) {
    return `${process.env.STATIC_URL}/${folder}/${filename}?sessionId=${sessionId}&messageId=${message.key.id}`;
  }

  const buffer = await handleDownload(message, session);
  await writeFile(`./media/${folder}/${filename}`, buffer);

  return `${process.env.STATIC_URL}/${folder}/${filename}?sessionId=${sessionId}&messageId=${message.key.id}`;
};

const getMessageType = (message: any) => {
  const messageType = Object.keys(message.message)[0];
  if (
    message.message.extendedTextMessage ||
    message.message.conversation ||
    message.message.editedMessage
  ) {
    return 'text';
  } else if (message.message.pollUpdateMessage) {
    return 'poll';
  } else if (message.message.liveLocationMessage) {
    return 'location';
  } else {
    return messageType.replace('Message', '');
  }
};

const getMediaCaption = (message: any) => {
  const type: any = getMessageType(message);
  const messageType = Object.keys(message.message)[0];

  if (message.message.documentWithCaptionMessage) {
    return message.message.documentWithCaptionMessage?.message?.documentMessage?.caption?.length > 0
      ? message.message.documentWithCaptionMessage?.message?.documentMessage?.caption
      : false;
  } else {
    return ['image', 'video', 'document'].includes(type)
      ? message.message[messageType]?.caption?.length > 0
        ? message.message[messageType].caption
        : false
      : false;
  }
};

const getMessageText = (message: any) => {
  const type = getMessageType(message);
  if (type == 'text') {
    if (message.message.conversation) {
      return message.message.conversation;
    }
    if (message.message.extendedTextMessage) {
      return message.message.extendedTextMessage.text;
    }
    if (message.message.editedMessage) {
      return message.message.editedMessage.message.protocolMessage.editedMessage.conversation;
    }
  } else if (type == 'poll') {
    return 'Não é possível exibir essa mensagem neste aparelho. Abra o WhatsApp no seu celular para ver a mensagem.';
  }
  return false;
};

const shouldDownload = (message: any) => {
  const type: any = getMessageType(message);
  return ['audio', 'video', 'document', 'image', 'sticker'].includes(type);
};

const getMessageId = (message: any) => {
  if (message.message.editedMessage) {
    return message.message.editedMessage.message.protocolMessage.key.id;
  }
  return message.key.id;
};

const getWhetherOrNotMessageIsAnUpdate = (message: any) => {
  if (message.message.editedMessage) {
    return true;
  }
  return false;
};

const getMessageThatsBeenUpdated = (message: any) => {
  if (message.message.editedMessage) {
    return message.message.editedMessage.message;
  }
  return false;
};

const getPhoneFromVCard = (vcard: string) => {
  let contact = vcard.split('waid=');
  if (contact.length === 0) {
    return 'Não foi possível ler o número da mensagem';
  }
  contact = contact[1].split(':');
  return contact[0];
};

const getMessageContact = (message: any) => {
  const type = getMessageType(message);
  if (type !== 'contact') {
    return false;
  }

  return {
    name: message.message?.contactMessage?.displayName,
    phone: getPhoneFromVCard(message.message?.contactMessage?.vcard),
  };
};

const getLocationCoords = (message: any) => {
  const type = getMessageType(message);
  if (type !== 'location') {
    return false;
  }

  if (message.message.liveLocationMessage) {
    return {
      degreesLatitude: message.message?.liveLocationMessage?.degreesLatitude,
      degreesLongitude: message.message?.liveLocationMessage?.degreesLongitude,
    };
  }

  return {
    degreesLatitude: message.message?.locationMessage?.degreesLatitude,
    degreesLongitude: message.message?.locationMessage?.degreesLongitude,
  };
};

const getMyProperJid = (jid: string) => {
  if (!jid) {
    return '';
  }
  return jid.split(':')[0] + '@s.whatsapp.net';
};

const getParticipantWhoSentTheMessage = (message: any) => {
  if(!message.key.participant){
    return false;
  }
  return {
    number: getNumberWithoutJid(message.key.participant),
    jid: message.key.participant
  }
};

const getNumberWithoutJid = (jid: string) => {
  return jid.includes('@g.us') ? false :  jid.replace('@s.whatsapp.net', '');
};
export const getWebhookPayload = async (
  message: any,
  session: any,
  sessionId: any,
  isWebhook: boolean = true
) => {
  if (!message.message) {
    return false;
  }
  const type = getMessageType(message);
  if (!type) return false;

  const downloadedFile = shouldDownload(message)
    ? await handleLocalFileSave(message, session, sessionId)
    : false;
  const fileName = getFileName(message);

  const payload = {
    event: 'NEW_MESSAGE',
    sessionId: sessionId,
    message: {
      type: type,
      id: getMessageId(message),
      isUpdate: getWhetherOrNotMessageIsAnUpdate(message),
      messageThatsBeenUpdated: getMessageThatsBeenUpdated(message),
      fromGroup: message.key.remoteJid.includes('@g.us'),
      fromMe: message.key.fromMe,
      from: (message.key.fromMe && !message.key.remoteJid.includes('@g.us')) ? getMyProperJid(session.user?.id) : message.key.remoteJid,
      fromNumber: (message.key.fromMe && !message.key.remoteJid.includes('@g.us')) ? getNumberWithoutJid(getMyProperJid(session.user?.id)) : (message.key.remoteJid.includes('@g.us') ? false : getNumberWithoutJid(message.key.remoteJid)),
      participant: getParticipantWhoSentTheMessage(message),
      pushName: message.pushName,
      timestamp: message.messageTimestamp,
      text: getMessageText(message),
      url: downloadedFile,
      contact: getMessageContact(message),
      location: getLocationCoords(message),
      caption: getMediaCaption(message),
      fileName: fileName,
      raw: message,
    },
  };
  //console.log(payload);
  return payload;
};

export const urlToBuffer = (url: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const data: Uint8Array[] = [];
    get(url, (res) => {
      res
        .on('data', (chunk: Uint8Array) => {
          data.push(chunk);
        })
        .on('end', () => {
          resolve(Buffer.concat(data));
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  });
};

export const numberIsBrazillian = (number: string) => {
  return number.substring(0, 2) === '55';
};

export const addExtraNine = (number: string) => {
  const ddi = number.substr(0, 2);
  const ddd = number.substr(2, 2);
  const first_part = number.substr(4, 4);
  const last_part = number.substr(8, 4);
  if (number.length === 12) {
    return ddi + ddd + '9' + first_part + last_part;
  }
  return number;
};

export const getContactString = async (session: any, number: any) => {
  const contact = await session.onWhatsApp(number);
  if (contact[0]) {
    return `waid=${contact[0].jid.replace('@s.whatsapp.net', '')}:${contact[0].jid.replace(
      '@s.whatsapp.net',
      ''
    )}`;
  }
  return `waid=${number}:${number}`;
};

export const getVcard = async (session: any, message: any) => {
  const contactString = await getContactString(session, message.contact.number);
  const vcard =
    'BEGIN:VCARD\n' +
    'VERSION:3.0\n' +
    `FN:${message.contact.name}\n` +
    'ORG:;\n' +
    `TEL;type=CELL;type=VOICE;${contactString}\n` +
    'END:VCARD';

  return vcard;
};

export const messageOptionsAreValid = (message: any) => {
  return !(message.options.length < 2 || message.options.length > 10);
};

export const parseOptionsAsText = (title: string, options: string[]) => {
  const emojis = [`0️⃣`, `1️⃣`, `2️⃣`, `3️⃣`, `4️⃣`, `5️⃣`, `6️⃣`, `7️⃣`, `8️⃣`, `9️⃣`, `🔟`];

  let text = '';

  text += `*${title.toUpperCase()}*\n\n`;
  options.map((option: string, i: number) => {
    text += emojis[i + 1] + ` ${option} \n`;
  });
  if (options.length === 2) {
    text += '\n' + `_responda *1 ou 2* para selecionar a opção desejada_`;
  } else {
    text +=
      '\n' + `_responda um número entre *1 e ${options.length}* para selecionar a opção desejada_`;
  }

  return text;
};

export const str_replace = (shouldReplace: any, replaceBy: string, string: string) => {
  if (typeof shouldReplace == 'object') {
      shouldReplace = Object.values(shouldReplace);
  } else if (typeof shouldReplace == 'string') {
      shouldReplace = [shouldReplace];
  }

  shouldReplace.map((value: string) => {
      string = string.replaceAll(value, replaceBy);
  });

  return string;
};
