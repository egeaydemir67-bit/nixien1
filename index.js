const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Partials } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const prefix = "!";
const logKanalAdi = "bot-log"; 

// --- SNIPE SİSTEMİ İÇİN BELLEK ---
const snipes = new Map();

// Render 7/24 Aktif Tutma Portu
http.createServer((req, res) => {
  res.write("Bot 7/24 Aktif!");
  res.end();
}).listen(process.env.PORT || 3000);

client.on('ready', () => {
    console.log(`[BAŞARILI] ${client.user.tag} aktif!`);
    client.user.setActivity('!yardım | Snipe Aktif', { type: 0 });
});

// --- LOG & SNIPE KAYIT SİSTEMİ ---
client.on('messageDelete', async message => {
    if (message.author?.bot || !message.guild) return;

    // Snipe verisini kaydet
    snipes.set(message.channel.id, {
        content: message.content,
        author: message.author,
        image: message.attachments.first() ? message.attachments.first().proxyURL : null,
        timestamp: Date.now()
    });

    // Klasik Log Kanalına Gönder
    const logChannel = message.guild.channels.cache.find(c => c.name === logKanalAdi);
    if (logChannel) {
        const logEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('🗑️ Mesaj Silindi')
            .addFields(
                { name: 'Kullanıcı', value: `${message.author.tag}`, inline: true },
                { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
                { name: 'Mesaj', value: message.content || 'İçerik yok (Resim vb.)' }
            ).setTimestamp();
        logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }
});

// --- KOMUTLAR ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(prefix) || !message.guild) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 🎯 SNIPE KOMUTU
    if (command === 'snipe') {
        const msg = snipes.get(message.channel.id);
        if (!msg) return message.reply("Bu kanalda henüz silinen bir mesaj yakalayamadım kanka.");

        const snipeEmbed = new EmbedBuilder()
            .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
            .setColor('Random')
            .setDescription(msg.content || "*Mesaj içeriği yok (sadece medya olabilir)*")
            .setFooter({ text: "Silindiği saat:" })
            .setTimestamp(msg.timestamp);

        if (msg.image) snipeEmbed.setImage(msg.image);

        return message.reply({ embeds: [snipeEmbed] });
    }

    // 📌 YARDIM MENÜSÜ (GÜNCELLENDİ)
    if (command === 'yardım') {
        const yardimEmbed = new EmbedBuilder()
            .setColor('DarkVividPink')
            .setTitle('🛡️ Gelişmiş Komut Listesi')
            .addFields(
                { name: '🎉 Eğlence & Utility', value: '`!aşkölç`, `!evlen`, `!kedisev`, `!snipe`' },
                { name: '🛡️ Moderasyon', value: '`!sil`, `!kick`, `!ban`' },
                { name: '🤐 Susturma', value: '`!mute`, `!unmute`, `!vmute`, `!vunmute`' }
            ).setTimestamp();
        return message.reply({ embeds: [yardimEmbed] });
    }

    // --- YENİ SUSTURMA KOMUTLARI ---

    // 🤐 CHAT MUTE
    if (command === 'mute') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return message.reply("Yetkin yetmiyor kanka.");
        const target = message.mentions.members.first();
        if (!target) return message.reply("Kimi susturacağız?");

        let muteRole = message.guild.roles.cache.find(r => r.name === "Muted");
        if (!muteRole) {
            try {
                muteRole = await message.guild.roles.create({
                    name: "Muted",
                    permissions: []
                });
                message.guild.channels.cache.forEach(async (channel) => {
                    await channel.permissionOverwrites.edit(muteRole, { SendMessages: false, AddReactions: false });
                });
            } catch (e) { return message.reply("Mute rolü oluşturulamadı."); }
        }

        await target.roles.add(muteRole);
        return message.reply(`🤐 **${target.user.tag}** başarıyla metin kanallarında susturuldu.`);
    }

    // 🗣️ CHAT UNMUTE
    if (command === 'unmute') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return message.reply("Yetkin yok.");
        const target = message.mentions.members.first();
        const muteRole = message.guild.roles.cache.find(r => r.name === "Muted");
        if (!target || !muteRole) return message.reply("Kullanıcıyı etiketle veya Muted rolü yok.");

        await target.roles.remove(muteRole);
        return message.reply(`🔊 **${target.user.tag}** artık konuşabilir.`);
    }

    // 🎙️ SESLİ MUTE (VMUTE)
    if (command === 'vmute') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.MuteMembers)) return message.reply("Yetkin yok.");
        const target = message.mentions.members.first();
        if (!target || !target.voice.channel) return message.reply("Kullanıcı sesli kanalda değil!");

        await target.voice.setMute(true);
        return message.reply(`🎙️ **${target.user.tag}** sesli kanalda susturuldu.`);
    }

    // 🔊 SESLİ UNMUTE (VUNMUTE)
    if (command === 'vunmute') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.MuteMembers)) return message.reply("Yetkin yok.");
        const target = message.mentions.members.first();
        if (!target || !target.voice.channel) return message.reply("Kullanıcı sesli kanalda değil!");

        await target.voice.setMute(false);
        return message.reply(`🎙️ **${target.user.tag}** sesli kanalda konuşması açıldı.`);
    }

    // --- ESKİ KOMUTLAR (MODERASYON & EĞLENCE) ---
    if (command === 'sil') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) return message.reply("1-100 arası sayı gir.");
        await message.channel.bulkDelete(miktar, true);
        message.channel.send(`🧹 ${miktar} mesaj silindi.`).then(m => setTimeout(() => m.delete(), 3000));
    }

    if (command === 'kick') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return;
        const target = message.mentions.members.first();
        if (target && target.kickable) {
            await target.kick();
            message.reply(`👢 ${target.user.tag} atıldı.`);
        }
    }

    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
        const target = message.mentions.members.first();
        if (target && target.bannable) {
            await target.ban();
            message.reply(`🔨 ${target.user.tag} banlandı.`);
        }
    }

    if (command === 'aşkölç') {
        const target = message.mentions.users.first();
        if (!target) return message.reply("Birisini etiketle.");
        const yuzde = Math.floor(Math.random() * 101);
        message.channel.send(`💘 **${message.author.username}** & **${target.username}**: %${yuzde} aşk!`);
    }

    if (command === 'evlen') {
        const target = message.mentions.users.first();
        if (!target) return message.reply("Birisini etiketle.");
        message.channel.send(`💍 **${message.author.username}** ve **${target.username}** evlendi!`);
    }

    if (command === 'kedisev') {
        message.reply("🐈 Meow! Çok tatlı bir kedi sevdin.");
    }
});


const http = require('http');
http.createServer((req, res) => {
  res.write("Bot 7/24 Aktif!");
  res.end();
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN)
