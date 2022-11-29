const { default: WASocket, fetchLatestBaileysVersion, useMultiFileAuthState, DisconnectReason } = require('@adiwajshing/baileys')
const { Utility } = require('@libs/utils/utility')
const logger = require('@libs/utils/logger')
const { messageHandler } = require('@libs/handlers')
const { Boom } = require('@hapi/boom')
const { existsSync } = require('fs')
const store = require('@store')
const Pino = require('pino')
const knex = require('@database/connection')
const qrcode = require('qrcode')

existsSync('store/jadibot.json') && store.readFromFile('store/jadibot.json')
setInterval(() => {
    store.writeToFile('store/jadibot.json')
}, 60_000)

const utility = new Utility()

const jadibot = async (msg) => {
    const connect = async () => {
        const { state, saveCreds } = await useMultiFileAuthState(`session/${msg.senderNumber}-session`)
        const { version, isLatest } = await fetchLatestBaileysVersion()

        const client = WASocket({
            printQRInTerminal: true,
            auth: state,
            logger: Pino({ level: 'silent' }),
            browser: ['shanndev', 'Safari', '1.0'],
            version,
        })

        store.bind(client.ev)

        client.ev.on('chats.set', () => {
            msg.reply(`Got ${store.chats.all().length} chats`)
        })

        client.ev.on('contacts.set', () => {
            msg.reply(`Got ${Object.values(store.contacts).length} contacts`)
        })

        client.ev.on('creds.update', saveCreds)
        client.ev.on('connection.update', async (up) => {
            const { lastDisconnect, connection, qr } = up

            if (qr) {
                msg.replyImage(await qrcode.toDataURL(qr, { scale: 8 }), 'Please scanning QR Code to connect')
            }

            if (connection) {
                msg.reply(`Connection Status: ${connection}`)
            }

            if (connection === 'close') {
                let reason = new Boom(lastDisconnect.error).output.statusCode
                if (reason === DisconnectReason.badSession) {
                    msg.reply(`Bad Session File, Please Delete ./session/${msg.senderNumber}-session and Scan Again`)
                    client.logout()
                } else if (reason === DisconnectReason.connectionClosed) {
                    msg.reply('Connection closed, reconnecting....')
                    connect()
                } else if (reason === DisconnectReason.connectionLost) {
                    msg.reply('Connection Lost from Server, reconnecting...')
                    connect()
                } else if (reason === DisconnectReason.connectionReplaced) {
                    msg.reply('Connection Replaced, Another New Session Opened, Please Close Current Session First')
                    client.logout()
                } else if (reason === DisconnectReason.loggedOut) {
                    msg.reply(`Device Logged Out, Please Delete ./session/${msg.senderNumber}-session and Scan Again.`)
                    client.logout()
                } else if (reason === DisconnectReason.restartRequired) {
                    msg.reply('Restart Required, Restarting...')
                    connect()
                } else if (reason === DisconnectReason.timedOut) {
                    msg.reply('Connection TimedOut, Reconnecting...')
                    connect()
                } else {
                    client.end(new Error(`Unknown DisconnectReason: ${reason}|${lastDisconnect.error}`))
                }
            }
        })

        // messages.upsert
        client.ev.on('messages.upsert', ({ messages, type }) => {
            if (type !== 'notify') return
            messageHandler(client, { messages, type })
        })

        client.ev.on('group-participants.update', async (anu) => {
            try {
                let participants = anu.participants
                let dbWelcome = await knex('welcome').where({ group_id: anu.id }).first()
                if (!dbWelcome) await knex('welcome').insert({ group_id: anu.id })

                let dbLeave = await knex('leave').where({ group_id: anu.id }).first()
                if (!dbLeave) await knex('leave').insert({ group_id: anu.id })

                for (let num of participants) {
                    try {
                        ppuser = await client.profilePictureUrl(num, 'image')
                    } catch {
                        ppuser = 'https://i.ibb.co/yVhzrjj/20221029-131404.jpg'
                    }

                    // Get Profile Picture Group
                    try {
                        ppgroup = await client.profilePictureUrl(anu.id, 'image')
                    } catch {
                        ppgroup = 'https://i.ibb.co/yVhzrjj/20221029-131404.jpg'
                    }

                    if (anu.action == 'add') {
                        if (dbWelcome.type === 'text' && dbWelcome.status === 1) {
                            client.sendMessage(anu.id, { text: dbWelcome.message.format({ user: '@' + num.split('@')[0] }), mentions: [num] })
                        } else if (dbWelcome.type === 'image' && dbWelcome.status === 1) {
                            client.sendMessage(anu.id, { image: { url: dbWelcome.media }, caption: dbWelcome.message.format({ user: '@' + num.split('@')[0] }), mentions: [num] })
                        } else if (dbWelcome.type === 'video' && dbWelcome.status === 1) {
                            client.sendMessage(anu.id, { video: { url: dbWelcome.media }, caption: dbWelcome.message.format({ user: '@' + num.split('@')[0] }), mentions: [num] })
                        } else if (dbWelcome.type === 'ppuser' && dbWelcome.status === 1) {
                            client.sendMessage(anu.id, { image: { url: ppuser }, caption: dbWelcome.message.format({ user: '@' + num.split('@')[0] }), mentions: [num] })
                        } else if (dbWelcome.type === 'ppgrup' && dbWelcome.status === 1) {
                            client.sendMessage(anu.id, { image: { url: ppgroup }, caption: dbWelcome.message.format({ user: '@' + num.split('@')[0] }), mentions: [num] })
                        }
                    } else if (anu.action == 'remove') {
                        if (dbLeave.type === 'text' && dbLeave.status === 1) {
                            client.sendMessage(anu.id, { text: dbLeave.message.format({ user: '@' + num.split('@')[0] }), mentions: [num] })
                        } else if (dbLeave.type === 'image' && dbLeave.status === 1) {
                            client.sendMessage(anu.id, { image: { url: dbLeave.media }, caption: dbLeave.message.format({ user: '@' + num.split('@')[0] }), mentions: [num] })
                        } else if (dbLeave.type === 'video' && dbLeave.status === 1) {
                            client.sendMessage(anu.id, { video: { url: dbLeave.media }, caption: dbLeave.message.format({ user: '@' + num.split('@')[0] }), mentions: [num] })
                        } else if (dbLeave.type === 'ppuser' && dbLeave.status === 1) {
                            client.sendMessage(anu.id, { image: { url: ppuser }, caption: dbLeave.message.format({ user: '@' + num.split('@')[0] }), mentions: [num] })
                        } else if (dbLeave.type === 'ppgrup' && dbLeave.status === 1) {
                            client.sendMessage(anu.id, { image: { url: ppgroup }, caption: dbLeave.message.format({ user: '@' + num.split('@')[0] }), mentions: [num] })
                        }
                    }
                }
            } catch (err) {
                msg.reply(err)
            }
        })
    }

    connect()
}

module.exports = { jadibot }