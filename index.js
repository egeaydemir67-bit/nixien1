const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Partials } = require('discord.js');

// Botun ihtiyaç duyduğu izinler (Intents)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const prefix = "!";
const logKanalAdi = "bot-log"; // Sunucunda bu isimde bir metin kanalı açmalısın

client.on('ready', () => {
    console.log(`[BAŞARILI] ${client.user.tag} ismiyle Discord'a giriş yapıldı!`);
    client.user.setActivity('!yardım | Sizlerle beraberim!', { type: 0 }); // 0 = Playing
});

// --- LOG SİSTEMİ (Mesaj Silinince Çalışır) ---
client.on('messageDelete', async message => {
    if (message.author?.bot) return; // Botların sildiği mesajları loglama
    
    const logChannel = message.guild.channels.cache.find(c => c.name === logKanalAdi);
    if (!logChannel) return; // Eğer sunucuda bot-log kanalı yoksa hata vermeden geç

    const logEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🗑️ Bir Mesaj Silindi!')
        .addFields(
            { name: 'Kullanıcı', value: `${message.author.tag}`, inline: true },
            { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
            { name: 'Mesaj İçeriği', value: message.content || 'İçerik bulunamadı veya medya dosyası.' }
        )
        .setTimestamp();

    try {
        await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
        console.log("Log kanalına mesaj gönderilemedi.");
    }
});

// --- KOMUT SİSTEMİ ---
client.on('messageCreate', async message => {
    // Mesajı yazan botsa veya prefix ile başlamıyorsa salla
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 📌 YARDIM MENÜSÜ
    if (command === 'yardım') {
        const yardimEmbed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle('🤖 Bot Yardım Menüsü')
            .setDescription('Kullanabileceğin komutlar aşağıda listelenmiştir:')
            .addFields(
                { name: '🎉 Eğlence', value: '`!aşkölç @kisi`, `!evlen @kisi`, `!kedisev`' },
                { name: '🛡️ Moderasyon', value: '`!sil <sayı>`, `!kick @kisi`, `!ban @kisi`' },
                { name: '📝 Bilgi', value: `Log sisteminin çalışması için sunucunda **${logKanalAdi}** isminde bir kanal oluşturmalısın.` }
            )
            .setFooter({ text: `${message.author.tag} tarafından istendi.`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        return message.reply({ embeds: [yardimEmbed] });
    }

    // 📌 EĞLENCE KOMUTLARI
    if (command === 'aşkölç') {
        const target = message.mentions.users.first();
        if (!target) return message.reply("Kiminle aşkını ölçeceksin? Birini etiketle! (!aşkölç @kullanıcı)");
        if (target.id === message.author.id) return message.reply("Kendinle aşk yaşayamazsın kanka, başka birini etiketle!");

        const askYuzdesi = Math.floor(Math.random() * 101); // 0-100 arası sayı
        let kalp = "💔";
        if (askYuzdesi > 50) kalp = "💖";
        if (askYuzdesi > 80) kalp = "🔥💘";

        return message.channel.send(`**${message.author.username}** ve **${target.username}** arasındaki aşk yüzdesi: **%${askYuzdesi}** ${kalp}`);
    }

    if (command === 'evlen') {
        const target = message.mentions.users.first();
        if (!target) return message.reply("Kiminle evleniyorsun kanka? Düğün davetiyesi için birini etiketle!");
        if (target.id === message.author.id) return message.reply("Yalnızlık zor biliyorum ama kendinle evlenemezsin...");

        return message.channel.send(`💍 Vay canına! **${message.author.username}**, **${target.username}** ile evlenme teklifi etti! Darısı başımıza! 🎉`);
    }

    if (command === 'kedisev') {
        return message.reply("Gırr... 🐈 Kediciği sevdin ve o da sana mırıldandı! Ne kadar tatlı!");
    }

    // 📌 MODERASYON KOMUTLARI
    if (command === 'sil') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply("Bunu yapmak için `Mesajları Yönet` yetkisine sahip olmalısın kanka.");
        }
        
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) {
            return message.reply("Lütfen silmek için 1 ile 100 arasında bir sayı gir. Örnek: `!sil 10`");
        }

        try {
            await message.channel.bulkDelete(miktar, true);
            const silindiMesaj = await message.channel.send(`🧹 Başarıyla **${miktar}** adet mesaj uzaya gönderildi!`);
            setTimeout(() => silindiMesaj.delete().catch(()=>{}), 5000); // 5 saniye sonra silindi uyarısını da siler
        } catch (error) {
            console.error(error);
            return message.reply("Mesajları silerken bir hata oluştu. 14 günden eski mesajları silemem, Discord izin vermiyor.");
        }
    }

    if (command === 'kick') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return message.reply("Bunun için `Üyeleri At` yetkin olmalı.");
        const target = message.mentions.members.first();
        if (!target) return message.reply("Kimi sunucudan atacağız? Birini etiketle!");
        if (!target.kickable) return message.reply("Bu kullanıcının yetkisi benden yüksek veya aynı yetkideyiz, onu atamam.");

        try {
            await target.kick();
            return message.reply(`👢 **${target.user.tag}** sunucudan başarıyla postalandı.`);
        } catch (error) {
            return message.reply("Kullanıcıyı atarken bir hata oluştu.");
        }
    }

    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply("Bunun için `Üyeleri Yasakla` yetkin olmalı.");
        const target = message.mentions.members.first();
        if (!target) return message.reply("Kimi banlayacağız? Birini etiketle!");
        if (!target.bannable) return message.reply("Bu kullanıcının yetkisi benden yüksek, banlayamam kanka.");

        try {
            await target.ban();
            return message.reply(`🔨 **${target.user.tag}** sunucudan yasaklandı. Bir daha dönemez!`);
        } catch (error) {
            return message.reply("Kullanıcıyı banlarken bir hata oluştu.");
        }
    }
});

// --- TOKEN GİRİŞİ ---
// Aşağıdaki tirnak icine kendi tokenini koy!
client.login('SENIN_BOT_TOKENINI_BURAYA_YAPISTIR');
