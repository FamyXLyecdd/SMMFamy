# SMMFamy - SMM Panel

A complete SMM (Social Media Marketing) panel built with vanilla HTML/CSS/JavaScript and Vercel serverless functions.

## 🚀 Features

- **5,900+ Services** - Direct integration with SMMGen API
- **Real-time Pricing** - PHP pricing with customizable markup
- **User Authentication** - JWT-based secure auth
- **Admin Dashboard** - Full admin panel for management
- **Payment System** - GCash/Maya manual payment support
- **Support Tickets** - Built-in customer support system
- **Responsive Design** - Works on all devices

## 📦 Deployment

### Deploy to Vercel (Recommended)

1. **Fork/Clone this repository**

2. **Deploy to Vercel**
   ```bash
   npx vercel
   ```

3. **Set Environment Variables** in Vercel Dashboard:
   - `SMMGEN_API_KEY` - Your SMMGen API key
   - `JWT_SECRET` - A strong random string (32+ characters)
   - `ADMIN_EMAIL` - Admin email address

4. **Done!** Your panel is live.

### Local Development

1. **Install dependencies** (only needed for proxy server)
   ```bash
   # No npm install needed for static files
   ```

2. **Start the proxy server** (for API calls)
   ```bash
   node proxy-server.js
   ```

3. **Start the web server**
   ```bash
   python -m http.server 8080
   # or
   npx serve .
   ```

4. **Open** http://localhost:8080

## 🔑 Default Admin Access

- **Email:** kageroufs@gmail.com
- **Password:** yinyangtaichi

⚠️ **Change these credentials in production!**

## 📁 Project Structure

```
smm/
├── api/                    # Vercel serverless functions
│   ├── smmgen.js          # SMMGen API proxy
│   ├── auth.js            # Authentication
│   ├── orders.js          # Order management
│   ├── user.js            # User profile/balance
│   ├── admin.js           # Admin operations
│   └── tickets.js         # Support tickets
├── css/
│   ├── styles.css         # Design system & tokens
│   ├── components.css     # UI components
│   ├── pages.css          # Page-specific styles
│   └── animations.css     # Animation library
├── js/
│   ├── api.js             # API wrapper
│   ├── auth.js            # Frontend auth
│   ├── app.js             # Main controller
│   └── ...                # Other modules
├── assets/
│   └── logos/             # Platform icons
├── index.html             # Landing page
├── services.html          # Order services
├── dashboard.html         # User dashboard
├── admin.html             # Admin panel
├── vercel.json            # Vercel config
└── README.md              # This file
```

## 🔒 Security Features

- **JWT Authentication** - Stateless, secure tokens
- **Password Hashing** - SHA-256 with salt
- **Rate Limiting** - Prevents brute force attacks
- **Input Validation** - Sanitizes all user input
- **CORS Protection** - Configured for production
- **Security Headers** - X-Frame-Options, XSS protection, etc.

## ⚙️ Configuration

Edit `js/api.js` to adjust:

```javascript
SMMApi.phpRate = 56;         // USD to PHP rate
SMMApi.profitMultiplier = 2.5; // Your profit margin (2.5x = 150% markup)
```

## 🛠️ API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/smmgen` | SMMGen API proxy |
| `/api/auth` | User authentication |
| `/api/orders` | Order management |
| `/api/user` | User profile & balance |
| `/api/admin` | Admin operations |
| `/api/tickets` | Support tickets |

## 📱 Pages

- `/` - Landing page
- `/services` - Browse & order services
- `/orders` - Order history
- `/dashboard` - User dashboard
- `/funds` - Add funds
- `/tickets` - Support tickets
- `/admin` - Admin panel

## 🎨 Theme

The panel uses a **pastel purple and white** theme with:
- Primary color: `#a855f7` (Purple 500)
- Font: Nunito
- Border radius: 8-16px
- Smooth animations

## 📄 License

MIT License - feel free to use for your own panels!

## 🆘 Support

For issues with the panel, create a GitHub issue.

For SMMGen API issues, contact SMMGen support.
