// ═══════════════════════════════════════════
// بوت تميمة شوز - تليجرام
// ═══════════════════════════════════════════
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // رقم/آيدي تليجرام بتاعك تستقبل عليه إشعارات الطلبات
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY; // اختياري - للردود الذكية

if (!BOT_TOKEN) {
  console.error('❌ لازم تضيف BOT_TOKEN في الـ Environment Variables');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ─── بيانات المنتجات (تجريبية - استبدلها ببياناتك الحقيقية) ───
const PRODUCTS_FILE = path.join(__dirname, 'products.json');
function loadProducts() {
  try {
    return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

// ─── تخزين الطلبات وحالة المستخدمين في الذاكرة ───
const ORDERS_FILE = path.join(__dirname, 'orders.json');
function loadOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); } catch (e) { return []; }
}
function saveOrder(order) {
  const orders = loadOrders();
  orders.push(order);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

const userState = {}; // userId -> { step, data }

// ═══════════════════════════════════════════
// القائمة الرئيسية
// ═══════════════════════════════════════════
function mainMenu() {
  return Markup.keyboard([
    ['🛍️ المنتجات', '💰 الأسعار'],
    ['🚚 التوصيل', '📞 تواصل معنا'],
    ['🧾 عمل طلب', '❓ سؤال تاني'],
  ]).resize();
}

bot.start((ctx) => {
  ctx.reply(
    `👋 أهلاً بيك في *تميمة شوز*\nمتجر شباشب جملة بأعلى جودة وأسعار منافسة.\n\nاختار من القائمة تحت أو اكتب سؤالك مباشرة 👇`,
    { parse_mode: 'Markdown', ...mainMenu() }
  );
});

bot.command('menu', (ctx) => {
  ctx.reply('القائمة الرئيسية 👇', mainMenu());
});

// ═══════════════════════════════════════════
// المنتجات
// ═══════════════════════════════════════════
bot.hears('🛍️ المنتجات', (ctx) => sendProducts(ctx));
bot.command('products', (ctx) => sendProducts(ctx));

function sendProducts(ctx) {
  const products = loadProducts();
  if (products.length === 0) {
    return ctx.reply('لسه مفيش منتجات متاحة دلوقتي، تواصل معانا مباشرة للاستفسار 🙏');
  }
  let msg = '🛍️ *منتجاتنا المتاحة:*\n\n';
  products.forEach((p, i) => {
    msg += `${i + 1}. *${p.name}*\n   💰 ${p.price} جنيه | 📦 ${p.moq}\n\n`;
  });
  msg += 'عايز تطلب أي منتج؟ اكتب "عمل طلب" 🧾';
  ctx.reply(msg, { parse_mode: 'Markdown' });
}

// ═══════════════════════════════════════════
// الأسعار
// ═══════════════════════════════════════════
bot.hears('💰 الأسعار', (ctx) => {
  ctx.reply(
    `💰 *أسعار الجملة:*\n\nالأسعار بتختلف حسب الكمية والموديل.\nكل ما تطلب كمية أكبر، كل ما السعر يقل.\n\nاضغط "🛍️ المنتجات" لعرض الأسعار التفصيلية، أو "🧾 عمل طلب" لعرض سعر مخصص.`,
    { parse_mode: 'Markdown' }
  );
});

// ═══════════════════════════════════════════
// التوصيل
// ═══════════════════════════════════════════
bot.hears('🚚 التوصيل', (ctx) => {
  ctx.reply(
    `🚚 *التوصيل:*\n\n✅ بنوصل لجميع محافظات مصر\n⏱️ خلال 24-48 ساعة\n📦 الشحن بيتحدد حسب المحافظة والكمية\n💵 الدفع: كاش عند الاستلام (أو مقدم حسب الكمية)`,
    { parse_mode: 'Markdown' }
  );
});

// ═══════════════════════════════════════════
// تواصل معنا
// ═══════════════════════════════════════════
bot.hears('📞 تواصل معنا', (ctx) => {
  ctx.reply(
    `📞 *تواصل معانا:*\n\n💬 واتساب: 01150634927\n📧 إيميل: bodydoda2025@gmail.com\n📍 ٦ أكتوبر، مصر`,
    { parse_mode: 'Markdown' }
  );
});

// ═══════════════════════════════════════════
// عمل طلب (محادثة متعددة الخطوات)
// ═══════════════════════════════════════════
bot.hears('🧾 عمل طلب', (ctx) => {
  userState[ctx.from.id] = { step: 'product', data: {} };
  ctx.reply('تمام! 📝 اكتب اسم المنتج اللي عايز تطلبه:', Markup.removeKeyboard());
});

bot.command('order', (ctx) => {
  userState[ctx.from.id] = { step: 'product', data: {} };
  ctx.reply('تمام! 📝 اكتب اسم المنتج اللي عايز تطلبه:', Markup.removeKeyboard());
});

// ═══════════════════════════════════════════
// سؤال تاني (ردود ذكية عبر Claude API)
// ═══════════════════════════════════════════
bot.hears('❓ سؤال تاني', (ctx) => {
  ctx.reply('اكتب سؤالك وهرد عليك على طول 💬');
});

// ═══════════════════════════════════════════
// استقبال أي رسالة نصية (يتعامل مع خطوات الطلب أو الأسئلة الحرة)
// ═══════════════════════════════════════════
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;
  const state = userState[userId];

  // تجاهل لو كانت ضمن قائمة الأزرار الرئيسية (متعالجة فوق بالفعل)
  const mainButtons = ['🛍️ المنتجات', '💰 الأسعار', '🚚 التوصيل', '📞 تواصل معنا', '🧾 عمل طلب', '❓ سؤال تاني'];
  if (mainButtons.includes(text)) return;

  // ─── لو المستخدم في منتصف خطوات الطلب ───
  if (state) {
    if (state.step === 'product') {
      state.data.product = text;
      state.step = 'quantity';
      return ctx.reply('📦 تمام، اكتب الكمية المطلوبة (عدد الكراتين أو الجوزات):');
    }
    if (state.step === 'quantity') {
      state.data.quantity = text;
      state.step = 'phone';
      return ctx.reply('📱 اكتب رقم تليفونك للتواصل:');
    }
    if (state.step === 'phone') {
      state.data.phone = text;
      state.step = 'address';
      return ctx.reply('📍 اكتب عنوانك بالتفصيل (المحافظة والمنطقة):');
    }
    if (state.step === 'address') {
      state.data.address = text;
      state.data.username = ctx.from.username || ctx.from.first_name;
      state.data.userId = userId;
      state.data.date = new Date().toISOString();

      saveOrder(state.data);

      // تأكيد للعميل
      await ctx.reply(
        `✅ *تم استلام طلبك بنجاح!*\n\n📦 المنتج: ${state.data.product}\n🔢 الكمية: ${state.data.quantity}\n📱 التليفون: ${state.data.phone}\n📍 العنوان: ${state.data.address}\n\nهنتواصل معاك في أقرب وقت لتأكيد الطلب 🙏`,
        { parse_mode: 'Markdown', ...mainMenu() }
      );

      // إشعار للأدمن
      if (ADMIN_CHAT_ID) {
        try {
          await ctx.telegram.sendMessage(
            ADMIN_CHAT_ID,
            `🔔 *طلب جديد!*\n\n👤 العميل: @${state.data.username}\n📦 المنتج: ${state.data.product}\n🔢 الكمية: ${state.data.quantity}\n📱 التليفون: ${state.data.phone}\n📍 العنوان: ${state.data.address}`,
            { parse_mode: 'Markdown' }
          );
        } catch (e) {
          console.error('فشل إرسال إشعار الأدمن:', e.message);
        }
      }

      delete userState[userId];
      return;
    }
  }

  // ─── سؤال حر: رد ذكي عبر Claude API (لو الـ API Key متوفر) ───
  if (ANTHROPIC_API_KEY) {
    try {
      await ctx.sendChatAction('typing');
      const products = loadProducts();
      const productsContext = products.map(p => `${p.name}: ${p.price} جنيه (${p.moq})`).join('\n');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 400,
          system: `أنت مساعد خدمة عملاء لمتجر "تميمة شوز" - متجر شباشب جملة في مصر. رد بالعربية المصرية بشكل ودود ومختصر. معلومات المتجر:
- التوصيل لجميع محافظات مصر خلال 24-48 ساعة
- الدفع كاش عند الاستلام
- التواصل: واتساب 01150634927
المنتجات المتاحة حالياً:
${productsContext || 'لا توجد منتجات مضافة بعد'}
لو السؤال عن طلب أو سعر منتج معين، وجّه العميل لاستخدام أمر "عمل طلب" أو زر "🛍️ المنتجات".`,
          messages: [{ role: 'user', content: text }],
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || 'معلش حصل خطأ، حاول تسأل تاني أو تواصل معانا على واتساب 01150634927';
      return ctx.reply(reply);
    } catch (e) {
      console.error('Claude API error:', e.message);
      return ctx.reply('معلش حصل خطأ مؤقت، جرب تستخدم القائمة 👇 أو تواصل معانا على واتساب 01150634927', mainMenu());
    }
  }

  // ─── لو مفيش Claude API متاح: رد افتراضي ───
  ctx.reply('مفهمتش سؤالك بالظبط 🤔 جرب تستخدم القائمة تحت أو اكتب "عمل طلب" لو عايز تطلب منتج:', mainMenu());
});

// ═══════════════════════════════════════════
// تشغيل البوت
// ═══════════════════════════════════════════
bot.launch().then(() => {
  console.log('✅ بوت تميمة شوز شغال دلوقتي!');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
