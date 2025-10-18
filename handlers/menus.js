import chalk from 'chalk';

class MenuHandler {
    constructor(bot) {
        this.bot = bot;
        this.config = bot.config;
    }

    async showMainMenu(reply, isGroup = false) {
        const menuText = `
🤖 *RACORE BOT PREMIUM MENYU* 🚀

🎯 *ƏSAS ƏMRLƏR:*

👥 *Qrup İdarəetmə:*
\`\`\`${this.config.prefix}tagall | ${this.config.prefix}groupinfo | ${this.config.prefix}kick | ${this.config.prefix}promote\`\`\`

👤 *Şəxsi Əmrlər:*
\`\`\`${this.config.prefix}alive | ${this.config.prefix}ping | ${this.config.prefix}speed | ${this.config.prefix}runtime\`\`\`

📱 *WhatsApp Tools:*
\`\`\`${this.config.prefix}getpp | ${this.config.prefix}getbio | ${this.config.prefix}block | ${this.config.prefix}unblock\`\`\`

🎮 *Əyləncə & Oyun:*
\`\`\`${this.config.prefix}sticker | ${this.config.prefix}joke | ${this.config.prefix}meme | ${this.config.prefix}quote\`\`\`

⚡ *Sürətli Alətlər:*
\`\`\`${this.config.prefix}weather | ${this.config.prefix}calc | ${this.config.prefix}translate | ${this.config.prefix}speedtest\`\`\`

🔧 *Bot Kontrol:*
\`\`\`${this.config.prefix}menu | ${this.config.prefix}help | ${this.config.prefix}status | ${this.config.prefix}restart\`\`\`

📖 *İstifadə Qaydası:*
   ↳ Əmr: \`${this.config.prefix}əmr\`
   ↳ Kömək: \`${this.config.prefix}help əmr\`
   ↳ Status: \`${this.config.prefix}alive\`

👑 *Yaradıcı:* ${this.config.ownerName}
🧩 *Team:* ${this.config.author}
💎 *Versiya:* 3.0.0 Premium
🔗 *Dəstək:* ${this.config.ownerNumber}

💡 *Tip:* Hər hansı əmr haqqında ətraflı məlumat üçün \`${this.config.prefix}help əmr\` yazın!
        `.trim();

        await reply(menuText);
    }

    async showGroupMenu(reply) {
        const groupMenu = `
👥 *Qrup İdarəetmə Menyu*

🔧 *Əsas Əmrlər:*
\`\`\`${this.config.prefix}tagall - Hamını tag et
${this.config.prefix}kick @user - İstifadəçini at
${this.config.prefix}promote @user - Admin et
${this.config.prefix}demote @user - Adminliyi al
${this.config.prefix}groupinfo - Qrup məlumatı
${this.config.prefix}linkgroup - Qrup linki\`\`\`

🚫 *Moderasiya:*
\`\`\`${this.config.prefix}closegroup - Qrupu bağla
${this.config.prefix}opengroup - Qrupu aç
${this.config.prefix}add @user - İstifadəçi əlavə et
${this.config.prefix}leave - Qrupu tərk et\`\`\`

📊 *Qrup Statistikası:*
\`\`\`${this.config.prefix}listadmin - Adminləri göstər
${this.config.prefix}listonline - Onlaynları göstər
${this.config.prefix}groupstats - Qrup statistikası\`\`\`

👑 *Admin Əmrləri:* Yalnız qrup adminləri üçün
        `.trim();

        await reply(groupMenu);
    }

    async showOwnerMenu(reply) {
        const ownerMenu = `
👑 *Sahib Kontrol Paneli*

⚡ *Sistem Əmrləri:*
\`\`\`${this.config.prefix}restart - Botu yenidən başlat
${this.config.prefix}shutdown - Botu söndür
${this.config.prefix}status - Bot statusu
${this.config.prefix}backup - Backup yarat\`\`\`

📢 *Yayım Əmrləri:*
\`\`\`${this.config.prefix}broadcast - Hamıya mesaj
${this.config.prefix}bcgroup - Qruplara mesaj
${this.config.prefix}bcuser - İstifadəçilərə mesaj\`\`\`

🔧 *Bot Konfiq:*
\`\`\`${this.config.prefix}getsession - Session əldə et
${this.config.prefix}setprefix - Prefix dəyiş
${this.config.prefix}blocklist - Blok siyahısı\`\`\`

📈 *Statistika:*
\`\`\`${this.config.prefix}botstats - Bot statistikası
${this.config.prefix}userstats - İstifadəçi statistikası
${this.config.prefix}cmdstats - Əmr statistikası\`\`\`

⚠️ *Diqqət:* Bu əmrlər yalnız bot sahibi tərəfindən işlədilə bilər
        `.trim();

        await reply(ownerMenu);
    }

    async showMediaMenu(reply) {
        const mediaMenu = `
🎨 *Media & Fayl Əmrləri*

🖼️ *Şəkil Əmrləri:*
\`\`\`${this.config.prefix}sticker - Şəkli stiker et
${this.config.prefix}toimg - Stickerı şəklə çevir
${this.config.prefix}attp - Rəngli text yarat
${this.config.prefix}styletext - Stilish text\`\`\`

🎵 *Audio/Video:*
\`\`\`${this.config.prefix}play - Musiqi yüklə
${this.config.prefix}ytmp3 - YouTube-dan mp3
${this.config.prefix}ytmp4 - YouTube-dan mp4
${this.config.prefix}tomp3 - Səsli mesajı mp3 et\`\`\`

📁 *Fayl Əmrləri:*
\`\`\`${this.config.prefix}upload - Fayl yüklə
${this.config.prefix}download - Fayl endir
${this.config.prefix}getfile - Fayl əldə et\`\`\`

🌐 *İnternet:*
\`\`\`${this.config.prefix}ssweb - Sayt screenshot
${this.config.prefix}shorturl - Link qısalt
${this.config.prefix}gitclone - GitHub-dan endir\`\`\`
        `.trim();

        await reply(mediaMenu);
    }

    async showFunMenu(reply) {
        const funMenu = `
🎮 *Əyləncə & Oyunlar Menyu*

😄 *Əyləncə Əmrləri:*
\`\`\`${this.config.prefix}joke - Zarafat
${this.config.prefix}meme - Təsadüfi meme
${this.config.prefix}fact - Maraqlı fakt
${this.config.prefix}quote - Təsadüfi söz\`\`\`

🎲 *Oyun Əmrləri:*
\`\`\`${this.config.prefix}slot - Slot maşını
${this.config.prefix}guess - Rəqəm tap
${this.config.prefix}math - Riyaziyyat oyunu
${this.config.prefix}quiz - Viktorina\`\`\`

🔮 *Əyləncəli:*
\`\`\`${this.config.prefix}rate - Qiymətləndir
${this.config.prefix}character - Xarakter analizi
${this.config.prefix}compatibility - Uyğunluq testi
${this.config.prefix}truth - Həqiqət oyunu\`\`\`

📚 *Bilik:*
\`\`\`${this.config.prefix}define - Söz mənası
${this.config.prefix}wiki - Wikipedia axtarış
${this.config.prefix}news - Son xəbərlər\`\`\`
        `.trim();

        await reply(funMenu);
    }

    async showToolMenu(reply) {
        const toolMenu = `
⚙️ *Alətlər & Utilitilər*

🔧 *Faydalı Alətlər:*
\`\`\`${this.config.prefix}calc - Kalkulyator
${this.config.prefix}translate - Tərcümə
${this.config.prefix}weather - Hava proqnozu
${this.config.prefix}speedtest - İnternet sürəti\`\`\`

📊 *Konvertasiya:*
\`\`\`${this.config.prefix}currency - Valyuta konvertoru
${this.config.prefix}unit - Ölçü vahidləri
${this.config.prefix}time - Vaxt konvertoru
${this.config.prefix}crypto - Kripto valyuta\`\`\`

🔍 *Axtarış:*
\`\`\`${this.config.prefix}google - Google axtarış
${this.config.prefix}youtube - YouTube axtarış
${this.config.prefix}github - GitHub axtarış
${this.config.prefix}movie - Film axtarış\`\`\`

📅 *Planlaşdırıcı:*
\`\`\`${this.config.prefix}reminder - Xatırlatma
${this.config.prefix}timer - Taymer
${this.config.prefix}schedule - Planlaşdırma
${this.config.prefix}countdown - Geri sayım\`\`\`
        `.trim();

        await reply(toolMenu);
    }
}

export default MenuHandler;
