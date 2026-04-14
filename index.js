const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Partials } = require('discord.js');
const http = require('http'); // Kütüphaneyi en üstte tanımladık

// 1. Bot Ayarları ve İzinleri
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
const snipes = new Map();

// 2. Render 7/24 Aktif Tutma Sunucusu (En üstte olması hatayı engeller)
http.createServer((req, res) => {
  res.write("Bot 7/24 Aktif!");
  res.end();
}).listen(process.env.PORT || 3000);

client.on('ready', () => {
    console.log(`[BAŞARILI] ${client.user.tag} aktif!`);
    client.user.setActivity('!yardım | Komutlar Hazır', { type: 0 });
});

// 3. LOG VE SNIPE KAYIT SİSTEMİ
client.on('messageDelete', async message => {
    if (message.author?.bot || !message.guild) return;

    // Snipe verisini hafızaya al
    snipes.set(message.channel.id, {
        content: message.content,
        author: message.author,
        image: message.attachments.first() ? message.attachments.first().proxyURL : null,
        timestamp: Date.now()
    });

    // Log kanalına gönder
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

// 4. TÜM KOMUTLAR
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(prefix) || !message.guild) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- YARDIM MENÜSÜ ---
    if (command === 'yardım') {
        const yardimEmbed = new EmbedBuilder()
            .setColor('DarkVividPink')
            .setTitle('🛡️ Gelişmiş Bot Komutları')
            .addFields(
                { name: '🎉 Eğlence & Sistem', value: '`!aşkölç`, `!evlen`, `!kedisev`, `!snipe`' },
                { name: '🛡️ Moderasyon', value: '`!sil`, `!kick`, `!ban`' },
                { name: '🤐 Susturma', value: '`!mute`, `!unmute`, `!vmute`, `!vunmute`' }
            ).setTimestamp();
        return message.reply({ embeds: [yardimEmbed] });
    }

    // --- SNIPE KOMUTU ---
    if (command === 'snipe') {
        const msg = snipes.get(message.channel.id);
        if (!msg) return message.reply("Burada henüz silinen bir mesaj yok.");

        const snipeEmbed = new EmbedBuilder()
            .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
            .setColor('Random')
            .setDescription(msg.content || "*Mesaj içeriği yok*")
            .setTimestamp(msg.timestamp);

        if (msg.image) snipeEmbed.setImage(msg.image);
        return message.reply({ embeds: [snipeEmbed] });
    }

    // --- MODERASYON KOMUTLARI ---
    if (command === 'mute') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return message.reply("Yetkin yok kanka.");
        const target = message.mentions.members.first();
        if (!target) return message.reply("Kimi susturacağız?");

        let muteRole = message.guild.roles.cache.find(r => r.name === "Muted");
        if (!muteRole) {
            try {
                muteRole = await message.guild.roles.create({ name: "Muted", permissions: [] });
                message.guild.channels.cache.forEach(async (channel) => {
                    await channel.permissionOverwrites.edit(muteRole, { SendMessages: false, AddReactions: false });
                });
            } catch (e) { return message.reply("Mute rolü oluşturulamadı."); }
        }
        await target.roles.add(muteRole);
        return message.reply(`🤐 **${target.user.tag}** susturuldu.`);
    }

    if (command === 'unmute') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;
        const target = message.mentions.members.first();
        const muteRole = message.guild.roles.cache.find(r => r.name === "Muted");
        if (target && muteRole) {
            await target.roles.remove(muteRole);
            message.reply(`🔊 **${target.user.tag}** konuşması açıldı.`);
        }
    }

    if (command === 'vmute') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.MuteMembers)) return;
        const target = message.mentions.members.first();
        if (target?.voice.channel) {
            await target.voice.setMute(true);
            message.reply(`🎙️ **${target.user.tag}** seste susturuldu.`);
        } else { message.reply("Kullanıcı seste değil."); }
    }

    if (command === 'vunmute') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.MuteMembers)) return;
        const target = message.mentions.members.first();
        if (target?.voice.channel) {
            await target.voice.setMute(false);
            message.reply(`🔊 **${target.user.tag}** sesli susturması kaldırıldı.`);
        }
    }

    if (command === 'sil') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) return message.reply("1-100 arası sayı gir.");
        await message.channel.bulkDelete(miktar, true);
        message.channel.send(`🧹 ${miktar} mesaj temizlendi.`).then(m => setTimeout(() => m.delete(), 3000));
    }

    if (command === 'kick') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return;
        const target = message.mentions.members.first();
        if (target?.kickable) {
            await target.kick();
            message.reply(`👢 ${target.user.tag} sunucudan atıldı.`);
        }
    }

    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
        const target = message.mentions.members.first();
        if (target?.bannable) {
            await target.ban();
            message.reply(`🔨 ${target.user.tag} yasaklandı.`);
        }
    }

    // --- EĞLENCE KOMUTLARI ---
    if (command === 'aşkölç') {
        const target = message.mentions.users.first();
        if (!target) return message.reply("Birisini etiketle kanka.");
        const yuzde = Math.floor(Math.random() * 101);
        message.channel.send(`💘 **${message.author.username}** & **${target.username}** arasındaki aşk: %${yuzde}!`);
    }

    if (command === 'evlen') {
        const target = message.mentions.users.first();
        if (!target) return message.reply("Kiminle evleniyorsun?");
        message.channel.send(`💍 🎉 **${message.author.username}** ve **${target.username}** artık evli!`);
    }

    if (command === 'kedisev') {
        message.reply("🐈 Meow! Kediciği sevdin ve o çok mutlu oldu.");
    }
});

// 5. Bot Girişi
client.login(process.env.TOKEN);
