const { ICommand } = require("@jadibot/libs/builders/command")
const { TelegraPh } = require('@jadibot/libs/converter/upload')
const fs = require('fs')

/**
 * @type { ICommand }
 */
module.exports = {
    aliases: ['removebackground'],
    category: 'Convert',
    description: 'Remove Background',
    premiumOnly: true,
    waitMessage: true,
    callback: async ({ msg, client, message, shannMe }) => {
        const config = require(`@jadibot/config-${shannMe}.json`)

        const image = (await msg.download('buffer')) || (msg.quoted && (await msg.quoted.download('buffer')))
        if (msg.typeCheck.isImage || msg.typeCheck.isQuotedImage) {
            await fs.writeFileSync('database/src/shanndev.jpg', image)
            let file = await TelegraPh('database/src/shanndev.jpg')
            client.sendMessage(msg.from, { document: { url: `https://api.lolhuman.xyz/api/removebg?apikey=${config.apikey}&img=${file}` }, mimetype: 'image/png', fileName: 'Removebg.png' }, { quoted: message }).catch(() => { return msg.reply('Terjadi kesalahan') })
            fs.unlinkSync('database/src/shanndev.jpg')
        } else return msg.reply('Send/reply image dengan caption #removebg')
    }
}