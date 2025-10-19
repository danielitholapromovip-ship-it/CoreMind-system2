
const { default: makeWASocket, useSingleFileAuthState, fetchLatestBaileysVersion } = require('@adiwajshing/baileys')
const qrcode = require('qrcode-terminal')
const pino = require('pino')
const fs = require('fs')
const path = require('path')
const settings = require('./settings')

const authFile = path.join(settings.sessionPath, 'auth_info.json')
if (!fs.existsSync(settings.sessionPath)) fs.mkdirSync(settings.sessionPath, { recursive: true })
const { state, saveState } = useSingleFileAuthState(authFile)

async function start() {
  const { version } = await fetchLatestBaileysVersion()
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' })
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) qrcode.generate(qr, { small: true })
    if (connection === 'open') console.log('✅ Conectado como', sock.user && sock.user.id)
    if (connection === 'close') {
      console.log('⚠️ Conexión cerrada, intentando reconectar...')
    }
  })

  sock.ev.on('creds.update', saveState)

  // load handler
  const handler = require('./handler')
  handler.init({ sock, settings })
}

start().catch(e => console.error(e))
