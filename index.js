const { Client, GatewayIntentBits, EmbedBuilder, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const http = require('http');
const mongoose = require('mongoose');
const ms = require('ms'); // Süre hesaplamaları için
const Canvas = require('canvas'); // Resimli aşk ölçer için

const statSchema = new mongoose.Schema({
    guildID: String,
    userID: String,
    messageCount: { type: Number, default: 0 },
    voiceTime: { type: Number, default: 0 }, // Milisaniye cinsinden
    lastVoiceJoin: { type: Number, default: 0 }
});
const Stats = mongoose.model('Stats', statSchema);

// --- 1. ROL VE KULLANICI AYARLARI ---
const prefix = "a!";
const logKanalAdi = "bot-log";
const OWNER_ID = "983015347105976390"; // Senin ID'n

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
    .then(() => console.log("[MongoDB] Veritabanı bağlandı!"))
    .catch(err => console.error("[MongoDB] Hata:", err));

// Sicil Şeması
const sicilSchema = new mongoose.Schema({
    kullaniciID: String,
    yetkiliID: String,
    islem: String, // Mute, Vmute, Kick, Ban
    sebep: String,
    sure: String,
    tarih: { type: Date, default: Date.now }
});
const Sicil = mongoose.model('Sicil', sicilSchema);

// Evlilik Şeması
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
    res.write("Bot 7/24 Aktif!");
    res.end();
}).listen(process.env.PORT || 3000);

client.on('ready', () => {
    console.log(`[BAŞARILI] ${client.user.tag} aktif!`);
    client.user.setActivity('a!yardım | Ace System', { type: 0 });
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

    // Kanala katıldıysa
    if (!oldState.channelId && newState.channelId) {
        await Stats.findOneAndUpdate(
            { guildID, userID },
            { lastVoiceJoin: Date.now() },
            { upsert: true }
        );
    }
    // Kanaldan ayrıldıysa
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

// --- 5. KOMUTLAR ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(prefix) || !message.guild) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Yetki Kontrol Fonksiyonu (Sunucu sahibi veya rol)
    const yetkiVarMi = (rolID) => {
        return message.author.id === message.guild.ownerId || message.author.id === OWNER_ID || message.member.roles.cache.has(rolID);
    };

// --- YARDIM ---
    if (command === 'yardım') {
        const elitEmbed = new EmbedBuilder()
            .setColor('#2b2d31') // Discord'un koyu temasıyla uyumlu elit bir renk
            .setAuthor({ 
                name: `${client.user.username} • Komut Menüsü`, 
                iconURL: client.user.displayAvatarURL() 
            })
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setDescription(
                `> 🛡️ **Güvenlik ve eğlence sistemine hoş geldin.**\n` +
                `> Aşağıdaki kategorilerden botun özelliklerini inceleyebilirsin.\n\n` +
                `**✨ İstatistikler:**\n` +
                `┕ 🏓 **Ping:** \`${client.ws.ping}ms\` | 👥 **Kullanıcı:** \`${message.guild.memberCount}\``
            )
            .addFields(
                { 
                    name: '🎭 Üye/Eğlence Komutları', 
                    value: '```fix\na!aşkölç | a!evlen | a!kedisev | a!stat | a!evlilik```', 
                    inline: false 
                },
                { 
                    name: '🛡️ Moderasyon Sistemi', 
                    value: '```yaml\na!mute  [süre] [sebep]\na!vmute [süre] [sebep]\na!ban   [sebep]\na!kick  [sebep]```', 
                    inline: false 
                },
                { 
                    name: '⚙️ Yönetim & Sistem', 
                    value: '```diff\n+ a!sicil | a!sil | a!snipe```', 
                    inline: false 
                }
            )
            .setFooter({ 
                text: `${message.author.username} tarafından istendi.`, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setTimestamp();

        // Eğer komutu yazan sensen (OWNER), en alta özel bir alan ekle
        if (message.author.id === OWNER_ID) {
            elitEmbed.addFields({ 
                name: '👑 Bot Developer Özel', 
                value: '` a!ceza-menü ` (Sadece Aceye özel panel)', 
                inline: false 
            });
        }

        return message.reply({ embeds: [elitEmbed] });
    }

    // --- SİL VE SNIPE ---
    if (command === 'sil') {
        if (!yetkiVarMi(PERMS.SIL_SNIPE)) return message.reply("Bu komutu kullanmak için yetkin yok.");
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) return message.reply("1-100 arası sayı gir.");
        await message.channel.bulkDelete(miktar, true);
        return message.channel.send(`🧹 ${miktar} mesaj temizlendi.`).then(m => setTimeout(() => m.delete(), 3000));
    }

    if (command === 'snipe') {
        if (!yetkiVarMi(PERMS.SIL_SNIPE)) return message.reply("Bu komutu kullanmak için yetkin yok.");
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

    // --- MODERASYON: MUTE ---
    if (command === 'mute') {
        if (!yetkiVarMi(PERMS.MUTE)) return message.reply("Yetkin yok aslanım.");
        const target = message.mentions.members.first();
        const sure = args[1];
        const sebep = args.slice(2).join(' ');

        if (!target) return message.reply("Kimi susturacağız? `!mute @kişi 10m Küfür`");
        if (!sure || !ms(sure)) return message.reply("Geçerli bir süre gir (Örn: 10m, 1h, 1d).");
        if (!sebep) return message.reply("Lütfen bir sebep belirtin!");

        try {
            await target.timeout(ms(sure), sebep); // Discord'un orijinal TimeOut sistemini kullanır (Daha güvenli)
            await new Sicil({ kullaniciID: target.id, yetkiliID: message.author.id, islem: 'Chat Mute', sebep, sure }).save();
            return message.reply(`🤐 **${target.user.tag}** adlı kullanıcı **${sure}** boyunca susturuldu. \n📝 Sebep: ${sebep}`);
        } catch (e) {
            return message.reply("Kullanıcıyı susturamıyorum, yetkim ondan düşük olabilir.");
        }
    }

    // --- MODERASYON: VMUTE ---
    if (command === 'vmute') {
        if (!yetkiVarMi(PERMS.VMUTE)) return message.reply("Sesli mute yetkin yok.");
        const target = message.mentions.members.first();
        const sure = args[1];
        const sebep = args.slice(2).join(' ');

        if (!target) return message.reply("Kimi susturacağız? `!vmute @kişi 10m Trol`");
        if (!sure || !ms(sure)) return message.reply("Geçerli bir süre gir (Örn: 10m, 1h).");
        if (!sebep) return message.reply("Lütfen bir sebep belirtin!");

        if (target.voice.channel) {
            await target.voice.setMute(true, sebep);
            await new Sicil({ kullaniciID: target.id, yetkiliID: message.author.id, islem: 'Voice Mute', sebep, sure }).save();
            message.reply(`🎙️ **${target.user.tag}** seste **${sure}** boyunca susturuldu.\n📝 Sebep: ${sebep}`);
            
            // Süre bitince aç
            setTimeout(() => {
                if (target.voice.channel) target.voice.setMute(false);
            }, ms(sure));
        } else {
            return message.reply("Kullanıcı şu an seste değil.");
        }
    }

    // --- MODERASYON: BAN & KICK ---
    if (command === 'ban') {
        if (!yetkiVarMi(PERMS.BAN)) return message.reply("Ban yetkin yok.");
        const target = message.mentions.members.first();
        const sebep = args.slice(1).join(' ');
        
        if (!target) return message.reply("Kimi banlayacağız?");
        if (!sebep) return message.reply("Lütfen bir sebep belirtin!");

        await target.ban({ reason: sebep });
        await new Sicil({ kullaniciID: target.id, yetkiliID: message.author.id, islem: 'Ban', sebep, sure: 'Sınırsız' }).save();
        return message.reply(`🔨 **${target.user.tag}** sunucudan yasaklandı. Sebep: ${sebep}`);
    }

    if (command === 'kick') {
        if (!yetkiVarMi(PERMS.KICK)) return message.reply("Kick yetkin yok.");
        const target = message.mentions.members.first();
        const sebep = args.slice(1).join(' ');
        
        if (!target) return message.reply("Kimi atacağız?");
        if (!sebep) return message.reply("Lütfen bir sebep belirtin!");

        await target.kick(sebep);
        await new Sicil({ kullaniciID: target.id, yetkiliID: message.author.id, islem: 'Kick', sebep, sure: '-' }).save();
        return message.reply(`👢 **${target.user.tag}** sunucudan atıldı. Sebep: ${sebep}`);
    }

    // --- SİCİL SİSTEMİ ---
    if (command === 'sicil') {
        if (!yetkiVarMi(PERMS.SICIL)) return message.reply("Sicil görüntüleme yetkin yok.");
        const target = message.mentions.users.first() || message.author;

        const data = await Sicil.find({ kullaniciID: target.id }).sort({ tarih: -1 }).limit(10);
        if (!data || data.length === 0) return message.reply("Bu kullanıcının sicili tertemiz!");

        const embed = new EmbedBuilder()
            .setColor('Blurple')
            .setTitle(`📂 ${target.username} Adlı Kullanıcının Sicili`)
            .setDescription("Son 10 ceza kaydı aşağıda listelenmiştir:");

        data.forEach((kayit, index) => {
            const yetkili = message.guild.members.cache.get(kayit.yetkiliID);
            const yetkiliAd = yetkili ? yetkili.user.tag : "Bilinmeyen Yetkili";
            const tarih = new Date(kayit.tarih).toLocaleDateString('tr-TR');
            embed.addFields({ 
                name: `${index + 1}. ${kayit.islem}`, 
                value: `**Sebep:** ${kayit.sebep}\n**Süre:** ${kayit.sure}\n**Yetkili:** ${yetkiliAd}\n**Tarih:** ${tarih}` 
            });
        });

        return message.reply({ embeds: [embed] });
    }

    // --- EĞLENCE: EVLENME SİSTEMİ ---
    if (command === 'evlen') {
        const target = message.mentions.users.first();
        if (!target) return message.reply("Kiminle evlenmek istiyorsun?");
        if (target.id === message.author.id) return message.reply("Kendi kendinle evlenemezsin!");

        // Zaten evli mi kontrolü
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
                
                // Evli rolü ver
                const rol = message.guild.roles.cache.get(PERMS.EVLI_ROL);
                if (rol) {
                    message.member.roles.add(rol).catch(()=>console.log("Rol verme hatası"));
                    const targetMember = message.guild.members.cache.get(target.id);
                    if (targetMember) targetMember.roles.add(rol).catch(()=>console.log("Rol verme hatası"));
                }

                await i.update({ content: `🎉 Tebrikler! **${message.author.username}** ve **${target.username}** artık resmen evli! 💍`, components: [] });
            } else {
                await i.update({ content: `💔 Ahbeee! **${target.username}**, evlilik teklifini reddetti. Geçmiş olsun...`, components: [] });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) teklifMsg.edit({ content: "⏳ Evlilik teklifi zaman aşımına uğradı.", components: [] });
        });
    }

    // --- EĞLENCE: KEDİ SEV ---
    if (command === 'kedisev') {
        try {
            // Ücretsiz kedi fotoğrafı API'sinden veri çekiyoruz
            const res = await fetch('https://api.thecatapi.com/v1/images/search');
            const data = await res.json();
            const kediUrl = data[0].url;

            const kediEmbed = new EmbedBuilder()
                .setColor('#f39c12')
                .setTitle('🐈 Kediciği Çok Sevdin!')
                .setDescription(`> **${message.author.username}**, bir kediciği başını okşayarak sevdin. O da sana teşekkür etmek için bir fotoğrafını gönderdi!`)
                .setImage(kediUrl)
                .setFooter({ text: 'Miyav! ~ Meow!', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            return message.reply({ embeds: [kediEmbed] });
        } catch (error) {
            // Eğer internette/API'de sorun çıkarsa yedek mesaj
            return message.reply("🐈 Kediciği tam sevecektin ki kaçtı! (Fotoğraf yüklenemedi, ama o seni seviyor.)");
        }
    }

    if (command === 'evlilik') {
        const kayit = await Evlilik.findOne({ $or: [{ kullanici1: message.author.id }, { kullanici2: message.author.id }] });
        if (!kayit) return message.reply("Şu an kimseyle evli değilsin.");

        const partnerID = kayit.kullanici1 === message.author.id ? kayit.kullanici2 : kayit.kullanici1;
        const tarih = Math.floor(kayit.tarih.getTime() / 1000); // Discord timestamp formatına çevirme
        
        return message.reply(`💍 <@${partnerID}> ile <t:${tarih}:R> evlendin!`);
    }

    if (command === 'stat') {
        const target = message.mentions.users.first() || message.author;
        const data = await Stats.findOne({ guildID: message.guild.id, userID: target.id });

        if (!data) return message.reply("⚠️ Henüz kaydedilmiş bir istatistik bulunamadı.");

        // Süreyi okunabilir formata çevirme (Saat/Dakika)
        const toplamSaniye = Math.floor(data.voiceTime / 1000);
        const saat = Math.floor(toplamSaniye / 3600);
        const dakika = Math.floor((toplamSaniye % 3600) / 60);

        const statEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ name: `${target.username} Kullanıcı İstatistikleri`, iconURL: target.displayAvatarURL({ dynamic: true }) })
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '💬 Mesaj İstatistiği', value: `\`\`\`fix\n${data.messageCount} Mesaj\`\`\``, inline: true },
                { name: '🔊 Ses İstatistiği', value: `\`\`\`fix\n${saat} Saat, ${dakika} Dakika\`\`\``, inline: true }
            )
            .setFooter({ text: 'Veriler anlık olarak güncellenmektedir.' })
            .setTimestamp();

        return message.reply({ embeds: [statEmbed] });
    }

if (command === 'gojovssukuna') {
        // AŞAMA 1: KARŞILAŞMA
        const baslangicEmbed = new EmbedBuilder()
            .setTitle('⚔️ SHINJUKU: ZİRVENİN SAVAŞI BAŞLIYOR!')
            .setDescription('**Gojo Satoru** ve **Ryomen Sukuna** karşı karşıya! Atmosfer gergin, tüm büyü dünyası bu anı izliyor...')
            .setColor('#2F3136')
            .setImage('https://tenor.com/view/sukuna-gojo-gojo-vs-sukuna-jujutsu-kaisen-jjk-gif-6903186477285389616.gif') // İkonik VS kapak resmi
            .setFooter({ text: 'Savaş hazırlanıyor... ⏳' });

        const anaMesaj = await message.reply({ embeds: [baslangicEmbed] });

        // 4 saniye sonra AŞAMA 2: KRİTİK AN
        setTimeout(async () => {
            const aksiyonEmbed = new EmbedBuilder()
                .setTitle('💥 ALANLAR ÇARPIŞIYOR!')
                .setDescription('**Infinite Void** vs **Malevolent Shrine**! İki taraf da sınırlarını zorluyor. Kimse gözünü kırpamıyor!')
                .setColor('#8A2BE2')
                .setImage('https://tenor.com/view/sukuna-sukuna-vs-gojo-gojo-gojo-satoru-gojo-domain-expansion-gif-15863208524156955346.gif') // Alan genişletme sahnesi
                .setFooter({ text: 'Karar anına son saniyeler... ⚡' });

            await anaMesaj.edit({ embeds: [aksiyonEmbed] });

            // 6 saniye sonra AŞAMA 3: FİNAL (Ölüm/Zafer sahneleri)
            setTimeout(async () => {
                const sonuclar = [
                    {
                        kazanan: 'Gojo Satoru',
                        renk: '#00D1FF',
                        baslik: '🏆 ZAFER: GÖKYÜZÜNÜN HAKİMİ GOJO!',
                        aciklama: 'Gojo, imkansızı başardı ve Sukuna\'yı köşeye sıkıştırdı! Altı Göz\'ün gücü galip geldi.\n\n*"Endişelenme, ben en güçlüyüm."*',
                        resim: 'https://tenor.com/view/satoru-gojo-gif-15821239126738319440.gif' // Gojo zafer pozu
                    },
                    {
                        kazanan: 'Ryomen Sukuna',
                        renk: '#FF0000',
                        baslik: '💀 SONUÇ: LANETLERİN KRALI HÜKMEDİYOR!',
                        aciklama: 'Sukuna, tarihin en büyük kesişini yaptı. Gojo Satoru\'nun dönemi burada sona eriyor...\n\n*"Seni asla unutmayacağım, Satoru Gojo."*',
                        resim: 'https://tenor.com/view/sukuna-sukuna-laugh-sukuna-kills-gojo-sukuna-defeats-gojo-gojo-satoru-gif-14680103525656661336.gif' // Sukuna zafer/Gojo mağlubiyet sahnesi
                    }
                ];

                const final = sonuclar[Math.floor(Math.random() * sonuclar.length)];

                const finalEmbed = new EmbedBuilder()
                    .setTitle(final.baslik)
                    .setDescription(final.aciklama)
                    .setColor(final.renk)
                    .setImage(final.resim)
                    .setFooter({ text: `Savaşı tetikleyen: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();

                await anaMesaj.edit({ embeds: [finalEmbed] });

            }, 6000); 
        }, 4000);
    }
    
    // --- EĞLENCE: RESİMLİ AŞK ÖLÇER ---
    if (command === 'aşkölç') {
        const target = message.mentions.users.first();
        if (!target) return message.reply("Birisini etiketle!");

        const msg = await message.reply("💘 Aşk ölçülüyor... Lütfen bekle.");
        const yuzde = Math.floor(Math.random() * 101);

        // Canvas ayarları
        const canvas = Canvas.createCanvas(700, 250);
        const ctx = canvas.getContext('2d');

        // Arkaplan
        ctx.fillStyle = '#ffb6c1'; // Açık pembe arka plan
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Avatarlar
        const avatar1 = await Canvas.loadImage(message.author.displayAvatarURL({ extension: 'png' }));
        const avatar2 = await Canvas.loadImage(target.displayAvatarURL({ extension: 'png' }));
        ctx.drawImage(avatar1, 50, 50, 150, 150);
        ctx.drawImage(avatar2, 500, 50, 150, 150);

        // Kalp veya Kırık Kalp ve Yüzde Çizimi
        ctx.font = '50px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = "center";
        
        let emoji = yuzde > 50 ? "💖" : "💔";
        ctx.fillText(`${emoji} %${yuzde}`, canvas.width / 2, 140);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'askolcer.png' });
        await msg.delete();
        return message.channel.send({ content: `**${message.author.username}** & **${target.username}** aşk uyumu:`, files: [attachment] });
    }

    // --- SADECE SANA ÖZEL CEZA MENÜSÜ ---
    if (command === 'ceza-menü') {
        if (message.author.id !== OWNER_ID) return message.reply("❌ Bu komutu sadece bot sahibi kullanabilir!");

        const target = message.mentions.members.first();
        if (!target) return message.reply("İşlem yapılacak kişiyi etiketle: `!ceza-menü @kişi`");

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ceza_select')
                    .setPlaceholder('Uygulanacak cezayı seçin')
                    .addOptions([
                        { label: 'Chat Mute (10 Dk)', description: 'Kullanıcıyı 10 dk susturur.', value: 'mute_10m' },
                        { label: 'Voice Mute (1 Saat)', description: 'Kullanıcıyı 1 saat seste susturur.', value: 'vmute_1h' },
                        { label: 'Sunucudan At (Kick)', description: 'Kullanıcıyı sunucudan atar.', value: 'kick' },
                        { label: 'Sunucudan Yasakla (Ban)', description: 'Kullanıcıyı kalıcı banlar.', value: 'ban' },
                    ]),
            );

        await message.reply({ content: `**${target.user.tag}** kullanıcısı için ceza menüsü:`, components: [row] });
    }
});

// Menü Etkileşimi Dinleyici (Ceza Menüsü İçin)
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === 'ceza_select') {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: "Buna dokunamazsın!", ephemeral: true });

        // Etiketlenen kişiyi mesajdan bulmak için ufak bir hile (mesaj içeriğinden çeker)
        const targetMention = interaction.message.content.match(/<@!?(\d+)>/);
        if (!targetMention) return interaction.reply({ content: "Kullanıcı bulunamadı.", ephemeral: true });
        
        const target = interaction.guild.members.cache.get(targetMention[1]);
        if (!target) return interaction.reply({ content: "Kullanıcı sunucuda değil.", ephemeral: true });

        const islem = interaction.values[0];

        try {
            if (islem === 'mute_10m') {
                await target.timeout(10 * 60 * 1000, "Sahip Menüsü");
                await interaction.reply(`✅ ${target.user.tag} 10 dakika susturuldu.`);
            } else if (islem === 'vmute_1h') {
                if(target.voice.channel) await target.voice.setMute(true, "Sahip Menüsü");
                await interaction.reply(`✅ ${target.user.tag} seste 1 saat susturuldu.`);
                setTimeout(() => { if (target.voice.channel) target.voice.setMute(false); }, 3600000);
            } else if (islem === 'kick') {
                await target.kick("Sahip Menüsü");
                await interaction.reply(`✅ ${target.user.tag} sunucudan atıldı.`);
            } else if (islem === 'ban') {
                await target.ban({ reason: "Sahip Menüsü" });
                await interaction.reply(`✅ ${target.user.tag} sunucudan yasaklandı.`);
            }
        } catch (e) {
            await interaction.reply({ content: "İşlem başarısız, yetkim yetmiyor olabilir.", ephemeral: true });
        }
    }
});

// 6. Bot Girişi
client.login(process.env.TOKEN);
