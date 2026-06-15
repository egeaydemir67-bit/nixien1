const { 
    Client, 
    GatewayIntentBits, 
    PermissionsBitField, 
    EmbedBuilder, 
    Partials, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    AttachmentBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    ComponentType,
    TextInputStyle 
} = require('discord.js');
const http = require('http');
const mongoose = require('mongoose');
const ms = require('ms');
const Canvas = require('canvas');
let sonsuzlukAktif = false;
const messageLog = new Map(); 
let spamKorumaAktif = true;



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
    MUTE: "1507679445509738636",
    VMUTE: "1507679445509738636",
    BAN: "1508910494021582978",
    KICK: "1507679446209921085",
    SIL_SNIPE: "1507679444322619464",
    SICIL: "1507679445509738636",
    EVLI_ROL: "1502345462940827779"
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

// Örnek Evlilik Şeması (Kendi dosyandaki ile değiştir/güncelle)
const evlilikSchema = new mongoose.Schema({
    kullanici1: String,
    kullanici2: String,
    tarih: { type: Date, default: Date.now },
    cocuklar: { type: Array, default: [] } // Yeni eklenen kısım
});
const Evlilik = mongoose.model('Evlilik', evlilikSchema);

// Bu Set, hedeflenen kullanıcıların ID'lerini tutacak
const targetedUsers = new Set();

// Botun atacağı rastgele mesajların havuzu
const randomReplies = [
    "Gojo tarafından lanetlendin lan, sus artık amına koduğumun evladı.",
    "Gojo seni sikti geçti, hâlâ mı konuşuyorsun piç?",
    "Ananı avradını Gojo'nun six eyes'ına sokayım, salak salak yazma.",
    "Gojo'nun Infinity'sine çarptın, geri zekâlı.",
    "Nah, I'd win. Senin gibi orospu çocuklarını Gojo her gün siker.",
    "Gojo tarafından ezildin, ağla şimdi anasını siktigim.",
    "Ananın amına Gojo'nun Hollow Purple'ını soktum, sus lan.",
    "Gojo seni götten sikerken mi böyle salak bir amcık oldun?",
    "Kudurdun aq, Gojo'nun götünü yala da rahatla.",
    "Gojo üstünlüğü karşısında ezildin, piç evladı.",
    "Ananı sikerim, Gojo'nun tek parmağına bile yenilirsin lan sen.",
    "Gojo laneti bulaştı sana, orospu çocuğu.",
    "Boş yapma lan, Gojo seni çoktan sikti.",
    "Gojo'nun six'ine sokayım o laflarını.",
    "Ananı babanı Gojo'yla beraber sikerim.",
    "Gojo tarafından lanetlenmiş salak, sus otur.",
    "Siktir git, Gojo level'ında değilsin piç.",
    "Gojo seni sikerken izledim, hâlâ mı ukalalık?",
    "Ana avrat düz giderim, Gojo da seni siker.",
    "Gojo'nun ayaklarının altına serildin orospu evladı.",
    "Haklısın amk, Gojo seni sikerken haklıymış.",
    "Gojo'nun Infinity'sini yedin mi bu kadar salak oldun?",
    "Ananın amına koduğumun Gojo sevicisi.",
    "Gojo tarafından götten sikildin, ağla şimdi.",
    "Siktir lan, Gojo seninle uğraşmaz ananla uğraşır.",
    "Gojo üstünlüğü ezer geçer seni, amına kodum.",
    "Orospu çocuğu, Gojo'nun gölgesinde kalda ananı sikerken izlersin.",
    "Ananı Gojo'yla beraber sikerim, sus.",
    "Gojo seni sikti, gerisini ben bitiririm.",
    "Nah, I'd win derken Gojo seni yere serdi.",
    "Gojo lanetiyle doğdun herhalde, bu kadar lanetlendiğine göre orospu çocuğu seni.",
    "Ananın içine Gojo'nun cursed energy'sini boşalttım.",
    "Gojo tarafından ezilmek nasıl bir duygu piç?",
    "Kesin öyledir amına koduğumun.",
    "Gojo seni siker, ben de ananı sikerim.",
    "Ananı deldim, sus lan orospu evladı.",
    "Gojo'nun six eyes'ı seni gördü, tiksindi.",
    "Ananı avradını Gojo'nun domain'inde sikerim.",
    "Gojo üstünlüğü karşısında ağla, piç kurusu.",
    "Boş yapma kanka, Gojo seni çoktan bitirdi.",
    "Gojo tarafından lanetlendin, kurtuluşun yok.",
    "Siktir git lan, Gojo level'ına oynamıyorsun.",
    "Ananı sikerim Gojo'nun beyaz saçlı orospusu.",
    "Gojo seni ezerken izlemek zevkliydi.",
    "Hollow Purple yedin diyemi bu kadar salaklaştın?",
    "Gojo'nun ayak parmağına bile yenilirsin sen aq.",
    "Ana avrat küfür yetmedi, illaha Gojo üstüne sıçsın demi piç",
    "Gojo tarafından sikildin, hâlâ mı konuşuyorsun?",
    "Orospu çocuğu, Gojo seni çoktan sildi geçti.",
    "Ananın amına Gojo'nun tekmesini atayım."
];

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

const snipes = new Map(); // Normal snipe için kalıyor
const snipesV10 = new Map(); // SnipeV10 için yeni özel hafıza

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
    if (!message.guild || message.author?.bot) return;

    // 1. Log Kanalına Bildirim
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

    // 2. NORMAL SNIPE SİSTEMİ (Eski komutunun düzelmesi için veriyi eski halinde tutuyoruz)
    const normalSnipeData = {
        author: message.author,
        content: message.content || null,
        image: message.attachments.first()?.proxyURL || message.attachments.first()?.url || null,
        timestamp: message.createdTimestamp
    };
    snipes.set(message.channel.id, normalSnipeData);

    // 3. SNIPE V10 SİSTEMİ (Kategorize edilmiş gelişmiş arşiv)
    if (!snipesV10.has(message.channel.id)) {
        snipesV10.set(message.channel.id, { text: [], image: [], media: [] });
    }

    const v10Data = snipesV10.get(message.channel.id);
    let attachmentUrl = null;
    let isVideoOrGif = false;

    if (message.attachments.size > 0) {
        const attachment = message.attachments.first();
        attachmentUrl = attachment.proxyURL || attachment.url;
        
        const contentType = attachment.contentType || "";
        if (contentType.includes('video') || contentType.includes('gif') || attachmentUrl.endsWith('.mp4') || attachmentUrl.endsWith('.gif')) {
            isVideoOrGif = true;
        }
    }

    const baseData = {
        author: message.author,
        timestamp: message.createdTimestamp
    };

    // Metin Mesajı Arşivi (Maksimum 10 adet)
    if (message.content) {
        v10Data.text.unshift({ ...baseData, content: message.content });
        if (v10Data.text.length > 10) v10Data.text.pop();
    }

    // Fotoğraf Arşivi (Maksimum 10 adet)
    if (attachmentUrl && !isVideoOrGif) {
        v10Data.image.unshift({ ...baseData, image: attachmentUrl });
        if (v10Data.image.length > 10) v10Data.image.pop();
    }

    // GIF & Video Arşivi (Maksimum 10 adet)
    if (attachmentUrl && isVideoOrGif) {
        v10Data.media.unshift({ ...baseData, media: attachmentUrl });
        if (v10Data.media.length > 10) v10Data.media.pop();
    }

    snipesV10.set(message.channel.id, v10Data);
});

    
// --- 5. KOMUTLAR ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // --- SPAM KORUMASI BAŞLANGICI ---
    // 1. Kurucu Kilidi: Sen ne kadar hızlı yazarsan yaz, bot seni asla engellemez.
    if (message.author.id === '983015347105976390') {
        // Kurucu muaf, direkt geçiş veriyoruz
    } else if (spamKorumaAktif) {
        const currentTime = Date.now();
        const userId = message.author.id;
        
        if (!messageLog.has(userId)) {
            messageLog.set(userId, []);
        }

        const userMessages = messageLog.get(userId);
        userMessages.push(currentTime);

        // Sadece son 4 mesajın süresini kontrol etmek için filtrele (Son 3 saniyedeki mesajlar)
        const recentMessages = userMessages.filter(timestamp => currentTime - timestamp < 3000);
        messageLog.set(userId, recentMessages);

        // 3 saniye içinde 4 veya daha fazla mesaj yazıldıysa spam olarak algıla
        if (recentMessages.length >= 4) {
            try {
                // Kullanıcıya sunucuda Yönetici yetkisi varsa onu da cezalandırma (Moderatörler muaf kalır)
                if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    
                    // 5 Dakika (300.000 ms) boyunca sustur (Timeout)
                    await message.member.timeout(5 * 60 * 1000, "Ace System • Sohbeti Spam ile Sabote Etmek");
                    
                    // Attığı spam mesajlarını temizle
                    await message.channel.bulkDelete(recentMessages.length).catch(() => {});

                    const spamEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('🛡️ Ace System • Spam Engellendi')
                        .setDescription(`⚠️ ${message.author} (**${message.author.username}**), chati çok hızlı kullandığın için **5 dakika** susturuldun.\n> Saniye sınırı aşıldığı için gönderdiğin son mesajlar temizlendi.`)
                        .setTimestamp();

                    return message.channel.send({ embeds: [spamEmbed] });
                }
            } catch (err) {
                console.error("Spam cezası uygulanırken hata oluştu (Yetki yetersiz olabilir):", err);
            }
        }
    }
    // --- SPAM KORUMASI BİTİŞİ ---

    // Eğer mesajı atan kişi hedef listesindeyse rastgele yanıt ver
    if (targetedUsers.has(message.author.id)) {
        const randomMsg = randomReplies[Math.floor(Math.random() * randomReplies.length)];
        
        // Sadece yanıt ver ve kodu kesme
        message.reply(randomMsg).catch(err => console.error("Yanıt atılamadı:", err));
    }

// 1. SONSUZLUK KONTROLÜ (Prefix kontrolünden ÖNCE olmalı)
if (sonsuzlukAktif && message.mentions.has('983015347105976390') && message.author.id !== '983015347105976390') {
    
    // 1. KADEME: Cürret Etme Aşaması
    const stage1Embed = new EmbedBuilder()
        .setColor('#00AEFF')
        .setTitle('🤞 Sonsuzluk Sınırı İhlal Edildi!')
        .setDescription(`**"${message.author.username}, sen bana dokunmaya mı cürret ettin?"**\n\n> Aranızda sonsuz bir mesafe var. Yaklaşabileceğini mi sandın?`)
        .setImage('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NGFoZGk2YjRkdWNidTJoZDQ4YXN4eTdkN3hnNHM3OXpyYjFtbngwZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/iNPNqI81MvDQ4D4n6D/giphy.gif')
        .setFooter({ text: 'Sonsuzluk dokunulmazlığı aktif...' })
        .setTimestamp();

    // İlk uyarı mesajını gönderiyoruz
    const sentMessage = await message.reply({ embeds: [stage1Embed] });

    // 3 Saniye Sonra Bedel Ödetme Aşaması (2. Kademe + Timeout)
    setTimeout(async () => {
        let timeoutUygulandi = true;
        
        // Etiketleyen kişi sunucuda bir yönetici değilse ve botun rolü yetiyorsa timeout at
        if (message.member && !message.member.permissions.has(PermissionsBitField.Flags.Administrator) && message.member.moderatable) {
            try {
                // 10 Saniyelik Susturma (10 * 1000 milisaniye)
                await message.member.timeout(10 * 1000, "Sonsuzluğa dokunmaya çalışmanın bedeli!");
            } catch (err) {
                console.error("Sonsuzluk cezası verilirken hata çıktı:", err);
                timeoutUygulandi = false;
            }
        } else {
            timeoutUygulandi = false; // Yönetici veya bottan üstün rolse cezayı pas geç
        }

        // 2. KADEME: Bedel Ödetme Aşaması
        const stage2Embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('⚡ Bedelini Ödeyeceksin.')
            .setDescription(`**"${message.author.username}, sonsuzluğun sınırlarını zorlamanın cezası ağırdır."**\n\n${timeoutUygulandi ? '➔ Lanetli enerji çarpması nedeniyle **10 saniye** boyunca felç oldun (Susturuldun)!' : '➔ *Özel Dereceli bir büyücü (Yönetici) olduğun için fiziksel olarak etkilenmedin ama sonsuzluğun ezici baskısını tüm ruhunla hissettin...*'}`)
            .setImage('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3N2dza3FnNHd5cWV4YnNkdmVvZ3gwcDJib2s5NzkzNHdrbmt0YjVjOCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/W13QzeK4A03AP540o9/giphy.gif')
            .setFooter({ text: 'Mesafe asla kapanmaz.' })
            .setTimestamp();

        // Mesajı yeni gif ve metinle güncelliyoruz
        await sentMessage.edit({ embeds: [stage2Embed] }).catch(() => {});
    }, 5000); // 3 saniye sonra ikinci aşamaya geçer

    return; // Botun alt satırlardaki diğer normal komutları çalıştırmasını engellemek için durduruyoruz
}

    // 2. PREFİX KONTROLÜ (Buradan aşağısı sadece komutlar için)
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    const yetkiVarMi = (rolID) => {
        return message.author.id === message.guild.ownerId || message.author.id === OWNER_ID || message.member.roles.cache.has(rolID);
    };

if (command === 'yardım') {
    const mainEmbed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setAuthor({ 
            name: `${client.user.username} • Gelişmiş Yardım Menüsü`, 
            iconURL: client.user.displayAvatarURL() 
        })
        .setThumbnail(message.guild.iconURL({ dynamic: true }))
        .setDescription(
            `### 🛡️ Ace System'e Hoş Geldin!\n` +
            `> Sunucunun güvenliğini sağlamak, düzeni korumak ve eğlenceyi en üst seviyeye çıkarmak için tasarlandım.\n` +
            `> Kategoriler arasında geçiş yapmak için aşağıdaki **butonları** kullanabilirsin.\n\n` +
            `📊 **Anlık İstatistikler:**\n` +
            `🤖 **Gecikme Süresi:** \`${client.ws.ping}ms\`\n` +
            `👥 **Toplam Üye:** \`${message.guild.memberCount}\` Kullanıcı\n` +
            `🔗 **Prefix:** \`a!\``
        )
        .setFooter({ 
            text: `🛡️ Ace System • Sorgulayan: ${message.author.username}`, 
            iconURL: message.author.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('eglence').setLabel('Eğlence').setEmoji('🎭').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('moderasyon').setLabel('Moderasyon').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('yonetim').setLabel('Yönetim').setEmoji('⚙️').setStyle(ButtonStyle.Secondary)
    );

    // Sahip butonu (Sadece senin ID'ne özel)
    if (message.author.id === '983015347105976390') {
        buttons.addComponents(
            new ButtonBuilder()
                .setCustomId('aceozel')
                .setLabel('Ace Özel')
                .setEmoji('👑')
                .setStyle(ButtonStyle.Danger)
        );
    }

    async function sendHelp() {
        try {
            const msg = await message.reply({ embeds: [mainEmbed], components: [buttons] });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 60000
            });

            collector.on('collect', async i => {
                const embed = new EmbedBuilder()
                    .setColor('#2b2d31')
                    .setTimestamp()
                    .setFooter({ text: `🛡️ Ace System • Kategori: ${i.component.label}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

               if (i.customId === 'eglence') {
    embed.setTitle('🎭 Üye & Eğlence Sistemi')
         .setDescription(
             `💬 **Eğlence & Etkileşim Komutları:**\n\n` +
             `❤️ \`a!aşkölç\` ➔ Etiketlediğin kişiyle aşk yüzdenizi ölçer.\n` +
             `💍 \`a!evlen\` / \`a!boşan\` ➔ Sunucudaki bir üyeyle evlenmenizi/boşanmanızı sağlar.\n` +
             `📜 \`a!evlilik\` ➔ Mevcut evlilik durumunu ve partnerini gösterir.\n` +
             `👾 \`a!dc\` ➔ Sunucuda Bir Doğruluk-Cesaretlik Oyunu Başlat\n` +
             `🐱 \`a!kedisev\` ➔ Rastgele tatlı bir kedi resmi gönderir.\n` +
             `💥 \`a!patlat\` ➔ Eğlence amaçlı kanalda patlama simülasyonu yapar.\n` +
             `🎲 \`a!zarat\` / \`a!yazıtura\` ➔ Çift zar fırlatır veya yazı-tura oynatır.\n` +
             `📏 \`a!kaçcm\` ➔ Tamamen eğlence amaçlı şans ölçümü yapar.\n` +
             `🫂 \`a!sarıl\` / \`a!öp\` / \`a!tokat\` ➔ Belirttiğin üyeye sarılır, öper veya tokat atarsın.\n` +
             `💘 \`a!sev\` / \`a!döv\` / \`a!seviş\` ➔ Belirttiğin üyeyi Sever, Döver veya Sevişirsin.\n` +
             `🔞 \`a!sik\` ➔ Hedeflediğin kullanıcıyı ŞAP ŞAP etkisiz hale getirir.\n` +
             `⚔️ \`a!duello\` ➔ Sunucudaki bir üyeye ölümüne düello teklif edersin.\n` +
             `⚖️ \`a!racon\` ➔ Etiketlediğin kişiye ağır abi sözleriyle racon keser.\n` +
             `🚨 \`a!fbi\` ➔ Şüpheli hareketler yapan üyenin evine FBI baskını düzenler.\n` +
             `🔮 \`a!aura\` ➔ Bir üyenin aura ve ortam enerjisi (vibe) oranını kontrol eder.\n` +
             `✖️ \`a!wasted\` ➔ Hedeflediğin kullanıcıyı acımadan harcar (GTA tarzı).\n` +
             `📊 \`a!stat\` / \`a!leaderstat\` ➔ Sunucu içi aktiflik verilerini ve liderlik tablosunu gösterir.`
         );
}
                else if (i.customId === 'moderasyon') {
                    embed.setTitle('🛡️ Moderasyon & Ceza Sistemi')
                         .setDescription(
                             `🔨 **Sunucu İntizamı İçin Gerekli Komutlar:**\n\n` +
                             `⚠️ \`a!uyarı\` ➔ Kuralları çiğneyen üyeye resmi uyarı ekler.\n` +
                             `🥾 \`a!kick\` ➔ Belirtilen üyeyi sunucudan sağ tık atmadan tekmeler.\n` +
                             `🚫 \`a!ban\` / \`a!unban\` ➔ Üyeyi sunucudan yasaklar veya yasağını kaldırır.\n` +
                             `🔇 \`a!mute\` / \`a!unmute\` ➔ Üyenin yazı kanallarındaki konuşma yetkisini yönetir.\n` +
                             `🔊 \`a!vmute\` / \`a!unvmute\` ➔ Üyenin ses kanallarındaki mikrofonunu kapatır/açar.`
                         );
                }
                else if (i.customId === 'yonetim') {
                    embed.setTitle('⚙️ Yönetim & Altyapı Sistemi')
                         .setDescription(
                             `🛠️ **Sunucu Yönetimi ve Log Komutları:**\n\n` +
                             `📂 \`a!sicil\` ➔ Etiketlenen üyenin geçmiş ceza kayıtlarını listeler.\n` +
                             `🗑️ \`a!sil\` ➔ Belirtilen miktarda mesajı kanaldan anında temizler.\n` +
                             `🔐 \`a!spamkoruma (aç-kapat)\` ➔ Spam Korumasını Açıp Kapatırsınız.\n` +
                             `🎯 \`a!snipe\` ➔ Kanaldan son silinen mesajı yakalar ve içeriğini gösterir.`
                         );
                }
                else if (i.customId === 'aceozel') {
                    embed.setTitle('👑 Ace Özel • Sınırsız Güç Menüsü')
                         .setColor('#ff0000')
                         .setDescription(
                             `🔮 **Gojo Satoru Teknikleri & Kurucu Yetkileri:**\n\n` +
                             `🤞 \`a!domainexpansion\` ➔ Alan Genişletmesi: Sonsuz Boşluk'u açarak kanalı kilitler.\n` +
                             `❌ \`a!domainclose\` ➔ Aktif olan Alan Genişletmesini çözer ve kanalı açar.\n` +
                             `⚡ \`a!blackflash\` ➔ Hedefe Kara Şimşek çaktırır (Yönetici değilse 5 Dk Mute).\n` +
                             `🟣 \`a!hollow\` ➔ Kademeli sanal kütle patlaması başlatır (7 Gün Mute).\n` +
                             `🟣 \`a!hollowpurple\` ➔ Kanaldaki Her Şeyi Lanetler/Siler.\n` +
                             `🛡️ \`a!sonsuzluk\` ➔ Pasif korumayı açar. Seni etiketleyenler 10 Saniye ceza yer.\n` +
                             `👁️ \`a!sixeyes\` ➔ Altı Göz yeteneğiyle hedefin tüm profil ve lanetli verilerini çözer.\n` +
                             `☠️ \`a!lanet\` ➔ Etiketlediğin kullanıcıyı Lanetle Lanetten Kurtuluş Yoktur.\n` +
                             `✨ \`a!iyileştir\` ➔ Ters Lanetli Teknik ile hedefin tüm Ban ve Mute cezalarını sıfırlar.\n` +
                             `🎩 \`a!snipeV10\` ➔ Silinen Bütün Fotoğrafları, Videoları, Mesajları Görmeyi Sağlar.\n` +
                             `💔 \`a!zayır\` ➔ istediğin kişinin evliliğini boz NaoyaZenin MİSALİ.\n` +
                             `💝 \`a!zevlendir\` ➔ istediğin kişiyi evlendir.\n` +
                             `💼 \`a!ceza-menü\` ➔ Gelişmiş moderasyon ceza takip arayüzünü açar.`
                         );
                }

                await i.update({ embeds: [embed] }).catch(() => {});
            });

            collector.on('end', () => {
                const disabledButtons = buttons.components.map(b => 
                    ButtonBuilder.from(b).setDisabled(true)
                );

                const disabledRow = new ActionRowBuilder().addComponents(disabledButtons);

                msg.edit({ components: [disabledRow] }).catch(() => {});
            });

        } catch (err) {
            console.error("Yardım komutu patladı:", err);
        }
    }

    sendHelp();
}

    if (command === 'kurallar') {
    // Sadece Yöneticilerin kullanabilmesi için güvenlik kontrolü (isteğe bağlı)
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("❌ Bu komutu sadece yöneticiler kullanabilir.");
    }

    const rulesEmbed = new EmbedBuilder()
        .setColor('#2b2d31') // Discord'un koyu temasına uyumlu arka plan rengi
        .setTitle('📜 Sunucu Kuralları / V O İ D Yönetimi Sunar.')
        .setDescription(`📌 @everyone Herkesin uyması gereken kurallar aşağıda listelenmiştir. İhlal edenlere ceza uygulanır.\n\n` +
        
        `**🧑‍🤝‍🧑 GENEL SAYGI**\n` +
        `🔴 1. Herkese saygılı olun. Hakaret, küfür, alay yasaktır.\n` +
        `🟠 2. Irk, din, cinsiyet ayrımı veya aşağılayıcı dil kullanmak yasaktır.\n` +
        `🟡 3. Yetkililere karşı gelmek, emir sorgulamak yasaktır.\n` +
        `🔴 4. Sunucu kurucusuna saygısızlık doğrudan jail veya ban sebebidir.\n\n` +

        `**💬 MESAJ DAVRANIŞLARI**\n` +
        `🔵 5. Flood (tekrar mesaj), spam, gereksiz emoji/caps kullanımı yasaktır.\n` +
        `🟣 6. Kanalın amacı dışında konuşmak yasaktır.\n` +
        `🟡 7. Bot komutlarını spamlamak, trol amaçlı kullanmak yasaktır.\n\n` +

        `**📢 REKLAM VE GİZLİLİK**\n` +
        `🟤 8. Reklam yapmak (link, sosyal medya, davet vs.) yasaktır.\n` +
        `⚫ 9. DM yoluyla rahatsızlık vermek veya reklam yapmak yasaktır.\n` +
        `🔴 10. Kişisel bilgi ifşası (isim, fotoğraf, adres, IP Kayıt Almak vb.) kesinlikle yasaktır.\n\n` +

        `**🔊 SES KANALLARI**\n` +
        `🟣 11. Ses kanallarında bağırmak, ses bozan programlar kullanmak yasaktır.\n` +
        `🟢 12. Müzik botunu kötüye kullanmak, diğer üyeleri rahatsız etmek yasaktır.\n\n` +

        `**🔞 UYGUNSUZ VE YASA DIŞI İÇERİK**\n` +
        `🔴 13. +18 içerik, kan, korku, mide bulandırıcı görsel ve yazılar yasaktır.\n` +
        `⚫ 14. Crack, hile, yasa dışı yazılım paylaşımı kesinlikle yasaktır.\n` +
        `⚫ 15. Bot açıklarını kötüye kullanmak, sistemleri suistimal etmek yasaktır.\n\n` +

        `**🎭 TROL VE ROL SİSTEMİ**\n` +
        `🟠 16. Trollük yapmak, provoke etmek yasaktır.\n` +
        `🟡 17. Trol profil fotoğrafı Trol İsim Gibi öğeler kullanmak yasaktır.\n` +
        `🔵 18. Yetki istemek, rol dilenmek Yetkilerinizi Kötü Amaçlı Kullanmak yasaktır.\n` +
        `🟢 19. Yetkiniz Varsa İzinsiz Rollere Ellemek, İsim Değiştirmek vb. Kesinlikte yasaktır.\n\n` +

        `**📢 TOPLUMSAL TARTIŞMA**\n` +
        `🟣 20. Siyasi/dini tartışmalar, toplumu bölücü ifadeler yasaktır.\n` +
        `🔵 21. Toplum hassasiyetlerine saygı gösterilmelidir.\n` +
        `⚪ 22. Özel Meselelerinizi, Şahsi Kavgaları Sunucuya Yansıtmak Yasaktır.\n\n` +

        `**✅ ONAY:**\n` +
        `📌 Kuralları okumamış olmak mazeret değildir. Tüm üyeler Ve yetkililer Kuralları Okumuş Sayılır!\n\n` +

        `**🪪 YÖNETİM**\n` +
        `📌 Yönetim, gerekli gördüğü durumlarda kurallarda değişiklik yapma ve ek kural getirme hakkını saklı tutar.`)
        .setFooter({ text: 'V O İ DYönetimi', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    // Kurallar kanalına everyone atarak mesajı gönderiyoruz
    await message.channel.send({ content: '@everyone', embeds: [rulesEmbed] });
    
    // Komutu yazanın kendi gönderdiği mesajı siliyoruz ki kanal temiz dursun
    await message.delete().catch(() => {});
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

   if (command === 'snipev10') {
    // Sadece senin ID'ne özel kurucu kilidi
    if (message.author.id !== '983015347105976390') {
        return message.reply("❌ **Ace Özel:** Bu sınırsız arşiv komutunu sadece kurucum kullanabilir.");
    }

    // Yeni snipesV10 map'inden verileri çekiyoruz
    const channelSnipes = snipesV10.get(message.channel.id) || { text: [], image: [], media: [] };
    const totalLogs = channelSnipes.text.length + channelSnipes.image.length + channelSnipes.media.length;

    if (totalLogs === 0) {
        return message.reply("🔮 Bu kanalda hafızaya alınmış silinen bir veri bulunamadı.");
    }

    // Ana Embed (İlk açılışta genel durumu özetler)
    const mainEmbed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setAuthor({ name: `${client.user.username} • Ace Sınırsız Snipe Arşivi`, iconURL: client.user.displayAvatarURL() })
        .setDescription(
            `### 👁️ Kanal Geçmişi Çözülüyor (Her Kategoride Son 10 Kayıt)\n` +
            `> Şu anda bu kanalda silinmiş toplam **${totalLogs}** adet aktif kayıt hafızada tutuluyor.\n` +
            `> Aşağıdaki butonları kullanarak kategorilere göre son silinen verileri inceleyebilirsin, Reis.\n\n` +
            `📝 **Metin Mesajları:** Silinen chat yazıları (${channelSnipes.text.length}/10)\n` +
            `📸 **Fotoğraflar:** Gönderilip silinen görseller (${channelSnipes.image.length}/10)\n` +
            `🎬 **GIF & Videolar:** Hareketli medyalar ve klipler (${channelSnipes.media.length}/10)`
        )
        .setFooter({ text: `🛡️ Ace System • Sorgulayan: ${message.author.username}` })
        .setTimestamp();

    // Kategori Butonları
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('snipe_text').setLabel('Mesajlar').setEmoji('📝').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('snipe_image').setLabel('Fotoğraflar').setEmoji('📸').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('snipe_media').setLabel('GIF & Videolar').setEmoji('🎬').setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.reply({ embeds: [mainEmbed], components: [buttons] });

    const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id, // Sadece sen basabilirsin
        time: 120000 // 2 dakika aktif kalır
    });

    collector.on('collect', async i => {
        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTimestamp()
            .setFooter({ text: `🛡️ Ace System • SnipeV10 Veri Çözümü` });

        // --- 1. METİN MESAJLARI KATEGORİSİ ---
        if (i.customId === 'snipe_text') {
            embed.setTitle('📝 Son Silinen Metin Mesajları');
            let textLog = "";

            channelSnipes.text.forEach((s, index) => {
                textLog += `**[${index + 1}]** ${s.author} ➔ ${s.content}\n`;
            });

            embed.setDescription(textLog || "*Bu kategoride silinmiş metin mesajı bulunamadı.*");
            await i.update({ embeds: [embed] }).catch(() => {});
        }

        // --- 2. FOTOĞRAFLAR KATEGORİSİ ---
        else if (i.customId === 'snipe_image') {
            embed.setTitle('📸 Son Silinen Fotoğraflar');
            const imageSnipes = channelSnipes.image;

            if (imageSnipes.length === 0) {
                embed.setDescription("*Bu kanalda silinmiş fotoğraf bulunamadı.*");
                await i.update({ embeds: [embed] }).catch(() => {});
            } else {
                let imgList = "**Silinen Fotoğraf Sahipleri:**\n";
                imageSnipes.forEach((s, idx) => {
                    imgList += `**[${idx + 1}]** ${s.author.tag} (<t:${Math.floor(s.timestamp / 1000)}:R>)\n`;
                });
                
                embed.setDescription(imgList + `\n*Aşağıda en son silinen fotoğraf gösteriliyor:*`);
                embed.setImage(imageSnipes[0].image); // En son silinen fotoğrafı gösterir
                await i.update({ embeds: [embed] }).catch(() => {});
            }
        }

        // --- 3. GIF & VİDEOLAR KATEGORİSİ ---
        else if (i.customId === 'snipe_media') {
            embed.setTitle('🎬 Son Silinen GIF & Videolar');
            const mediaSnipes = channelSnipes.media;

            if (mediaSnipes.length === 0) {
                embed.setDescription("*Bu kanalda silinmiş GIF veya Video bulunamadı.*");
                await i.update({ embeds: [embed] }).catch(() => {});
            } else {
                let mediaList = "**Silinen Medya Sahipleri:**\n";
                mediaSnipes.forEach((s, idx) => {
                    mediaList += `**[${idx + 1}]** ${s.author.tag} (<t:${Math.floor(s.timestamp / 1000)}:R>)\n`;
                });

                embed.setDescription(mediaList + `\n*Discord kısıtlamaları sebebiyle videolar link olarak listelenir, en son silinen medyaya aşağıdaki linkten veya embedden ulaşabilirsin:*\n🔗 [Medya Linki](${mediaSnipes[0].media})`);
                embed.setImage(mediaSnipes[0].media); // Eğer GIF ise oynatır
                await i.update({ embeds: [embed] }).catch(() => {});
            }
        }
    });

    collector.on('end', () => {
        const disabledButtons = buttons.components.map(b => 
            ButtonBuilder.from(b).setDisabled(true)
        );
        const disabledRow = new ActionRowBuilder().addComponents(disabledButtons);
        msg.edit({ components: [disabledRow] }).catch(() => {});
    });
}

    if (command === 'spam-koruması' || command === 'spamkoruma') {
    // Sadece Yöneticiler (Administrator) kullanabilir
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("❌ Bu komutu kullanabilmek için **Yönetici** yetkisine sahip olmalısın.");
    }

    const args = message.content.split(' ').slice(1);
    const secim = args[0]?.toLowerCase();

    if (!secim || (secim !== 'aç' && secim !== 'kapat')) {
        const basarisizEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setDescription(`⚙️ **Spam Koruması Sistemi**\n\nSistemi yönetmek için lütfen bir argüman belirtin:\n➔ \`a!spamkoruma aç\`\n➔ \`a!spamkoruma kapat\``);
        return message.reply({ embeds: [basarisizEmbed] });
    }

    if (secim === 'aç') {
        if (spamKorumaAktif) return message.reply("🛡️ Spam koruması sistemi sunucuda zaten **aktif** durumda.");
        spamKorumaAktif = true;
        
        const acikEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🛡️ Ace System • Sistem Güncellendi')
            .setDescription('✅ **Spam koruma sistemi başarıyla aktif edildi.** Üyeler chati sabote edemeyecek.')
            .setTimestamp();
        return message.reply({ embeds: [acikEmbed] });
    }

    if (secim === 'kapat') {
        if (!spamKorumaAktif) return message.reply("⚠️ Spam koruması sistemi sunucuda zaten **kapalı** durumda.");
        spamKorumaAktif = false;
        
        const kapaliEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🛡️ Ace System • Sistem Güncellendi')
            .setDescription('❌ **Spam koruma sistemi devre dışı bırakıldı.** Chatta hız sınırı kaldırıldı.')
            .setTimestamp();
        return message.reply({ embeds: [kapaliEmbed] });
    }
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

   if (command === 'uyarı') {
   

    // 1. YETKİ KONTROLÜ (Komutu kullanan kişi yetkili mi?)
    const yetkiliRolID = "1501944298076242073";
    const yetkiliMi = message.member.roles.cache.has(yetkiliRolID) || 
                      message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                      message.author.id === '983015347105976390'; // Sen her zaman kullanabilmelisin

    if (!yetkiliMi) {
        return message.reply("❌ Bu işlemi yapmak için gerekli yetkiye sahip değilsin.");
    }

    // 2. HEDEF KULLANICIYI BULMA
    const target = message.mentions.users.first() || client.users.cache.get(args[0]);
    if (!target) {
        return message.reply("❌ Lütfen uyarmak istediğin kullanıcıyı etiketle veya ID gir.");
    }

    // 3. SEBEP KONTROLÜ
    const sebep = args.slice(1).join(' ');
    if (!sebep) {
        return message.reply("❌ Uyarı için bir sebep belirtmelisin. Kullanım: `!uyarı @kullanıcı <sebep>`");
    }

    // Botu uyarmayı engelleme (Veritabanı şişmesin diye bunu tutmanı öneririm)
    if (target.bot) return message.reply("❌ Botlara uyarı veremezsin!");

    try {
        // 4. ADIM: Sicil Veritabanına Kaydetme
        const uyariKaydi = await new Sicil({
            kullaniciID: target.id,
            yetkiliID: message.author.id,
            islem: 'Uyarı',
            sebep: sebep,
            tarih: new Date(),
            sure: 'Süresiz'
        }).save();

        // 5. ADIM: Embed ve Buton
        const embed = new EmbedBuilder()
            .setColor('#e67e22')
            .setAuthor({ name: `${target.username} Adlı Kullanıcı Uyarıldı!`, iconURL: target.displayAvatarURL() })
            .setDescription(`⚠️ <@${target.id}> adlı kullanıcıya bir uyarı verildi.\n\n> **Yetkili:** <@${message.author.id}>\n> **Sebep:** *${sebep}*`)
            .setFooter({ text: '🛡️ Ace System • İşlemi geri almak için butonu kullanın.', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`uyari_kaldir_${uyariKaydi._id}`)
                .setLabel('Yanlış Uyarıyı Kaldır')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger)
        );

        const uyariMesaji = await message.reply({ embeds: [embed], components: [row] });

        // 6. ADIM: Collector (İptal Etme Sistemi)
        const filter = (i) => i.customId === `uyari_kaldir_${uyariKaydi._id}` && i.user.id === message.author.id;
        const collector = uyariMesaji.createMessageComponentCollector({ filter, time: 120000 });

        collector.on('collect', async (i) => {
            await Sicil.findByIdAndDelete(uyariKaydi._id);
            const iptalEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setDescription(`✅ <@${target.id}> adlı kullanıcıya verilen uyarı **<@${i.user.id}>** tarafından sicilden silindi.`)
                .setTimestamp();

            await i.update({ embeds: [iptalEmbed], components: [] });
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('uyari_suresi_doldu')
                        .setLabel('Geri Alma Süresi Doldu')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
                uyariMesaji.edit({ components: [disabledRow] }).catch(() => {});
            }
        });

    } catch (err) {
        console.error(err);
        return message.reply("❌ Veritabanına kayıt işlenirken bir hata oluştu. MongoDB bağlantını kontrol et kanka.");
    }
}
    
  // ====================== ACE SYSTEM: EĞLENCE & ETKİLEŞİM KOMUTLARI ======================

    // === SEV KOMUTU ===
if (command === 'sev') {
    const target = message.mentions.users.first();
    if (!target) return message.reply("❌ Kimi seveceğini seçmelisin, kendi kendini mi şımartacaksın?");
    if (target.id === message.author.id) return message.reply("❌ Kendi kendini sevmek güzeldir ama bence bir başkasını etiketle, usta.");

    // Verdiğin GIF'leri listeye aldık
    const sevGifler = [
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMndrcTA5cXd6YWtrZHJkMDI2YndoNnVhNzB2dDNidG9pdXUxZHk5OSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1JmGiBtqTuehfYxuy9/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMndrcTA5cXd6YWtrZHJkMDI2YndoNnVhNzB2dDNidG9pdXUxZHk5OSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xR5cPyPoL5HVXSphqA/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2JwNDRpZnRmZXh1eXRuZGU0MjhiMnN2amgwbDluZnBjbXdtbWFoYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/CNUb51EbTxuRG/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2JwNDRpZnRmZXh1eXRuZGU0MjhiMnN2amgwbDluZnBjbXdtbWFoYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ythHeq4Qgx2De/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2JwNDRpZnRmZXh1eXRuZGU0MjhiMnN2amgwbDluZnBjbXdtbWFoYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/FgWNX7NK6SpzqwmOWe/giphy.gif'
        
    ];
    // Listeden rastgele bir GIF seçiyoruz
    const rastgeleGif = sevGifler[Math.floor(Math.random() * sevGifler.length)];

    const sevEmbed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('❤️ Sevgi Yumağı!')
        .setDescription(`<@${message.author.id}>, <@${target.id}> kullanıcısını pamuklara sardı ve çok tatlı bir şekilde sevdi! 🥰`)
        .setImage(rastgeleGif)
        .setFooter({ text: '🛡️ Ace System', iconURL: message.client.user.displayAvatarURL() })
        .setTimestamp();

    return message.reply({ embeds: [sevEmbed] });
}

// === DÖV KOMUTU ===
if (command === 'döv') {
    const target = message.mentions.users.first();
    if (!target) return message.reply("❌ Kimi döveceğini seçmelisin, havayı mı yumruklayacaksın?");
    if (target.id === message.author.id) return message.reply("❌ Kendi kendini mi döveceksin? Kendine zarar verme usta...");

    // Verdiğin GIF'leri listeye aldık
    const dovGifler = [
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMndrcTA5cXd6YWtrZHJkMDI2YndoNnVhNzB2dDNidG9pdXUxZHk5OSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1JmGiBtqTuehfYxuy9/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHI2N3BkcGE5OWgzMXVsa2M3czg5dHRibDRuOGxsOWZ5eXExcmNoaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/MYTaNoPDtyQGXnCUJQ/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnV5dHJhNjM0enNvdzdhOTh2d3U2NHhwZXdvcmJlZHQ4czE3Y3RscCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/DuVRadBbaX6A8/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZHhsM3N5cXh3aW03MzN6c2twaWo1c2RnbmRmOGh6dGdzNHFhdzJ4NCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/rMSjN5eXy8238yChf5/giphy.gif'
    ];
    // Listeden rastgele bir GIF seçiyoruz
    const rastgeleGif = dovGifler[Math.floor(Math.random() * dovGifler.length)];

    const dovEmbed = new EmbedBuilder()
        .setColor('#c0392b')
        .setTitle('🥊 Mahalle Kavgası!')
        .setDescription(`<@${message.author.id}>, <@${target.id}> adlı kullanıcıyı evire çevire dövdü! Hastanelik etti! 🤕`)
        .setImage(rastgeleGif)
        .setFooter({ text: '🛡️ Ace System', iconURL: message.client.user.displayAvatarURL() })
        .setTimestamp();

    return message.reply({ embeds: [dovEmbed] });
}

// === SEVİŞ KOMUTU ===
if (command === 'seviş') {
    const target = message.mentions.users.first();
    if (!target) return message.reply("❌ Kimi... neyse, yanına partner olarak birini etiketlemelisin usta.");
    if (target.id === message.author.id) return message.reply("❌ Kendi kendinle mi? O kadar da yalnız olma be usta, üzülürüz...");

    // Verdiğin GIF'leri listeye aldık
    const sevisGifler = [
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3YzJ4Y3U4b2JiMGlrcDl0cGhtMzdjdnJzOHc2aXdrc2dmaXJqMGpicSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/5cdY3sS1BvOPC/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3YzJ4Y3U4b2JiMGlrcDl0cGhtMzdjdnJzOHc2aXdrc2dmaXJqMGpicSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/qkPrAGqmmWSbK/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3N2Zsdzd2cGsyeXVoa2ZzZms3MnU4MnE5YzYzODdwcjByYTd6bzFkdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/DpN4VC7Z5jZeg7sLc2/giphy.gif'
    ];
    // Listeden rastgele bir GIF seçiyoruz
    const rastgeleGif = sevisGifler[Math.floor(Math.random() * sevisGifler.length)];

    const sevisEmbed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('🔞 Ortam Alev Aldı!')
        .setDescription(`🔥 <@${message.author.id}> ve <@${target.id}> arasındaki çekim tavan yaptı! Odadan garip sesler geliyor...`)
        .setImage(rastgeleGif)
        .setFooter({ text: '🛡️ Ace System • +18', iconURL: message.client.user.displayAvatarURL() })
        .setTimestamp();

    return message.reply({ embeds: [sevisEmbed] });
}

if (command === 'duello') {
    const target = message.mentions.users.first();
    if (!target) return message.reply("❌ Düello yapacağın birini etiketlemelisin!");
    if (target.id === message.author.id) return message.reply("❌ Kendi kendine düello yapamazsın, akıl sağlığını koru.");

    const kazanan = Math.random() < 0.5 ? message.author : target;
    const kaybeden = kazanan.id === message.author.id ? target : message.author;
    
    // Düelloya biraz RPG havası katmak için rastgele silahlar
    const silahlar = ['Kanalizasyon Borusuyla', 'Kelebek Bıçağıyla', 'Tek Atışta', 'Racon Keserek', 'Gözleriyle'];
    const kullanılanSilah = silahlar[Math.floor(Math.random() * silahlar.length)];

    const duelloGifler = [
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExamx0NnlibTJ6eDF4NHN3Y2h5eXk0c2g2cTZueWFraHNidHBtOTB5eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Phlda4eDmA8FX5BaLj/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Ymc5ZHN4ZGNoNmhwNWwwdmRwczBlZ3p0NHNycWVpYjJ1dWFpaWpvbiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/QUKqSLmE7vmZP2PkZk/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Ymc5ZHN4ZGNoNmhwNWwwdmRwczBlZ3p0NHNycWVpYjJ1dWFpaWpvbiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/BGZTfUlsBmgaPLmKiN/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHI2N3BkcGE5OWgzMXVsa2M3czg5dHRibDRuOGxsOWZ5eXExcmNoaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/NuiEoMDbstN0J2KAiH/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeGp0aXc3Nmg1MzhnMzhmY2F0amZtZnU2cmhpcWF6OGlxZGI3cDFhMSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vXyIMuWbGTMtO/giphy.gif'
    ];
    const rastgeleGif = duelloGifler[Math.floor(Math.random() * duelloGifler.length)];

    const duelloEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('⚔️ Düello Meydanı')
        .setDescription(`**<@${kazanan.id}>**, rakibi **<@${kaybeden.id}>** kullanıcısını **${kullanılanSilah}** tek hamlede yere serdi!`)
        .setImage(rastgeleGif)
        .setFooter({ text: '🛡️ Ace System • Düello bitti.', iconURL: message.client.user.displayAvatarURL() });

    return message.reply({ embeds: [duelloEmbed] });
}

if (command === 'tokat') {
    const target = message.mentions.users.first();
    if (!target) return message.reply("❌ Kimi tokatlayacağını seçmelisin.");
    
    const hasar = Math.floor(Math.random() * 90) + 10; // 10-100 arası hasar

    const tokatGifler = [
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXFkcGl2aG5lNDJ0NWgzbHYxcTdnbzI4ODcyYm1zOWdmd3pqeHY4MiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/W13QzeK4A03AP540o9/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dmtuOGYyYjA0Z2I2cWJpbGEybWlqeG10ejI4NTI2enJnbjN1emg1OCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/p3ICcrHjUQo47BMdkG/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cjBnd3B3ZnhyYnVnM3djaGRnaTU3MHgzcW1ibzQxdGJ3OXE5YXUxaCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3fNmJ20ErpkjK/giphy.gif'
    ];
    const rastgeleGif = tokatGifler[Math.floor(Math.random() * tokatGifler.length)];

    const tokatEmbed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('✋ Osmanlı Tokadı!')
        .setDescription(`<@${message.author.id}>, <@${target.id}> adlı kullanıcıya öyle bir tokat attı ki! \n> **Verilen Hasar:** \`${hasar} HP\` • Feleği şaştı!`)
        .setImage(rastgeleGif)
        .setFooter({ text: '🛡️ Ace System', iconURL: message.client.user.displayAvatarURL() });

    return message.reply({ embeds: [tokatEmbed] });
}

if (command === 'öp') {
    const target = message.mentions.users.first();
    if (!target) return message.reply("❌ Kimi öpeceğini seçmelisin, havayı mı öpeceksin?");
    if (target.id === message.author.id) return message.reply("❌ Kendi kendini mi öpeceksin? Biraz yalnız hissediyoruz galiba...");

    const opGifler = [
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZDFleWo1b2U4OTFwNzd1bmtkaGpxZm4wb21qMDA2MDVjMTkweWY3ciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LVXUEwWACquWRFeKCl/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2JwNDRpZnRmZXh1eXRuZGU0MjhiMnN2amgwbDluZnBjbXdtbWFoYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vaSA1fpCkY06I/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2JwNDRpZnRmZXh1eXRuZGU0MjhiMnN2amgwbDluZnBjbXdtbWFoYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/zkppEMFvRX5FC/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NTZqOThkYTkzMzB3NWxxMndsaXJpNXA0NWhucHpmd2UydTd0M2ZoNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/QGc8RgRvMonFm/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NTZqOThkYTkzMzB3NWxxMndsaXJpNXA0NWhucHpmd2UydTd0M2ZoNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/2fLX7xDEhleyubyBmv/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3emlsYndwOWRhN2toM2cxYm5wOTBpZHpnYmc1amw1M2NydW9haXFkMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/0r4i1pGnSGQsBNrLpm/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3emlsYndwOWRhN2toM2cxYm5wOTBpZHpnYmc1amw1M2NydW9haXFkMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Yu6sCV0314IdOwEkxM/giphy.gif'
    ];
    const rastgeleGif = opGifler[Math.floor(Math.random() * opGifler.length)];

    const opEmbed = new EmbedBuilder()
        .setColor('#ff69b4')
        .setTitle('💋 Şap!')
        .setDescription(`<@${message.author.id}>, <@${target.id}> kullanıcısını yanağından şap diye öptü!`)
        .setImage(rastgeleGif)
        .setFooter({ text: '🛡️ Ace System', iconURL: message.client.user.displayAvatarURL() });

    return message.reply({ embeds: [opEmbed] });
}

if (command === 'sik') {
    const target = message.mentions.users.first();
    if (!target) return message.reply("❌ Kimi sikeceğini seçmelisin, havaya mı sokacaksın?");
    if (target.id === message.author.id) return message.reply("❌ Kendi kendini mi sikeceksin? O kadar da değil be usta...");

    const sikGifler = [
        'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExeDBsMnppNTY3aTY3eGZjbmIzeDB1d3NzNTQ5bWdkdzE1OXA2MGI3ZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IsIyvk7zftw4H2C1Kz/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaXlkM2YwbnRoeHY5a2lqeWtwbWMxNXI1M2c1czhsZ2syaTQyaWozZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/5XZatgyewAMaQ/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaXlkM2YwbnRoeHY5a2lqeWtwbWMxNXI1M2c1czhsZ2syaTQyaWozZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/k3c1eZexGrYaYPYXJg/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaXlkM2YwbnRoeHY5a2lqeWtwbWMxNXI1M2c1czhsZ2syaTQyaWozZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/26xBFZ8XA4g0SVzoc/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExanY4b2dyemRtemNuZXQ4YzU4bGUzMHJhaG1wb2h2a2Z6d2Nja29iYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/OGXilB8foNFIs/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExanY4b2dyemRtemNuZXQ4YzU4bGUzMHJhaG1wb2h2a2Z6d2Nja29iYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/45bM1j8EvHOduYf6Qd/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExanY4b2dyemRtemNuZXQ4YzU4bGUzMHJhaG1wb2h2a2Z6d2Nja29iYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/MwtHY03ldRPgc/giphy.gif'
    ];
    const rastgeleGif = sikGifler[Math.floor(Math.random() * sikGifler.length)];

    const sikEmbed = new EmbedBuilder()
        .setColor('#1a1a1a')
        .setTitle('🔞 Ağır Hasar!')
        .setDescription(`💓 <@${message.author.id}>, <@${target.id}> kullanıcısını **ŞAP ŞAP** etkisiz hale getirdi!`)
        .setImage(rastgeleGif)
        .setFooter({ text: '🛡️ Ace System • +18', iconURL: message.client.user.displayAvatarURL() });

    return message.reply({ embeds: [sikEmbed] });
}

if (command === 'sarıl') {
    const target = message.mentions.users.first();
    if (!target) return message.reply("❌ Sarılacak birini bulamadık mı? Gel ben sarılayım diyeceğim de botum ben.");

    const sarilGifler = [
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdjdzaWxsbzh3b2M4amlmMXJ4NGlwYmo5YTc4NmwwNGI0MXpsaW1yNiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/IzXiddo2twMmdmU8Lv/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NTZqOThkYTkzMzB3NWxxMndsaXJpNXA0NWhucHpmd2UydTd0M2ZoNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/z1HeERIKKcRjG7Ke5x/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NTZqOThkYTkzMzB3NWxxMndsaXJpNXA0NWhucHpmd2UydTd0M2ZoNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/0jzI2Z6rHSHR10VL2w/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aGh4eXR5Z3docTN6YmxlaXptZHZzNWlxczhmOHdlaTh4bDU4OHkyMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/eHvTEDvKPjdc4ovRUb/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aGh4eXR5Z3docTN6YmxlaXptZHZzNWlxczhmOHdlaTh4bDU4OHkyMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/du8yT5dStTeMg/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dzZxZTBjdWZoa3JmZ3pkOGNoZzh0Ymh2dnQydjJycmU5Z3p6aG81byZlcD12MV9naWZzX3NlYXJjaCZjdD1n/FYNiNRf3u3UX7rIgkT/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aWNtNmFuaXhkNzlmaGIzY2JycmMwYXMwZnNjOGYxd3VyY3FydjZ4dSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/BXrwTdoho6hkQ/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MHpza25oNXNxaXVpbXFxNXRrc2trOGlwYjhvaDhzbzFqcDI1OXdiYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l2QDM9Jnim1YVILXa/giphy.gif'
    ];
    const rastgeleGif = sarilGifler[Math.floor(Math.random() * sarilGifler.length)];

    const sarilEmbed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('🫂 Sımsıkı Sarılma')
        .setDescription(`<@${message.author.id}>, <@${target.id}> kullanıcısına sımsıkı sarıldı. *Her şey geçecek, sakin ol...*`)
        .setImage(rastgeleGif)
        .setFooter({ text: '🛡️ Ace System', iconURL: message.client.user.displayAvatarURL() });

    return message.reply({ embeds: [sarilEmbed] });
}
    
if (command === 'kaçcm') {
    const target = message.mentions.users.first() || message.author;
    const uzunluk = Math.floor(Math.random() * 35) + 1;
        
    let yorum = "";
    if(uzunluk <= 5) yorum = "Büyü de gel aslanım... 🔬";
    else if(uzunluk <= 10) yorum = "İdare eder kardeşim, sıkma canını. 🤏";
    else if(uzunluk <= 16) yorum = "Ortalama, ideal. 😎";
    else if(uzunluk <= 23) yorum = "Oha, maşallah! 😳";
    else yorum = "Silah taşıma ruhsatı alman lazım usta! 🚀";

    const cmEmbed = new EmbedBuilder()
        .setColor('Random')
        .setTitle('📏 Kadastro ve Ölçüm Sonucu')
        .setDescription(`> **${target.username}** adlı kişinin derinlik ölçümleri yapıldı...\n\n**Sonuç:** \`${uzunluk} CM\`\n**Analiz:** *${yorum}*`)
        .setFooter({ text: '🛡️ Ace System • Sadece Eğlence Amaçlıdır', iconURL: message.client.user.displayAvatarURL() });

    return message.reply({ embeds: [cmEmbed] });
}

if (command === 'zarat') {
    const zar1 = Math.floor(Math.random() * 6) + 1;
    const zar2 = Math.floor(Math.random() * 6) + 1; // Tek zar yerine çift zar yuvarlamak her zaman daha heyecanlıdır
    
    const zarEmbed = new EmbedBuilder()
        .setColor('#f1c40f')
        .setTitle('🎲 Zarlar Fırlatıldı!')
        .setDescription(`> Kullanıcı: <@${message.author.id}>\n\n🎰 **Gelen Zarlar:** \` ${zar1} - ${zar2} \` (Toplam: \`${zar1 + zar2}\`)`)
        .setFooter({ text: '🛡️ Ace System • Şansın bol olsun.', iconURL: message.client.user.displayAvatarURL() });

    return message.reply({ embeds: [zarEmbed] });
}

if (command === 'yazıtura') {
    const sonuc = Math.random() < 0.5 ? "YAZI 🪙" : "TURA 🦅";
    
    const ytEmbed = new EmbedBuilder()
        .setColor('#95a5a6')
        .setTitle('🪙 Demir Para Havada Dönüyor...')
        .setDescription(`> Parayı fırlatan: <@${message.author.id}>\n\n🎯 **Sonuç:** **\`${sonuc}\`**`)
        .setFooter({ text: '🛡️ Ace System', iconURL: message.client.user.displayAvatarURL() });

    return message.reply({ embeds: [ytEmbed] });
}


// ====================== YENİ EKLENEN YARATICI KOMUTLAR ======================

if (command === 'racon') {
    const target = message.mentions.users.first();
    if (!target) return message.reply("❌ Kime racon keseceğini seçmelisin, kendi kendine racon kesilmez.");
    if (target.id === message.author.id) return message.reply("❌ Kendine racon kesemezsin, aynayla aranı düzelt.");

    const raconlar = [
        "Ben racon kesmem, kafa keserim!",
        "Bi yerde küçük insanların büyük gölgeleri oluşuyorsa, orada güneş batıyor demektir.",
        "Saraylarda sürmedik saltanat, bir odada çektik cefayı. Biz severiz aslan gibi abiyi, sileriz arkadan iş çeviren kahpeyi!",
        "Bizim ortamda akıllıya yer yok, deliyi zaten biz delirttik.",
        "Geçmişi kurcalama, altından ben çıkarsam dönemezsin."
    ];
    const secilenRacon = raconlar[Math.floor(Math.random() * raconlar.length)];

    const raconEmbed = new EmbedBuilder()
        .setColor('#1c1c1c')
        .setTitle('⚖️ Racon Kesildi!')
        .setDescription(`<@${message.author.id}>, <@${target.id}> kullanıcısının karşısına dikildi ve lafı koydu:\n\n> *"${secilenRacon}"*`)
        .setImage('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NjRycXY2MGdyZWQ0NG9zYnZiaW1yOWlsbW1pOHhha2p0ZWt5aHV1cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/tipeVV5rWmSFIo3PUa/giphy.gif') // GIF LİNKİ BURAYA (Örn: Ağır abi veya mafya gifi)
        .setFooter({ text: '🛡️ Ace System • Hüküm verildi.', iconURL: message.client.user.displayAvatarURL() });

    return message.reply({ embeds: [raconEmbed] });
}

if (command === 'fbi') {
    const target = message.mentions.users.first();
    if (!target) return message.reply("❌ Kimin evini bastıracaksın? Birini ihbar et!");

    const fbiEmbed = new EmbedBuilder()
        .setColor('#002d62')
        .setTitle('🚨 FBI OPEN THE DOOR!')
        .setDescription(`⚠️ <@${message.author.id}>, <@${target.id}> adlı kullanıcının yasadışı hareketlerini tespit etti ve özel harekatı evine yolladı! \n\n**DURUM:** Kapı koçbaşıyla kırılıyor, kaçış yok!`)
        .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzBzMnFtOHcwMmE1aDE0cXQ2Y3J1ZmZtbmxnM3ZuNHplaDYxdDJlNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/dMn6DpYvzeKJ1UTar6/giphy.gif') // GIF LİNKİ BURAYA (Klasik kapı kırma fbi gifi)
        .setFooter({ text: '🛡️ Ace System • Baskın Basanındır.', iconURL: message.client.user.displayAvatarURL() });

    return message.reply({ embeds: [fbiEmbed] });
}

if (command === 'aura') {
    const target = message.mentions.users.first() || message.author;
    const oran = Math.floor(Math.random() * 101);
    
    let durum = "";
    if (oran < 20) durum = "Aura yerlerde sürünüyor, acil takviye lazım... 💀";
    else if (oran < 50) durum = "Biraz baygın bir enerji var ama düzelir. 💤";
    else if (oran < 80) durum = "Gayet sağlam, ortamın akışına ayak uyduruyor. 🧊";
    else durum = "Aura patlaması yaşıyor! Sinerji mükemmel. 🔥";

    const vibeEmbed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('🔮 Aura & Vibe Kontrolü')
        .setDescription(`> **${target.username}** kullanıcısının ruh hali ve ortam aurası taranıyor...\n\n🎯 **Vibe Oranı:** \`%${oran}\` \n📊 **Durum:** *${durum}*`)
        .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExanJvYzd4bGNyeXl1NWZ4dGc0dmp1YzI0N2FkZGhxbWJ3MWZsaWFzdCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/FYOsEpYK7zHs3eDXmg/giphy.gif') // GIF LİNKİ BURAYA
        .setFooter({ text: '🛡️ Ace System', iconURL: message.client.user.displayAvatarURL() });

    return message.reply({ embeds: [vibeEmbed] });
}

if (command === 'wasted') {
    const target = message.mentions.users.first();
    if (!target) return message.reply("❌ Kimi harcayacağını seçmedin.");

    const sebepler = ['Yere basan yola bastı', 'Yanlış kişiye ters yaptı', 'Lag kurbanı oldu', 'Raconu kaldıramadı'];
    const sebep = sebepler[Math.floor(Math.random() * sebepler.length)];

    const wastedEmbed = new EmbedBuilder()
        .setColor('#2c3e50')
        .setTitle('✖️ WASTED!')
        .setDescription(`<@${message.author.id}>, <@${target.id}> adlı kullanıcıyı harcadı!\n\n> **Elanma Sebebi:** *${sebep}*`)
        .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExazBoOHo3bGJrdXAzZjBleXl3YjFpaTJtNXE1cmJkYXVobmpvb3R2eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/w29hHnsoaqsy4/giphy.gif') // GIF LİNKİ BURAYA (GTA Wasted gifi çok iyi gider)
        .setFooter({ text: '🛡️ Ace System • Geçmiş olsun.', iconURL: message.client.user.displayAvatarURL() });

    return message.reply({ embeds: [wastedEmbed] });
}

// ====================== EĞLENCE (GELİŞTİRİLMİŞ) ======================

if (command === 'evlen') {
    const target = message.mentions.users.first();
    if (!target) return message.reply("💍 Kiminle evlenmek istiyorsun? Etiketlemeyi unuttun!");
    if (target.id === message.author.id) return message.reply("Kendi kendinle evlenemezsin, o kadar da yalnız değilsin! 😅");
    if (target.bot) return message.reply("Botlarla evlenmek yasalara aykırı kanka...");

    const evliMi = await Evlilik.findOne({ $or: [{ kullanici1: message.author.id }, { kullanici2: message.author.id }] });
    if (evliMi) return message.reply("Zaten evlisin! Tek eşlilik esastır. 😠");
    const karsiEvliMi = await Evlilik.findOne({ $or: [{ kullanici1: target.id }, { kullanici2: target.id }] });
    if (karsiEvliMi) return message.reply("Göz diktiğin kişi zaten başkasıyla evli, yuva yıkanın yuvası olmaz!");

    const teklifEmbed = new EmbedBuilder()
        .setColor('#ff69b4')
        .setTitle('💍 Bir Evlilik Teklifi Var!')
        .setDescription(`Hey ${target}, **${message.author.username}** sana hayatını birleştirmeyi teklif ediyor!\n\n*Hastalıkta, sağlıkta, iyi günde ve kötü günde onunla olmaya var mısın?*`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Teklife cevap vermek için 60 saniyen var.' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('evet_evlen').setLabel('Evet!').setStyle(ButtonStyle.Success).setEmoji('💍'),
        new ButtonBuilder().setCustomId('hayir_evlen').setLabel('Hayır').setStyle(ButtonStyle.Danger).setEmoji('💔')
    );

    const teklifMsg = await message.channel.send({ 
        content: `${target}`, 
        embeds: [teklifEmbed],
        components: [row] 
    });

    const filter = i => i.user.id === target.id;
    const collector = teklifMsg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === 'evet_evlen') {
            await new Evlilik({ kullanici1: message.author.id, kullanici2: target.id, cocuklar: [] }).save();
            
            const rol = message.guild.roles.cache.get(PERMS.EVLI_ROL);
            if (rol) {
                message.member.roles.add(rol).catch(()=>{});
                const targetMember = message.guild.members.cache.get(target.id);
                if (targetMember) targetMember.roles.add(rol).catch(()=>{});
            }

            const kabulEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎉 Gelin Öpülebilir!')
                .setDescription(`İnanılmaz! **${message.author.username}** ve **${target.username}** artık resmen evli! Birbirinize çok yakıştınız. 🥂`)
                .setFooter({ text: '🛡️ Ace System' });

            await i.update({ content: null, embeds: [kabulEmbed], components: [] });
        } else {
            const retEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('💔 Yak Yıkıl Hayaller...')
                .setDescription(`Maalesef, **${target.username}** evlilik teklifini reddetti. Önümüzdeki maçlara bakacağız ${message.author.username}... 🚬`)
                .setFooter({ text: '🛡️ Ace System' });

            await i.update({ content: null, embeds: [retEmbed], components: [] });
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) teklifMsg.edit({ content: "⏳ Kimse cevap vermedi, teklif zaman aşımına uğradı.", embeds: [], components: [] });
    });
}

if (command === 'boşan') {
    const kayit = await Evlilik.findOne({ 
        $or: [{ kullanici1: message.author.id }, { kullanici2: message.author.id }] 
    });

    if (!kayit) return message.reply("😕 Zaten evli değilsin ki boşanalım?");

    const partnerID = kayit.kullanici1 === message.author.id ? kayit.kullanici2 : kayit.kullanici1;
    const partner = await message.guild.members.fetch(partnerID).catch(() => null);

    const bosanEmbed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('⚖️ Mahkeme Salonu')
        .setDescription(`**${message.author.username}**, cidden <@${partnerID}> ile yollarını ayırmak istiyor musun?\n*Bu işlem geri alınamaz ve tüm çocukların velayeti devlete (bota) geçer.*`)
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/10355/10355836.png'); // Kırık kalp ikonu

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('evet_bosan').setLabel('Evet, Boşanalım').setStyle(ButtonStyle.Danger).setEmoji('💔'),
        new ButtonBuilder().setCustomId('hayir_bosan').setLabel('Hayır, Vazgeçtim').setStyle(ButtonStyle.Secondary).setEmoji('❤️')
    );

    const bosanMsg = await message.reply({
        embeds: [bosanEmbed],
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

            const sonEmbed = new EmbedBuilder()
                .setColor('#000000')
                .setDescription(`📜 Mahkeme kararıyla **${message.author.username}** ve <@${partnerID}> resmen boşandı. Herkes kendi yoluna...`)
                .setFooter({ text: '🛡️ Ace System' });

            await i.update({ embeds: [sonEmbed], components: [] });
        } else {
            const iptalEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setDescription(`❤️ Aşk galip geldi! Boşanma davası geri çekildi. Hâlâ evlisiniz! 💍`)
                .setFooter({ text: '🛡️ Ace System' });

            await i.update({ embeds: [iptalEmbed], components: [] });
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) bosanMsg.edit({ content: "⏳ İşlem iptal edildi (Zaman Aşımı).", embeds: [], components: [] }).catch(() => {});
    });
}

if (command === 'evlilik') {
    const kayit = await Evlilik.findOne({ $or: [{ kullanici1: message.author.id }, { kullanici2: message.author.id }] });
    if (!kayit) return message.reply("Bekarlık sultanlıktır... ama sen şu an sultansın.");

    const partnerID = kayit.kullanici1 === message.author.id ? kayit.kullanici2 : kayit.kullanici1;
    const tarihSaniye = Math.floor(kayit.tarih.getTime() / 1000); 

    // Çocukları listeleme mantığını limitlere göre ayarlıyoruz
    let cocukMetni = "Yok";
    const cocukSayisi = kayit.cocuklar ? kayit.cocuklar.length : 0;

    if (cocukSayisi > 0) {
        // Eğer çocuk sayısı çoksa (örn 15+), embed şişmesin diye kısa liste yapıyoruz
        if (cocukSayisi > 15) {
            cocukMetni = `👨‍👩‍👧‍👦 Toplam **${cocukSayisi}** çocuk var.\n*Hepsini görmek için aşağıdaki butona tıkla!*`;
        } else {
            cocukMetni = kayit.cocuklar.map((c, index) => {
                const emoji = c.cinsiyet === 'kız' ? '👧' : '👦';
                return `\`${index + 1}.\` ${emoji} ${c.ad}`;
            }).join(' | '); // Yan yana yazdırarak yerden tasarruf ediyoruz
        }
    }

    const cuzdanEmbed = new EmbedBuilder()
        .setColor('#8b0000')
        .setTitle('📜 AİLE VE NÜFUS CÜZDANI')
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3063/3063226.png')
        .addFields(
            { name: '👤 Eşler', value: `<@${kayit.kullanici1}> 💍 <@${kayit.kullanici2}>`, inline: false },
            { name: '📅 Evlilik Tarihi', value: `<t:${tarihSaniye}:F> (<t:${tarihSaniye}:R>)`, inline: false },
            { name: `👶 Kayıtlı Çocuklar (${cocukSayisi})`, value: cocukMetni, inline: false }
        )
        .setFooter({ text: 'TC. Discord Nüfus Müdürlüğü • 🛡️ Ace System' });

    // Eğer 15'ten fazla çocuk varsa detay butonu ekleyelim
    const components = [];
    if (cocukSayisi > 15) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('cocuklari_listele')
                .setLabel('Tüm Çocukları Listele')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👶')
        );
        components.push(row);
    }

    const msg = await message.reply({ embeds: [cuzdanEmbed], components: components });

    // Buton kolektörü (Sadece çok çocuk varsa çalışır)
    if (cocukSayisi > 15) {
        const filter = i => i.user.id === message.author.id;
        const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'cocuklari_listele') {
                // Çocukları 25-25 iki gruba ayırıp daha geniş bir listede gösteriyoruz
                const tamListe = kayit.cocuklar.map((c, index) => {
                    const emoji = c.cinsiyet === 'kız' ? '👧' : '👦';
                    return `**${index + 1}.** ${emoji} ${c.ad}`;
                });

                const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, k) => arr.slice(k * size, k * size + size));
                const parcalar = chunk(tamListe, 25); // Discord 25 field sınırı koyduğu için bölüyoruz

                const listeEmbed = new EmbedBuilder()
                    .setColor('#8b0000')
                    .setTitle(`👶 ${message.author.username} Ailesinin Tüm Çocukları`)
                    .setDescription(parcalar[0].join('\n')) // İlk 25 çocuk

                if (parcalar[1]) {
                    listeEmbed.addFields({ name: 'Devamı...', value: parcalar[1].join('\n') }); // Sonraki 25 çocuk
                }

                await i.reply({ embeds: [listeEmbed], ephemeral: true });
            }
        });
    }
}

if (command === 'çocukyap') {
    // Argümanları yakala (Örn: !çocukyap Ali erkek)
    // args tanımlı değilse mesaj içeriğinden çekelim:
    const args = message.content.trim().split(/ +/).slice(1);
    
    const kayit = await Evlilik.findOne({ $or: [{ kullanici1: message.author.id }, { kullanici2: message.author.id }] });
    if (!kayit) return message.reply("Çocuk yapmak için önce evlenmen lazım! Leylekler getirmiyor ya bunu...");

    const isim = args[0];
    const cinsiyetInput = args[1]?.toLowerCase();

    if (!isim || !cinsiyetInput) {
        return message.reply("Doğru kullanım: `!çocukyap <isim> <kız/erkek>`");
    }

    if (!['kız', 'kiz', 'erkek'].includes(cinsiyetInput)) {
        return message.reply("Lütfen geçerli bir cinsiyet gir: `kız` veya `erkek`.");
    }

    const cinsiyet = (cinsiyetInput === 'kiz' || cinsiyetInput === 'kız') ? 'kız' : 'erkek';

    if (!kayit.cocuklar) kayit.cocuklar = []; 
    if (kayit.cocuklar.length >= 50) return message.reply("Maşallah! Zaten 50 çocuğunuz var, nüfusa farkmı atmaya çalışıyosunuz amk. Daha fazla yapamazsınız. 😅");

    const yeniCocuk = {
        ad: isim,
        cinsiyet: cinsiyet
    };

    kayit.cocuklar.push(yeniCocuk);
    await kayit.save();

    const emoji = cinsiyet === 'kız' ? '👧' : '👦';
    const cocukEmbed = new EmbedBuilder()
        .setColor(cinsiyet === 'kız' ? '#ffb6c1' : '#add8e6') // Kıza pembe, erkeğe mavi ton
        .setTitle('🍼 Yeni Bir Bebek Dünyaya Geldi!')
        .setDescription(`Tebrikler <@${message.author.id}>! Nur topu gibi bir **${cinsiyet}** çocuğunuz oldu.\n\nİsmi: **${isim}** ${emoji}\n\n*Ailesine ve vatanına hayırlı bir evlat olması dileğiyle...*`)
        .setFooter({ text: '🛡️ Ace System' });

    return message.reply({ embeds: [cocukEmbed] });
}

    if (command === 'zboşan' || command === 'ayır') {
    // Kurucu ID Kontrolü
    if (message.author.id !== '983015347105976390') {
        return message.reply("🛑 Yetkisiz erişim! Bu komut sadece sunucu sahibine özeldir.");
    }

    const target = message.mentions.users.first();
    if (!target) return message.reply("Kimi zorla boşatmak istiyorsun? Etiketlemeyi unuttun!");

    // Etiketlenen kişi evli mi diye veritabanında arıyoruz
    const kayit = await Evlilik.findOne({ 
        $or: [{ kullanici1: target.id }, { kullanici2: target.id }] 
    });

    if (!kayit) return message.reply(`😅 ${target.username} zaten bekar, olmayan yuvayı nasıl yıkalım?`);

    // Partnerin kim olduğunu buluyoruz
    const partnerID = kayit.kullanici1 === target.id ? kayit.kullanici2 : kayit.kullanici1;
    const partner = await message.guild.members.fetch(partnerID).catch(() => null);
    const targetMember = await message.guild.members.fetch(target.id).catch(() => null);

    // Veritabanından siliyoruz
    await Evlilik.deleteOne({ _id: kayit._id });

    // Evli rolünü her iki taraftan da alıyoruz
    const evliRol = message.guild.roles.cache.get(PERMS.EVLI_ROL);
    if (evliRol) {
        if (targetMember) targetMember.roles.remove(evliRol).catch(() => {});
        if (partner) partner.roles.remove(evliRol).catch(() => {});
    }

    const zBosanEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('⚡ İlahi Müdahale: Yuva Yıkıldı!')
        .setDescription(`Kurucunun yüce emriyle ${target} ve <@${partnerID}> tek celsede boşandı!\n\n*Kurucu vurdu gol oldu, herkes kendi yoluna...* 🚬`)
        .setFooter({ text: '🛡️ Ace System - Kurucu Müdahalesi' });

    return message.reply({ embeds: [zBosanEmbed] });
}

    if (command === 'zevlendir' || command === 'çöpçatan') {
    // Kurucu ID Kontrolü
    if (message.author.id !== '983015347105976390') {
        return message.reply("🛑 Yetkisiz erişim! Aşka müdahale etmek sadece kurucuya mahsustur.");
    }

    // Etiketlenen tüm kullanıcıları bir diziye alıyoruz
    const mentions = [...message.mentions.users.values()];
    
    if (mentions.length < 2) {
        return message.reply("Zorla evlendirmek için **2 kişiyi** etiketlemen lazım!");
    }

    const target1 = mentions[0];
    const target2 = mentions[1];

    if (target1.id === target2.id) return message.reply("Aynı kişiyi iki kere etiketledin, klonlamayı henüz bulmadık! 😅");
    if (target1.bot || target2.bot) return message.reply("Botları bu işe karıştırma, onların duyguları yok...");

    // Hedeflerin başkasıyla evli olup olmadığını kontrol ediyoruz
    const evli1 = await Evlilik.findOne({ $or: [{ kullanici1: target1.id }, { kullanici2: target1.id }] });
    const evli2 = await Evlilik.findOne({ $or: [{ kullanici1: target2.id }, { kullanici2: target2.id }] });

    if (evli1) return message.reply(`Aga be... ${target1.username} halihazırda başkasıyla evli! Önce onu boşatman lazım.`);
    if (evli2) return message.reply(`Aga be... ${target2.username} halihazırda başkasıyla evli! Önce onu boşatman lazım.`);

    // Evlilik kaydını oluşturuyoruz
    await new Evlilik({ kullanici1: target1.id, kullanici2: target2.id, cocuklar: [] }).save();

    // Evli rollerini veriyoruz
    const evliRol = message.guild.roles.cache.get(PERMS.EVLI_ROL);
    if (evliRol) {
        const member1 = await message.guild.members.fetch(target1.id).catch(() => null);
        const member2 = await message.guild.members.fetch(target2.id).catch(() => null);
        
        if (member1) member1.roles.add(evliRol).catch(() => {});
        if (member2) member2.roles.add(evliRol).catch(() => {});
    }

    const zEvlenEmbed = new EmbedBuilder()
        .setColor('#ff69b4')
        .setTitle('⚡ İlahi Müdahale: Zorunlu Nikah!')
        .setDescription(`Kurucunun mutlak yetkisiyle ${target1} ve ${target2} an itibarıyla evlendirilmiştir!\n\n*Siz isteseniz de istemeseniz de... Birbirinize çok yakıştınız!* 💍🥂`)
        .setFooter({ text: '🛡️ Ace System - Kurucu Müdahalesi' });

    return message.reply({ content: `${target1} ${target2}`, embeds: [zEvlenEmbed] });
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


if (command === 'lanet') {
    // SADECE SENİN KULLANABİLMEN İÇİN GEREKEN KONTROL
    if (message.author.id !== '983015347105976390') {
        const yetkiYokEmbed = new EmbedBuilder()
            .setColor('Red')
            .setDescription("🚫 **Bu komutu yalnızca Lanetleri Musallat Edebilen Sahirler Kullanabilir!** *(Satoru Gojo)*");
        return message.reply({ embeds: [yetkiYokEmbed] }); 
    }

    // Mesajda etiketlenen ilk kullanıcıyı al
    const target = message.mentions.users.first();

    if (!target) {
        const hedefYokEmbed = new EmbedBuilder()
            .setColor('Orange')
            .setDescription("Kime lanet okuyacağımı belirt, Ace Sensei!");
        return message.reply({ embeds: [hedefYokEmbed] });
    }

    if (target.bot) {
        const botEmbed = new EmbedBuilder()
            .setColor('Orange')
            .setDescription("Botlara musallat olmak istemem Sensei, onların lanetli enerjisi yok.");
        return message.reply({ embeds: [botEmbed] });
    }

    // Eğer kişi zaten listedeyse listeden çıkar (Lanet Kaldırma)
    if (targetedUsers.has(target.id)) {
        targetedUsers.delete(target.id);
        
        const kurtulduEmbed = new EmbedBuilder()
            .setColor('Blue') // Gojo'nun gözleri gibi mavi
            .setTitle('🌀 Lanet Geri Çekildi')
            .setDescription(`${target} adlı faniyi şimdilik rahat bıraktım Ace Sensei. Sınırları zorlamasına gerek kalmadı.`);
            
        return message.reply({ embeds: [kurtulduEmbed] });
        
    } else {
        // Kişi listede yoksa ekle (Lanetleme - Alan Genişletmesi)
        targetedUsers.add(target.id);
        
        const lanetEmbed = new EmbedBuilder()
            .setColor('Purple') // Hollow Purple rengi
            .setTitle('🤞 Lanet Musallatı / Satoru Gojo')
            .setDescription(`${target} kişisine başarıyla **lanetli enerjimi** enjekte ettim.\n\n*Benden kurtuluş sadece Ace Sensei tarafından yapılabilir...*`)
            .setImage('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aXp0aXR6dDZ1czRsOGllc292OHBncXNsbWczb3kyemE3Z2k3MTk3OSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/fB2IRTXd07IkcStfwU/giphy.gif');
            
        return message.reply({ embeds: [lanetEmbed] });
    }
}

if (command === 'sixeyes') {
    // Sadece senin ID'ne özel
    if (message.author.id !== '983015347105976390') {
        return message.reply("❌ Altı Göz'ün görüş alanına erişmek için gerekli lanetli enerjiye sahip değilsin.");
    }

    // Rolplay: Bekleme mesajı gönder
    const loadingMessage = await message.reply("🤞 Göz bandı indiriliyor... Altı Göz bilgi akışını işliyor...");

    // Etiketlenen kullanıcıyı al, yoksa ID ile bul, o da yoksa komutu yazanı hedefle
    let targetUser = message.mentions.users.first();
    if (!targetUser && args[0]) {
        targetUser = await message.client.users.fetch(args[0]).catch(() => null);
    }
    if (!targetUser) targetUser = message.author;

    const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);

    // Discord Rozetlerini Tanımlama ve Eşleştirme
    const badgesMap = {
        Staff: 'Discord Yetkilisi',
        Partner: 'Partner Sunucu Sahibi',
        Hypesquad: 'HypeSquad Etkinlikleri',
        BugHunterLevel1: 'Bug Avcısı (Tier 1)',
        BugHunterLevel2: 'Bug Avcısı (Tier 2)',
        HypeSquadOnlineHouse1: 'HypeSquad Bravery',
        HypeSquadOnlineHouse2: 'HypeSquad Brilliance',
        HypeSquadOnlineHouse3: 'HypeSquad Balance',
        PremiumEarlySupporter: 'Erken Dönem Destekçisi',
        VerifiedBot: 'Onaylı Bot',
        VerifiedDeveloper: 'Onaylı Geliştirici'
    };
    
    const userFlags = targetUser.flags ? targetUser.flags.toArray() : [];
    const badges = userFlags.map(flag => badgesMap[flag] || flag).join(', ') || 'Normal Büyücü (Rozet Yok)';

    // Zaman Damgaları
    const discordTimestamp = Math.floor(targetUser.createdTimestamp / 1000);
    const serverTimestamp = targetMember ? Math.floor(targetMember.joinedTimestamp / 1000) : null;

    // Varlık Türü (Bot mu İnsan mı?)
    const entityType = targetUser.bot ? '🤖 Yapay Lanetli Ceset (Bot)' : '👤 İnsan (Büyücü)';

    // Eğlenceli Gojo Evreni İstatistikleri
    const isGojo = targetUser.id === '983015347105976390';
    const cursedEnergy = isGojo ? 'Sonsuz' : `%${Math.floor(Math.random() * 40) + 60}`;
    const grades = ['Özel Derece (Special Grade)', '1. Derece', '2. Derece', '3. Derece', 'Yarı 1. Derece'];
    const assignedGrade = isGojo ? 'Sınırsızlık Sektörü Lideri' : grades[Math.floor(Math.random() * grades.length)];
    
    const techniques = ['On Gölge (Ten Shadows)', 'Kan Manipülasyonu', 'Basit Alan', 'Cennet Kısıtlaması (Fiziksel)', 'Lanetli Söz (Cursed Speech)', 'Bilinmiyor'];
    const assignedTechnique = isGojo ? 'Sınırsızlık (Limitless)' : techniques[Math.floor(Math.random() * techniques.length)];

    // Avatar URL'si
    const avatarUrl = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });

    const sixEyesEmbed = new EmbedBuilder()
        .setColor('#00AEFF')
        .setTitle('👁️ Altı Göz (Six Eyes) - Analiz Raporu')
        .setDescription(`**<@${targetUser.id}>** adlı varlığın atomik yapısı ve lanetli enerjisi çözümlendi.`)
        .setThumbnail(avatarUrl)
        .addFields(
            { name: '🧬 Varlık Türü', value: `\`${entityType}\``, inline: true },
            { name: '🏷️ Hesap Etiketi', value: `\`${targetUser.tag}\``, inline: true },
            { name: '🆔 Kullanıcı ID', value: `\`${targetUser.id}\``, inline: true },
            { name: '🏅 Profil Rozetleri', value: `${badges}`, inline: false },
            { name: '📅 Discord\'a Doğuş', value: `<t:${discordTimestamp}:D> (<t:${discordTimestamp}:R>)`, inline: true }
        )
        .setImage('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MXF0eTFieDhkdmMyeWVmZ3l0dXExN2lvZXZoc2llZHIyajI1cG0zZiZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/nMtKecpxYBRLH5ggYp/giphy.gif')
        .setFooter({ text: 'Altı Göz her şeyi görür.', iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

    // Eğer kullanıcı sunucudaysa sunucu bilgilerini de ekle
    if (targetMember && serverTimestamp) {
        // En yüksek rolü bulma (@everyone rolünü filtrele)
        const highestRole = targetMember.roles.highest.id === message.guild.id ? 'Yok' : `<@&${targetMember.roles.highest.id}>`;

        sixEyesEmbed.addFields(
            { name: '📥 Bariyerden İçeri Giriş (Sunucu)', value: `<t:${serverTimestamp}:D> (<t:${serverTimestamp}:R>)`, inline: true },
            { name: '👑 En Yüksek Kademe (Rol)', value: highestRole, inline: true },
            { name: '\u200B', value: '\u200B', inline: false }, // Boşluk bırakmak için
            { name: '📊 Lanetli Enerji Seviyesi', value: `\`${cursedEnergy}\``, inline: true },
            { name: '🔮 Büyücü Derecesi', value: `\`${assignedGrade}\``, inline: true },
            { name: '🌀 Lanetli Teknik', value: `\`${assignedTechnique}\``, inline: true }
        );
    } else {
        sixEyesEmbed.addFields({ name: '🚫 Bariyer Durumu', value: 'Bu varlık şu an sunucu bariyerlerinin dışında.', inline: false });
    }

    // Bekleme mesajını Altı Göz analiziyle değiştir (Animasyonlu hissiyat)
    setTimeout(async () => {
        await loadingMessage.edit({ content: "Görüş alanı netleşti.", embeds: [sixEyesEmbed] });
    }, 1500); // 1.5 saniyelik bir gecikme
}


if (command === 'dc') {
    // Sadece belirli kanalda çalışması için kanal kontrolü
    const ozelKanalId = '1515315036887973978';
    if (message.channel.id !== ozelKanalId) {
        return message.reply(`Reis, bu oyunu sadece <#${ozelKanalId}> kanalında oynayabilirsiniz!`);
    }

    // Sorular ve Görevler
    const dogrulukSorulari = [
        "En son kime yalan söyledin ve yalanın neydi?",
        "Buradaki oyunculardan birinin günlüğünü okuyabilecek olsan kiminkini okurdun?",
        "Hayatındaki en utanç verici anın neydi?",
        "Hiç Kimseyi Aldattınmı Aldattıysan Kimi Aldattın?",
        "Eğer görünmez olsaydın yapacağın ilk şey ne olurdu?",
        "Kimsenin bilmediği gizli bir yeteneğin var mı?"
    ];

    const cesaretGorevleri = [
        "Buradaki oyunculardan birine rastgele bir iltifat et.",
        "Sesli kanaldaysan 10 saniye boyunca şarkı söyle. Değilsen buraya bir şarkı sözü yaz.",
        "En son kopyaladığın metni (ctrl+v) buraya yapıştır.",
        "Kendi profiline gir ve hakkımda kısmına 'Ben malım' yaz (1 saat kalsın).",
        "Sunucudaki rastgele birine DM'den 'Seni çok özledim' yazıp ekran görüntüsünü at.",
        "Burdaki Oyunculardan Herhangi Birine a!sik Komudu Kullan."
    ];

    const oyuncular = new Set();
    oyuncular.add(message.author.id); // Komutu yazan otomatik katılır

    // Lobi Embed'i
    const lobiEmbed = new EmbedBuilder()
        .setTitle('🎯 Doğruluk mu Cesaret mi? Lobi Kuruldu!')
        .setDescription(`Oyuna katılmak için aşağıdaki butona tıkla!\n\n**Şu anki Oyuncular:** <@${message.author.id}>`)
        .setColor('Random');

    const lobiRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('dc_katil')
            .setLabel('Oyuna Katıl / Ayrıl')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✋'),
        new ButtonBuilder()
            .setCustomId('dc_baslat')
            .setLabel('Oyunu Başlat')
            .setStyle(ButtonStyle.Success)
            .setEmoji('▶️')
    );

    message.channel.send({ embeds: [lobiEmbed], components: [lobiRow] }).then(lobiMesaji => {
        const lobiCollector = lobiMesaji.createMessageComponentCollector({ componentType: ComponentType.Button, time: 180000 });

        lobiCollector.on('collect', async interaction => {
            if (interaction.customId === 'dc_katil') {
                if (oyuncular.has(interaction.user.id)) {
                    oyuncular.delete(interaction.user.id);
                } else {
                    oyuncular.add(interaction.user.id);
                }

                const guncelOyuncular = Array.from(oyuncular).map(id => `<@${id}>`).join('\n') || "Kimse yok :(";
                lobiEmbed.setDescription(`Oyuna katılmak için aşağıdaki butona tıkla!\n\n**Şu anki Oyuncular:**\n${guncelOyuncular}`);
                await interaction.update({ embeds: [lobiEmbed], components: [lobiRow] });
            }

            if (interaction.customId === 'dc_baslat') {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ content: 'Oyunu sadece başlatan kişi başlatabilir!', ephemeral: true });
                }
                if (oyuncular.size < 2) {
                    return interaction.reply({ content: 'Reis, en az 2 kişi lazım!', ephemeral: true });
                }

                lobiCollector.stop('basladi');
                await interaction.update({ components: [] }).catch(() => {}); // Lobi butonlarını kaldır
                oyunDöngüsü(message.channel, Array.from(oyuncular));
            }
        });

        lobiCollector.on('end', (collected, reason) => {
            if (reason !== 'basladi') {
                lobiEmbed.setTitle('⏳ Lobi Zaman Aşımına Uğradı').setDescription('Oyun başlatılmadığı için lobi iptal edildi.');
                lobiMesaji.edit({ embeds: [lobiEmbed], components: [] }).catch(() => {});
            }
        });
    });

    // Ana Oyun Döngüsü Fonksiyonu (Her turda YENİ MESAJ atar)
    function oyunDöngüsü(oyunKanali, oyuncuListesi) {
        const karisik = oyuncuListesi.sort(() => Math.random() - 0.5);
        const soran = karisik[0];
        const cevaplayan = karisik[1];

        const oyunEmbed = new EmbedBuilder()
            .setTitle('🎲 Yeni Tur Başladı!')
            .setDescription(`🎙️ **Soran:** <@${soran}>\n🎯 **Cevaplayan:** <@${cevaplayan}>\n\n<@${cevaplayan}>, seçimini yap: **Doğruluk mu, Cesaret mi?**`)
            .setColor('Random');

        const oyunRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('secim_dogruluk').setLabel('Doğruluk').setStyle(ButtonStyle.Primary).setEmoji('🤫'),
            new ButtonBuilder().setCustomId('secim_cesaret').setLabel('Cesaret').setStyle(ButtonStyle.Danger).setEmoji('🔥')
        );

        // Tamamen YENİ MESAJ gönderiliyor
        oyunKanali.send({ embeds: [oyunEmbed], components: [oyunRow] }).then(oyunMesaji => {
            const oyunCollector = oyunMesaji.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

            oyunCollector.on('collect', async i => {
                if (i.user.id !== cevaplayan) {
                    return i.reply({ content: `Sıra şu an <@${cevaplayan}> kişisinde!`, ephemeral: true });
                }

                oyunCollector.stop();
                await i.update({ components: [] }).catch(() => {}); // Eski butonları temizle

                const secilenTur = i.customId === 'secim_dogruluk' ? 'Doğruluk' : 'Cesaret';

                // YENİ MESAJ: Soran kişiye soruyoruz
                const kaynakEmbed = new EmbedBuilder()
                    .setTitle('🤔 Sorunun Kaynağı Seçiliyor')
                    .setDescription(`<@${cevaplayan}> adlı kişi **${secilenTur}** seçti!\n\n🎙️ <@${soran}>, soruyu/görevi kendin mi soracaksın yoksa bot otomatik mi sorsun?`)
                    .setColor('Blurple');

                const kaynakRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('kaynak_kendim').setLabel('Kendim Soracağım').setStyle(ButtonStyle.Success).setEmoji('✍️'),
                    new ButtonBuilder().setCustomId('kaynak_bot').setLabel('Bot Sorsun').setStyle(ButtonStyle.Secondary).setEmoji('🤖')
                );

                oyunKanali.send({ embeds: [kaynakEmbed], components: [kaynakRow] }).then(kaynakMesaji => {
                    const kaynakCollector = kaynakMesaji.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

                    kaynakCollector.on('collect', async ki => {
                        if (ki.user.id !== soran) {
                            return ki.reply({ content: `Seçim yapma sırası <@${soran}> adlı kişide!`, ephemeral: true });
                        }

                        kaynakCollector.stop();
                        await ki.update({ components: [] }).catch(() => {}); // Butonları temizle

                        let finalEmbed = new EmbedBuilder().setColor('Random');
                        
                        // Sonraki tur butonu
                        const devamRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('sonraki_tur').setLabel('Sonraki Tur').setStyle(ButtonStyle.Success).setEmoji('🔄')
                        );

                        if (ki.customId === 'kaynak_bot') {
                            // Bot otomatik soruyor
                            const soruMetni = secilenTur === 'Doğruluk' 
                                ? dogrulukSorulari[Math.floor(Math.random() * dogrulukSorulari.length)] 
                                : cesaretGorevleri[Math.floor(Math.random() * cesaretGorevleri.length)];

                            finalEmbed
                                .setTitle(`🤖 Botun Sorusu/Görevi (${secilenTur})`)
                                .setDescription(`🎙️ **Soran:** <@${soran}>\n🎯 **Cevaplayan:** <@${cevaplayan}>\n\n**${soruMetni}**`);

                        } else if (ki.customId === 'kaynak_kendim') {
                            // Kullanıcı kendi soracak
                            finalEmbed
                                .setTitle(`✍️ Kullanıcı Sorusu/Görevi (${secilenTur})`)
                                .setDescription(`🎙️ <@${soran}>, mikrofon sende! <@${cevaplayan}> kişisine istediğin **${secilenTur}** sorusunu/görevini sohbete yaz yaz.\n\n*İşiniz bittiğinde aşağıdaki butona basarak yeni tura geçebilirsiniz.*`);
                        }

                        // YENİ MESAJ: Sonuç ve Sonraki Tur butonu
                        oyunKanali.send({ embeds: [finalEmbed], components: [devamRow] }).then(finalMesaj => {
                            const turCollector = finalMesaj.createMessageComponentCollector({ componentType: ComponentType.Button, time: 180000 });
                            
                            turCollector.on('collect', async turInteraction => {
                                if (turInteraction.customId === 'sonraki_tur') {
                                    if (!oyuncuListesi.includes(turInteraction.user.id)) {
                                        return turInteraction.reply({ content: 'Oyunda değilsin, turu geçemezsin!', ephemeral: true });
                                    }
                                    
                                    turCollector.stop();
                                    await turInteraction.update({ components: [] }).catch(() => {}); // Butonu sil
                                    oyunDöngüsü(oyunKanali, oyuncuListesi); // Tamamen yeni mesajla sıfırdan döngü başlat
                                }
                            });
                        });
                    });
                });
            });
        });
    }
}


    if (command === 'iyileştir') {
    // Sadece senin ID'ne özel
    if (message.author.id !== '983015347105976390') {
        return message.reply("❌ Ters Lanetli Teknik (RCT) kullanma yeteneğin yok. Sadece Ace yaraları iyileştirebilir.");
    }

    // Etiket veya direkt girilen ID üzerinden hedef ID'yi yakala
    const targetId = message.mentions.users.first()?.id || args[0];
    if (!targetId) return message.reply("❌ İyileştirilecek kişinin ID'sini girmelisin veya onu etiketlemelisin.");

    let rctEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✨ Ters Lanetli Teknik (Reverse Cursed Technique)')
        .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYWtyeDl4NHkzNXNna3l6aXk3dHJwZDE0dm0xcnVmY3Q4anZ5OGI2NiZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/aYQSXVlQXF7hgWvfri/giphy.gif')
        .setTimestamp();

    let iyilesenCezalar = [];
    let islemYapildi = false;

    // AŞAMA 1: Sunucu İçi Üye Kontrolü ve Timeout Kaldırma
    const member = await message.guild.members.fetch(targetId).catch(() => null);
    if (member) {
        if (member.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > Date.now()) {
            try {
                await member.timeout(null, "Ters Lanetli Teknik ile iyileştirildi!");
                iyilesenCezalar.push(`✅ <@${targetId}> adlı üyenin **susturması (timeout) tamamen temizlendi**.`);
                islemYapildi = true;
            } catch (err) {
                iyilesenCezalar.push(`⚠️ <@${targetId}> üyenin susturması kaldırılırken yetki hatası oluştu.`);
            }
        }
    }

    // AŞAMA 2: Sunucu Ban Kontrolü ve Ban Kaldırma
    try {
        const banList = await message.guild.bans.fetch();
        const banliMi = banList.has(targetId);
        
        if (banliMi) {
            await message.guild.members.unban(targetId, "Ters Lanetli Teknik ile tüm cezalar temizlendi!");
            iyilesenCezalar.push(`✅ \`${targetId}\` ID'li kullanıcının **sunucudaki banı kaldırıldı**.`);
            islemYapildi = true;
        }
    } catch (err) {
        console.error("Ban listesi kontrol edilirken hata oluştu:", err);
    }

    // Eğer hiçbir ceza bulunamadıysa uyarı ver
    if (!islemYapildi) {
        if (iyilesenCezalar.length === 0) {
            return message.reply("❌ Bu kullanıcının iyileştirilecek herhangi bir aktif cezası (Ban veya Mute) bulunamadı.");
        }
    }

    rctEmbed.setDescription(`**Ace pozitif lanetli enerji üreterek tüm hasarı geri sarıyor...**\n\n${iyilesenCezalar.join('\n')}\n\n> * "Göz kırpması kadar kısa bir sürede, sanki hiç ceza almamış gibi ayağa kalktı." *`);
    return message.reply({ embeds: [rctEmbed] });
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



if (command === 'blackflash') {
    // Sadece senin ID'ne özel
    if (message.author.id !== '983015347105976390') {
        return message.reply("❌ Bu tekniği kullanacak kadar yüksek bir lanetli enerji seviyesine sahip değilsin.");
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply("❌ Odaklanman lazım! Kime vuracağını etiketlemedin.");

    if (target.id === message.author.id) return message.reply("❌ Kendi üzerinde kara şimşek çaktıramazsın dostum.");

    // YÖNETİCİ VEYA BOTTAN ÜSTÜN ROL KONTROLÜ (Yaratıcı Kısım)
    // Eğer hedefin Yönetici yetkisi varsa veya rolü bottan üstteyse:
    if (target.permissions.has(PermissionsBitField.Flags.Administrator) || target.roles.highest.position >= message.guild.members.me.roles.highest.position) {
        
        const blockEmbed = new EmbedBuilder()
            .setColor('#ffffff')
            .setTitle('🛡️ Saldırı Savuşturuldu: Sonsuzluk!')
            .setDescription(`<@${message.author.id}>, <@${target.id}> adlı kişiye ölümcül bir **Black Flash** ile saldırdı!\n\nAncak hedefin lanetli enerjisi çok yoğun... Etrafını saran **Sonsuzluk (Infinity)** sayesinde darbe hedefe ulaşmadan durdu. \n\n> *Bu seviyedeki bir Özel Dereceli büyücüye sıradan bir Kara Şimşek işlemez!*`)
            // Gojo'nun saldırıyı durdurduğu veya epik bir blok gifi koyabilirsin
            .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNDk1NjI4ZmQ4YTNlOGIyNTRjNTI5Yzc2YzE5NjI0MTA3OWE4ZjRiMSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Jq1T4jCKm9039q9Z4K/giphy.gif') 
            .setFooter({ text: 'Yönetici kalkanı aşılamadı.' })
            .setTimestamp();

        return message.reply({ embeds: [blockEmbed] });
    }

    // NORMAL ÜYELER İÇİN MUTE İŞLEMİ (5 Dakikalık susturma)
    try {
        await target.timeout(5 * 60 * 1000, "Black Flash! - Kritik Vuruş");
        
        const blackFlashEmbed = new EmbedBuilder()
            .setColor('#000000')
            .setTitle('✨ KOKUSEN! (BLACK FLASH)')
            .setDescription(`<@${message.author.id}>, <@${target.id}> adlı kullanıcıya lanetli enerjinin özüyle vurdu! \n\n**Etki:** Kullanıcı **5 dakika** boyunca susturuldu.`)
            .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaTNwczRxZWdvemdhbHFvZ2k0NDk3OXM0YTU3dmUxeHh2MnQycHlhZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Sq8yO4JmUVWGaf1Zxs/giphy.gif')
            .setFooter({ text: 'Lanetli enerji 10^-7 saniye içinde çaktı!' })
            .setTimestamp();

        return message.reply({ embeds: [blackFlashEmbed] });

    } catch (err) {
        console.error(err);
        return message.reply("❌ Lanetli enerji dağıldı... (Bilinmeyen bir hata oluştu).");
    }
}

    

if (command === 'hollow') {
    // Sadece senin ID'ne özel
    if (message.author.id !== '983015347105976390') {
        return message.reply("❌ Bu tekniği kullanacak kadar yüksek bir lanetli enerji seviyesine sahip değilsin.");
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply("❌ Odaklanman lazım! Kime fırlatacağını seçmedin.");

    if (target.id === message.author.id) return message.reply("❌ Kendini mi yok etmek istiyorsun? Başka birini hedef al.");

    // YÖNETİCİ VEYA ÜSTÜN ROL KONTROLÜ (Sonsuzluk Kalkanı)
    if (target.permissions.has(PermissionsBitField.Flags.Administrator) || target.roles.highest.position >= message.guild.members.me.roles.highest.position) {
        const blockEmbed = new EmbedBuilder()
            .setColor('#ffffff')
            .setTitle('🛡️ Teknik Etkisiz Kılındı: Sonsuzluk!')
            .setDescription(`<@${message.author.id}>, <@${target.id}> üzerine yıkıcı bir **Hollow Purple** fırlattı!\n\nAncak hedefin etrafındaki uzay büküldü... Sanal kütle hedefe ulaşamadan uzay boşluğunda kayboldu! \n\n> *Bu seviyedeki bir büyücüye karşı tekniklerin işe yaramıyor.*`)
            .setImage('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3b3dld2Vwa2w1bDlrdXN2eHE3cmppNXdtcGowdDlwN2pzd3gzajQwaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/9Xx1OMQIiA9feabm70/giphy.gif') 
            .setFooter({ text: 'Özel Dereceli kalkanı aşılamadı.' })
            .setTimestamp();

        return message.reply({ embeds: [blockEmbed] });
    }

    // 1. KADEME: Kırmızı ve Mavi'nin Birleşimi (Hazırlık Aşaması)
    const stage1Embed = new EmbedBuilder()
        .setColor('#800080')
        .setTitle('🔴 🔵 Dönüşüm Başlıyor: Aka ve Ao...')
        .setDescription(`<@${message.author.id}>, Lanetli Teknik Sınırsızlık'ı en üst düzeye çıkarıyor!\n\n**Mavi (Çekim)** ve **Kırmızı (İtim)** birleşerek sanal bir kütle oluşturuyor... \n\n> *Hedef: <@${target.id}>! Kaçacak yerin yok.*`)
        .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWhkcGNhZmt4a3djcGMxN2o3OWRoN3NlazI1Y3p2M2xzb3AzazFqOCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/J5ClzFGMhiu8iuDZ4x/giphy.gif')
        .setFooter({ text: 'Uzaklık, hız... Her şey bükülüyor.' });

    // İlk mesajı gönderiyoruz
    const sentMessage = await message.reply({ embeds: [stage1Embed] });

    // 3 Saniye Sonra 2. Kademe (Hollow Purple) Devreye Giriyor
    setTimeout(async () => {
        // 7 Günlük Mute (7 gün * 24 saat * 60 dakika * 60 saniye * 1000 milisaniye)
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        try {
            await target.timeout(sevenDaysMs, "Kyoki Shin: Murasaki (Hollow Purple!)");

            // 2. KADEME: Hollow Purple Patlaması
            const stage2Embed = new EmbedBuilder()
                .setColor('#4b0082')
                .setTitle('🟣 Sanal Kütle: KYOKI SHIN: MURASAKI!')
                .setDescription(`⚡ **Hayal Gücü Gerçeğe Dönüştü!**\n\n<@${message.author.id}>, mor ışığı sergileyerek <@${target.id}> adlı kullanıcının varlığını haritadan sildi!\n\n**Etki:** Kullanıcı **7 GÜN** boyunca hiçliğe hapsedildi (Susturuldu).`)
                .setImage('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dTVnNmo0bnUzMjN3MDRrMXlrZnU4eHE3aHBpaXRhcHRmcjFtb3B0dSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/P2olhkZ061vEACZcSG/giphy.gif')
                .setFooter({ text: 'Sonsuzluk boşluğunda yok edildi.' })
                .setTimestamp();

            // İlk mesajı yeni embed ile güncelliyoruz
            await sentMessage.edit({ embeds: [stage2Embed] });

        } catch (err) {
            console.error(err);
            // Eğer bir aksilik çıkarsa mesajı hata moduna çeviriyoruz
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription("❌ Teknik odaklanırken dağıldı... Botun yetkilerini kontrol et.");
            await sentMessage.edit({ embeds: [errorEmbed] });
        }
    }, 3000); // 3000 milisaniye = 3 saniye bekleme süresi
}

    if (command === 'hollow10x') {
    // Sadece senin ID'ne özel
    if (message.author.id !== '983015347105976390') {
        return message.reply("❌ Bu tekniği kullanacak kadar yüksek bir lanetli enerji seviyesine sahip değilsin.");
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply("❌ Odaklanman lazım! Kime fırlatacağını seçmedin.");

    if (target.id === message.author.id) return message.reply("❌ Kendini mi yok etmek istiyorsun? Başka birini hedef al.");

    // YÖNETİCİ VEYA ÜSTÜN ROL KONTROLÜ (Sonsuzluk Kalkanı)
    if (target.permissions.has(PermissionsBitField.Flags.Administrator) || target.roles.highest.position >= message.guild.members.me.roles.highest.position) {
        const blockEmbed = new EmbedBuilder()
            .setColor('#ffffff')
            .setTitle('🛡️ Teknik Etkisiz Kılındı: Sonsuzluk!')
            .setDescription(`<@${message.author.id}>, <@${target.id}> üzerine yıkıcı bir **Hollow Purple** fırlattı!\n\nAncak hedefin etrafındaki uzay büküldü... Sanal kütle hedefe ulaşamadan uzay boşluğunda kayboldu! \n\n> *Bu seviyedeki bir büyücüye karşı tekniklerin işe yaramıyor.*`)
            .setImage('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3b3dld2Vwa2w1bDlrdXN2eHE3cmppNXdtcGowdDlwN2pzd3gzajQwaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/9Xx1OMQIiA9feabm70/giphy.gif') 
            .setFooter({ text: 'Özel Dereceli kalkanı aşılamadı.' })
            .setTimestamp();

        return message.reply({ embeds: [blockEmbed] });
    }

    // 1. KADEME: Kırmızı ve Mavi'nin Birleşimi (Hazırlık Aşaması)
    const stage1Embed = new EmbedBuilder()
        .setColor('#800080')
        .setTitle('🔴 🔵 Dönüşüm Başlıyor: Aka ve Ao...')
        .setDescription(`<@${message.author.id}>, Lanetli Teknik Sınırsızlık'ı en üst düzeye çıkarıyor!\n\n**Mavi (Çekim)** ve **Kırmızı (İtim)** birleşerek sanal bir kütle oluşturuyor... \n\n> *Hedef: <@${target.id}>! Kaçacak yerin yok.*`)
        .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWhkcGNhZmt4a3djcGMxN2o3OWRoN3NlazI1Y3p2M2xzb3AzazFqOCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/J5ClzFGMhiu8iuDZ4x/giphy.gif')
        .setFooter({ text: 'Uzaklık, hız... Her şey bükülüyor.' });

    // İlk mesajı gönderiyoruz
    const sentMessage = await message.reply({ embeds: [stage1Embed] });

    // 3 Saniye Sonra 2. Kademe (Hollow Purple) Devreye Giriyor
    setTimeout(async () => {
        try {
            // Ban işlemi burada gerçekleşiyor
            await target.ban({ reason: "Kyoki Shin: Murasaki (Hollow Purple!) - Varlıktan Silindi" });

            // 2. KADEME: Hollow Purple Patlaması
            const stage2Embed = new EmbedBuilder()
                .setColor('#4b0082')
                .setTitle('🟣 Sanal Kütle: KYOKI SHIN: MURASAKI!')
                .setDescription(`⚡ **Hayal Gücü Gerçeğe Dönüştü!**\n\n<@${message.author.id}>, mor ışığı sergileyerek <@${target.id}> adlı kullanıcının varlığını haritadan sildi!\n\n**Etki:** Kullanıcı hiçliğe hapsedildi (Sunucudan Kalıcı Olarak Banlandı).`)
                .setImage('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dTVnNmo0bnUzMjN3MDRrMXlrZnU4eHE3aHBpaXRhcHRmcjFtb3B0dSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/P2olhkZ061vEACZcSG/giphy.gif')
                .setFooter({ text: 'Sonsuzluk boşluğunda yok edildi.' })
                .setTimestamp();

            // İlk mesajı yeni embed ile güncelliyoruz
            await sentMessage.edit({ embeds: [stage2Embed] });

        } catch (err) {
            console.error(err);
            // Eğer bir aksilik çıkarsa mesajı hata moduna çeviriyoruz
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription("❌ Teknik odaklanırken dağıldı... Botun **Üyeleri Yasakla (Ban)** yetkisine sahip olduğundan ve hiyerarşide hedef kullanıcıdan üstte olduğundan emin ol.");
            await sentMessage.edit({ embeds: [errorEmbed] });
        }
    }, 3000); // 3000 milisaniye = 3 saniye bekleme süresi
}

if (command === 'domainexpansion') {
    // Sadece senin ID'ne özel
    if (message.author.id !== '983015347105976390') {
        return message.reply("❌ Bu teknik için gereken 'Altı Göz' sende yok.");
    }

    // 1. Atmosfer Yaratma: Önce ufak bir mesaj atıyoruz
    const initMessage = await message.channel.send("🤞 **Alan Genişletmesi...**");

    // 1.5 Saniye sonra asıl olayı patlatıyoruz
    setTimeout(async () => {
        // 2. Kanalı @everyone için kilitliyoruz (Kırmızı Çarpı)
        try {
            await message.channel.permissionOverwrites.edit(message.guild.id, {
                SendMessages: false
            });
            
            // Botun kendi yetkisini garantiye alıyoruz
            await message.channel.permissionOverwrites.edit(message.client.user.id, {
                SendMessages: true
            });
        } catch (err) {
            console.error("Alan genişletilirken hata:", err);
            return initMessage.edit("⚠️ Alan oluşturulamadı, botun kanalı yönetme yetkisi olduğundan emin ol.");
        }

        // 3. İnsanları içine çekecek, geliştirilmiş Epik Embed
        const domainEmbed = new EmbedBuilder()
            .setColor('#050505') // Çok koyu, boşluk hissi veren bir siyah
            .setTitle('🌌 Alan Genişletmesi: Sonsuz Boşluk (Infinite Void)')
            .setDescription('**Ace’in alanına hapsoldunuz.**\n\n> *Burada her şey sonsuzdur.\n> Görme, duyma, hissetme... Bilgi beyninize sonsuz bir akışla doluyor.\n> Hiçbir şey yapamazsınız, sadece izleyebilirsiniz.*')
            .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXM3emFuamx6aG9wdXdleDNydG0xZzF5aTAzYjZwMWtwYW9qZG4zcCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/q21Admcr8OpE2r0gmA/giphy.gif')
            .setFooter({ text: 'Sınırsızlık Sektörü aktif edildi.', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        // 4. İlk attığımız mesajı efsanevi embed ile değiştiriyoruz
        await initMessage.edit({ content: null, embeds: [domainEmbed] });
    }, 1500);
}

if (command === 'domainclose') {
    // Sadece senin ID'ne özel
    if (message.author.id !== '983015347105976390') {
        return message.reply("❌ Bu teknik için gereken 'Altı Göz' sende yok.");
    }

    // 1. Atmosfer Yaratma
    const initMessage = await message.channel.send("✨ **Alan çözülüyor...**");

    setTimeout(async () => {
        // 2. Alanı çözüyoruz: 'null' yerine 'true' yaparak YEŞİL TİK olmasını sağlıyoruz!
        try {
            await message.channel.permissionOverwrites.edit(message.guild.id, {
                SendMessages: true 
            });
        } catch (err) {
            console.error("Alan kapatılırken hata:", err);
            return initMessage.edit("⚠️ Alan çözülürken bir hata oluştu.");
        }

        // 3. Geliştirilmiş Kapanış Embedi
        const closeEmbed = new EmbedBuilder()
            .setColor('#ffffff') // Saf beyaz, aydınlanma hissi
            .setTitle('🕊️ Alan Kapatıldı: Gerçekliğe Dönüş')
            .setDescription('**Alan çözüldü, herkes şu an özgür.**\n\n> *Zihinlerinizdeki sonsuz bilgi akışı sona erdi.\n> Tekrar hareket edebilir, nefes alabilir ve konuşabilirsiniz.*')
            .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXM3emFuamx6aG9wdXdleDNydG0xZzF5aTAzYjZwMWtwYW9qZG4zcCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/pDbUdqmZtnJgaTLqQP/giphy.gif')
            .setFooter({ text: 'Sonsuz Boşluk sona erdi. Ace merhamet etti.', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        // 4. Kapanış mesajını güncelliyoruz
        await initMessage.edit({ content: null, embeds: [closeEmbed] });
    }, 1500);
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
