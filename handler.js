
/**
 * handler.js
 * Carga plugins y enruta mensajes entrantes.
 */
const fs = require('fs')
const path = require('path')
const settings = require('./settings')
const db = require('./src/utils/db')

let plugins = {}

function loadPlugins() {
  const pluginsDir = path.join(__dirname, 'src', 'plugins')
  const categories = fs.readdirSync(pluginsDir, { withFileTypes: true })
  categories.forEach(cat => {
    const catPath = path.join(pluginsDir, cat.name)
    if (!cat.isDirectory()) return
    const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'))
    files.forEach(f => {
      try {
        const mod = require(path.join(catPath, f))
        const key = (mod.name || f.replace('.js','')).toLowerCase()
        plugins[key] = mod
      } catch (e) {
        console.error('Error cargando plugin', f, e.message)
      }
    })
  })
  console.log('🔌 Plugins cargados:', Object.keys(plugins).length)
}

function init({ sock, settings: s }) {
  loadPlugins()
  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages[0]
      if (!msg.message) return
      if (msg.key && msg.key.fromMe) return
      // get text
      const text = (msg.message.conversation || msg.message.extendedTextMessage && msg.message.extendedTextMessage.text || '').trim()
      if (!text) return
      const prefix = s.prefix || '!'
      if (!text.startsWith(prefix)) return
      const args = text.slice(prefix.length).split(/ +/)
      const cmd = args.shift().toLowerCase()
      // find plugin by command
      for (const k in plugins) {
        const p = plugins[k]
        if (p.commands && p.commands.includes(cmd)) {
          await p.exec({ send: async (payload) => await sock.sendMessage(msg.key.remoteJid, payload), context: msg, args, settings: s })
          return
        }
      }
      // not found
      await sock.sendMessage(msg.key.remoteJid, { text: '❓ Comando no encontrado. Escribe !help' })
    } catch (e) {
      console.error('Error en handler:', e)
    }
  })
}

module.exports = { init }
