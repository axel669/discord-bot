"use strict";
var nullref0;
const fs = require("fs");
const path = require("path");
const Discord = require("discord.js");
const ytdl = require("ytdl-core");
const fetch = require("node-fetch");
const update = require("@axel669/immutable-update");
const pi = require("./pi.js");
const express = require("express");
const newLine = String.fromCharCode(10);
const secretKey = process.env.sick_beats_settings_key;
const settingsID = process.env.sick_beats_settings_id;
const botToken = process.env.discord_bot_token;
const saveSetings = (settings) =>
    fetch(`https://api.jsonbin.io/b/${settingsID}`, {
        method: "PUT",
        body: JSON.stringify(settings),
        headers: {
            "Content-Type": "application/json",
            "secret-key": secretKey
        }
    });
const commandText = {
    turkey: fs.readFileSync("./command-text/turkey.txt")
};
const conditional = (condition) => (func) => (...args) => {
    if (condition(...args) === true) {
        func(...args);
    }
};
update.actions.$popFront = ([head, ...tail]) => tail;
const Settings = (data) => {
    let current = data;
    return {
        get value() {
            return current;
        },
        update: (action, value) => {
            current = update(current, {
                [action]: value
            });
            saveSetings(current);
        }
    };
};
const appServer = express();
const appPort = (nullref0 = process.env.PORT) != null ? nullref0 : 1337;
appServer.get("/", (req, res) => {
    res.send("Bot is running HYPERS");
});
const publicServer = appServer.listen(appPort, () =>
    console.log(`Public server is running on port ${appPort}`)
);
(async () => {
    const settings = Settings(
        await (await fetch(`https://api.jsonbin.io/b/${settingsID}/latest`, {
            headers: {
                "secret-key": secretKey
            }
        })).json()
    );
    const client = new Discord.Client();
    let currentPlayer = null;
    const playURL = async (vc, url, volume, channel) => {
        const stream = ytdl(url, {
            filter: "audioonly"
        });
        const player = vc.playStream(stream);
        const info = await ytdl.getBasicInfo(url);
        const details = info.player_response.videoDetails;
        console.log(details);
        stream.on("error", (err) => {
            console.log(`stream error with ${url}`);
            console.error(err);
            channel.send(`there was an error playing ${url}`);
        });
        player.setVolume(volume);
        player.on("start", () => {
            channel.send(`now playing ${details.title}`);
        });
        player.on("end", async (reason) => {
            console.log("stream ended");
            currentPlayer = null;
            if (reason !== "user") {
                settings.update("queue.$popFront");
                if (settings.value.queue.length > 0) {
                    currentPlayer = await playURL(
                        player.player.voiceConnection,
                        settings.value.queue[0],
                        settings.value.volume,
                        channel
                    );
                    return 0;
                }
            }
            player.player.voiceConnection.channel.leave();
        });
        player.totalTime = parseInt(details.lengthSeconds) * 1000;
        return player;
    };
    const isPlaying = conditional((msg) => currentPlayer !== null);
    const commands = {
        shutdown: () => {
            if (currentPlayer !== null) {
                currentPlayer.end();
            }
            for (const [name, vc] of client.voiceConnections) {
                vc.channel.leave();
            }
            client.destroy();
            publicServer.close();
        },
        play: async (msg, url) => {
            const id = msg.guild.id;
            if (client.voiceConnections.has(id) === false) {
                if (msg.member.voiceChannel === undefined) {
                    return;
                }
                msg.member.voiceChannel.join();
            }
            if (url !== undefined) {
                settings.update("queue.$push", url);
                msg.channel.send("Song added to queue \\o/");
            }
            if (settings.value.queue.length > 0 && currentPlayer === null) {
                currentPlayer = await playURL(
                    client.voiceConnections.get(id),
                    settings.value.queue[0],
                    settings.value.volume,
                    msg.channel
                );
            }
        },
        pause: isPlaying((msg) => {
            currentPlayer.pause();
        }),
        resume: isPlaying((msg) => {
            currentPlayer.resume();
        }),
        stop: isPlaying((msg) => {
            currentPlayer.end();
        }),
        skip: isPlaying((msg) => {
            currentPlayer.end("skip");
        }),
        status: isPlaying((msg) => {
            const timeFormat = (time) => {
                const s = Math.floor(time / 1000);
                const m = Math.floor(s / 60);
                const h = Math.floor(m / 60);
                const seconds = `0${s % 60}`.slice(-2);
                const minutes = `0${m % 60}`.slice(-2);
                return `${h}:${minutes}:${seconds}`;
            };
            const time = timeFormat(currentPlayer.time);
            const totalTime = timeFormat(currentPlayer.totalTime);
            msg.channel.send(`Song is at ${time}/${totalTime}`);
        }),
        volume: (msg, volume) => {
            if (volume !== undefined) {
                const id = msg.guild.id;
                const targetVolume = Math.min(volume, 100);
                const vol = parseFloat(volume) / 100;
                if (currentPlayer !== null) {
                    currentPlayer.setVolume(vol);
                }
                settings.update("volume.$set", vol);
            }
            msg.channel.send(`Volume set to ${settings.value.volume * 100}`);
        },
        join: (msg) => {
            var nullref1;

            return (nullref1 = msg.member.voiceChannel) != null
                ? nullref1.join()
                : undefined;
        },
        pie: (msg) => msg.channel.send("🥧"),
        pi: (msg, digitsString) => {
            var nullref1;

            const digits = parseInt(
                (nullref1 = digitsString) != null ? nullref1 : "20"
            );
            msg.channel.send(`\`\`\`${pi.slice(0, digits + 2)}\`\`\``);
        },
        queue: (msg, command, ...args) => {
            var nullref1;

            switch (command) {
                case "clear":
                    (nullref1 = currentPlayer) != null
                        ? nullref1.end()
                        : undefined;
                    settings.update("queue.$set", []);
                    msg.channel.send("queue has been cleared :thumbsup:");
                    break;
                case "list": {
                    const { queue } = settings.value;
                    if (queue.length === 0) {
                        msg.channel.send("queue is empty");
                    } else {
                        const qlist = queue.map(
                            (url, index) => `${index + 1}. ${url}`
                        );
                        msg.channel.send(`\`\`\`${qlist.join(newLine)}\`\`\``);
                    }
                    break;
                }
            }
        },
        youtube: (msg, command, ...args) => {
            if (command === "premium") {
                msg.channel.send("Fuck off, Youtube Premium");
            }
        },
        turkey: (msg) => msg.channel.send("🦃"),
        mist: (msg) =>
            msg.channel.send(`\`\`\`\n${commandText.turkey}\n\`\`\``),
        bacon: (msg) => msg.channel.send("🥓"),
        wesley: (msg) => msg.channel.send("Shut up, Wesley!")
    };
    const permissionInt = 3164160;
    client.on("ready", () => console.log(`${client.user.tag} is ready!`));
    client.on("message", (msg) => {
        var nullref1;

        if (msg.member.user.tag === client.user.tag) {
            return 0;
        }
        if (msg.channel.name !== "sick-beats") {
            return 0;
        }
        console.log(`${msg.member.user.tag}: ${msg.content}`);
        const msgBase = msg.content.replace(/^``?`?|`?`?`$/g, ``);
        const msgText = msgBase.toLowerCase();
        console.log(`Read as: ${msgText}`);
        if (msgText.startsWith("pls ") === true) {
            const [command, ...args] = msgBase.split(/\s+/).slice(1, undefined);
            (nullref1 = commands[command.toLowerCase()]) != null
                ? nullref1(msg, ...args)
                : undefined;
        }
    });
    await client.login(botToken);
})();
