window.EmailTemplates = [
    {
        id: 'sell_products',
        name: '🛍️ Sell Products',
        subject: 'New Collection is Here!',
        blocks: [
            { type: 'image', content: '<img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&h=300&q=80" style="max-width:100%;height:auto;display:block;border-radius:8px;">' },
            { type: 'text', content: '<h1 style="font-family:Helvetica,Arial,sans-serif;font-size:24px;color:#241C15;text-align:center;margin-top:20px;">Shop Our Newest Arrivals</h1><p style="font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#4a4a4a;text-align:center;">Discover the latest trends and upgrade your lifestyle today.</p>' },
            { type: 'button', content: '<div style="text-align:center;padding:20px;"><a href="#" style="background:#059669;color:#fff;padding:14px 32px;text-decoration:none;display:inline-block;border-radius:4px;font-weight:bold;font-family:Helvetica,Arial,sans-serif;">Shop Now</a></div>' }
        ]
    },
    {
        id: 'make_announcement',
        name: '📢 Announcement',
        subject: 'Big News: We are Expanding!',
        blocks: [
            { type: 'text', content: '<h1 style="font-family:Helvetica,Arial,sans-serif;font-size:28px;color:#0f172a;text-align:center;">We have some exciting news!</h1><p style="font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#475569;text-align:center;line-height:1.6;">After months of hard work, we are thrilled to announce that we are expanding our services globally.</p>' },
            { type: 'divider', content: '<hr style="border:0;border-top:1px solid #e2e8f0;margin:30px 0;">' },
            { type: 'image', content: '<img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&h=300&q=80" style="max-width:100%;height:auto;display:block;">' },
            { type: 'button', content: '<div style="text-align:center;padding:20px;"><a href="#" style="background:#2563eb;color:#fff;padding:12px 28px;text-decoration:none;display:inline-block;border-radius:8px;font-weight:bold;font-family:Helvetica,Arial,sans-serif;">Read the Full Story</a></div>' }
        ]
    },
    {
        id: 'newsletter',
        name: '📰 Newsletter',
        subject: 'Your Weekly Digest',
        blocks: [
            { type: 'text', content: '<h2 style="font-family:Helvetica,Arial,sans-serif;font-size:20px;color:#0f172a;text-transform:uppercase;letter-spacing:1px;text-align:center;">Weekly Digest</h2>' },
            { type: 'divider', content: '<hr style="border:0;border-top:2px solid #0f172a;margin:20px 0;">' },
            { type: 'image', content: '<img src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=600&h=200&q=80" style="max-width:100%;height:auto;display:block;">' },
            { type: 'text', content: '<h3 style="font-family:Helvetica,Arial,sans-serif;font-size:18px;color:#0f172a;margin-top:20px;">Top Stories This Week</h3><p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#475569;line-height:1.6;">Check out the most read articles and updates from our community.</p>' },
            { type: 'button', content: '<div style="text-align:left;padding:10px 0;"><a href="#" style="background:#1e293b;color:#fff;padding:10px 20px;text-decoration:none;display:inline-block;border-radius:4px;font-weight:bold;font-family:Helvetica,Arial,sans-serif;">Read More</a></div>' }
        ]
    },
    {
        id: 'welcome_email',
        name: '👋 Welcome Email',
        subject: 'Welcome to the Family! 🎁',
        blocks: [
            { type: 'image', content: '<img src="https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&h=300&q=80" style="max-width:100%;height:auto;display:block;">' },
            { type: 'text', content: '<h1 style="font-family:Helvetica,Arial,sans-serif;font-size:26px;color:#241C15;text-align:center;margin-top:20px;">Welcome Aboard!</h1><p style="font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#4a4a4a;text-align:center;line-height:1.6;">We are so glad you are here. As a special thank you, use code <b>WELCOME20</b> for 20% off your first purchase.</p>' },
            { type: 'button', content: '<div style="text-align:center;padding:20px;"><a href="#" style="background:#db2777;color:#fff;padding:14px 32px;text-decoration:none;display:inline-block;border-radius:4px;font-weight:bold;font-family:Helvetica,Arial,sans-serif;">Claim Your Discount</a></div>' }
        ]
    },
    {
        id: 'cold_email',
        name: '❄️ Cold Email',
        subject: 'Quick question about your marketing',
        blocks: [
            { type: 'text', content: '<p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#000000;line-height:1.5;">Hi {{first_name}},<br><br>I noticed you are doing some great work at your company and wanted to reach out.<br><br>We help businesses like yours scale their operations efficiently. Would you be open to a quick 10-minute chat next Tuesday?<br><br>Best regards,<br>John Doe</p>' }
        ]
    },
    {
        id: 'flash_sale',
        name: '⚡ Flash Sale',
        subject: '24 HOURS ONLY: 50% OFF!',
        blocks: [
            { type: 'text', content: '<div style="background:#ef4444;padding:40px 20px;text-align:center;color:#fff;border-radius:8px;"><h1 style="font-family:Helvetica,Arial,sans-serif;font-size:36px;margin:0;">FLASH SALE</h1><p style="font-family:Helvetica,Arial,sans-serif;font-size:20px;margin:10px 0 0 0;">50% OFF SITEWIDE</p></div>' },
            { type: 'text', content: '<p style="font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#4a4a4a;text-align:center;margin-top:20px;">Hurry! Offer ends in 24 hours. Don\'t miss out on our biggest sale of the season.</p>' },
            { type: 'button', content: '<div style="text-align:center;padding:20px;"><a href="#" style="background:#0f172a;color:#fff;padding:16px 40px;text-decoration:none;display:inline-block;border-radius:4px;font-weight:bold;font-family:Helvetica,Arial,sans-serif;">SHOP THE SALE</a></div>' }
        ]
    },
    {
        id: 'app_download',
        name: '📱 App Download',
        subject: 'Take us anywhere with the new App',
        blocks: [
            { type: 'image', content: '<img src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&h=300&q=80" style="max-width:100%;height:auto;display:block;">' },
            { type: 'text', content: '<h2 style="font-family:Helvetica,Arial,sans-serif;font-size:24px;color:#0f172a;text-align:center;">The New Mobile App is Here</h2><p style="font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#475569;text-align:center;">Manage your account, get exclusive deals, and more right from your pocket.</p>' },
            { type: 'button', content: '<div style="text-align:center;padding:20px;"><a href="#" style="background:#000;color:#fff;padding:14px 32px;text-decoration:none;display:inline-block;border-radius:24px;font-weight:bold;font-family:Helvetica,Arial,sans-serif;">Download on App Store</a></div>' }
        ]
    },
    {
        id: 'webinar_invite',
        name: '🎥 Webinar Invite',
        subject: 'Join our free masterclass!',
        blocks: [
            { type: 'text', content: '<h1 style="font-family:Helvetica,Arial,sans-serif;font-size:26px;color:#241C15;">Mastering Email Marketing in 2026</h1><p style="font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#4a4a4a;line-height:1.6;">Join industry experts as they break down the secrets to high-converting emails.</p>' },
            { type: 'divider', content: '<hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0;">' },
            { type: 'text', content: '<p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#64748b;"><b>Date:</b> Thursday, Nov 12<br><b>Time:</b> 2:00 PM EST</p>' },
            { type: 'button', content: '<div style="text-align:left;padding:10px 0;"><a href="#" style="background:#2563eb;color:#fff;padding:12px 28px;text-decoration:none;display:inline-block;border-radius:4px;font-weight:bold;font-family:Helvetica,Arial,sans-serif;">Save My Seat</a></div>' }
        ]
    },
    {
        id: 'thank_you',
        name: '💖 Thank You',
        subject: 'Thank you for your purchase!',
        blocks: [
            { type: 'text', content: '<h2 style="font-family:Helvetica,Arial,sans-serif;font-size:28px;color:#0f172a;text-align:center;">Thank You!</h2><p style="font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#475569;text-align:center;">We appreciate your business. Your order is being processed and will ship soon.</p>' },
            { type: 'button', content: '<div style="text-align:center;padding:20px;"><a href="#" style="background:#10b981;color:#fff;padding:12px 28px;text-decoration:none;display:inline-block;border-radius:4px;font-weight:bold;font-family:Helvetica,Arial,sans-serif;">Track Order</a></div>' }
        ]
    },
    {
        id: 'educational',
        name: '📚 Educational',
        subject: '3 Tips for better productivity',
        blocks: [
            { type: 'image', content: '<img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&h=300&q=80" style="max-width:100%;height:auto;display:block;">' },
            { type: 'text', content: '<h2 style="font-family:Helvetica,Arial,sans-serif;font-size:24px;color:#0f172a;">Work Smarter, Not Harder</h2><p style="font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#475569;line-height:1.6;">Here are three strategies our team uses to stay focused and get more done.</p>' },
            { type: 'divider', content: '<hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0;">' },
            { type: 'text', content: '<h3 style="font-family:Helvetica,Arial,sans-serif;font-size:18px;color:#0f172a;">1. Time Blocking</h3><p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#475569;">Dedicate specific blocks of time to deep work.</p>' }
        ]
    },
    {
        id: 'review_request',
        name: '⭐ Review Request',
        subject: 'How did we do?',
        blocks: [
            { type: 'text', content: '<h2 style="font-family:Helvetica,Arial,sans-serif;font-size:24px;color:#0f172a;text-align:center;">We value your opinion!</h2><p style="font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#475569;text-align:center;line-height:1.6;">It looks like you recently received your order. We would love to hear about your experience.</p>' },
            { type: 'button', content: '<div style="text-align:center;padding:20px;"><a href="#" style="background:#f59e0b;color:#fff;padding:14px 32px;text-decoration:none;display:inline-block;border-radius:8px;font-weight:bold;font-family:Helvetica,Arial,sans-serif;">Leave a Review</a></div>' }
        ]
    },
    {
        id: 'abandoned_cart',
        name: '🛒 Abandoned Cart',
        subject: 'You left something behind...',
        blocks: [
            { type: 'text', content: '<h2 style="font-family:Helvetica,Arial,sans-serif;font-size:24px;color:#0f172a;text-align:center;">Still thinking about it?</h2><p style="font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#475569;text-align:center;">Your cart is waiting for you. Complete your purchase now before items run out of stock.</p>' },
            { type: 'button', content: '<div style="text-align:center;padding:20px;"><a href="#" style="background:#0f172a;color:#fff;padding:14px 32px;text-decoration:none;display:inline-block;border-radius:4px;font-weight:bold;font-family:Helvetica,Arial,sans-serif;">Return to Cart</a></div>' }
        ]
    }
];
