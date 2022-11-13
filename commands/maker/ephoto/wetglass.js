const { ICommand } = require('@libs/builders/command')
const x = require('mumaker')
const config = require("@config")

/**
 * @type { ICommand }
 */
module.exports = {
    category: 'Maker',
    description: 'Wetglass maker',
    waitMessage: true,
    minArgs: 1,
    expectedArgs: '<text>',
    example: '{prefix}{command} shannbot',
    callback: async ({ msg, fullArgs }) => {
        const url = `https://api.lolhuman.xyz/api/ephoto1/wetglass?apikey=${config.apikey}&text=${fullArgs}`

        msg.replyImage({ url }).catch(() => { return msg.reply('Terjadi kesalahan') })
    }
}