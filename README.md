Implementação da [@whiskeysockets/baileys](https://github.com/whiskeysockets/baileys) na forma de API REST


# Funcionalidades:
- Conectar multiplas instâncias
- Enviar texto
- Editar texto
- Deletar texto
- Enviar Imagem
- Enviar áudio
- Enviar vídeo
- Enviar documentos

# Requisitos

- Nodejs versão 18 ou maior
- Servidor MySql e um banco de dados

# Setup

- Copie o `.env.example` e renomeie-o para .env
- Edite a string de conexão do mysql dentro do .env
- Rode as migrations com o comando `npx prisma db push` ou `npx prisma migrate`

# Instalação

- yarn install
- yarn build
mkdir media/audio
mkdir media/document
mkdir media/image
mkdir media/video
mkdir media/sticker


# Configurações do `.env`
 
HOST="localhost"
PORT="3000"

//URl de conexão com o mysql
DATABASE_URL="mysql://root:12345@localhost:3306/baileys"

//Intervalo utilizado para reconexões com o WhatsApp
RECONNECT_INTERVAL="5000"

// Número máximo de tentativas de reconexões
MAX_RECONNECT_RETRIES="5"

//Existe um endpoint que envia o QR para o frontend através de Server Sent Events. Esse é o número máximo de QrCodes enviados
SSE_MAX_QR_GENERATION="10"

LOG_LEVEL="warn"

//Secret usado para autenticação das requisições
SECRET="$2a$12$123132uN7Mf0FsXW2mR8Wsaojdhasd0gTO134CQ54AmeCR.ml3wgc9guPSyKtHMgC"

//Link para envio dos eventos recebidos pela api
WEBHOOK_URL="http://127.0.0.1:3005/events"

//link dos arquivos estáticos recebidos e convertidos pela api
STATIC_URL="http://localhost:3000/static"

//delay máximo que a api fica "digitando..." ou "gravando áudio..."
MAX_DELAY=14
