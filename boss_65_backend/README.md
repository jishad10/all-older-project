## 🔧 Environment Setup

Api Documentation : https://documenter.getpostman.com/view/44715743/2sB2x6mCDe

To run this project locally, you must create a `.env` file in the root directory and populate it with the following variables. You can use `.env.example` as a reference.

### Required Environment Variables:

| Variable | Description |
|----------|-------------|
| `PORT` | Port the server runs on (e.g. `5000`) |
| `MONGO_URI` | MongoDB connection string (e.g. from MongoDB Atlas) |
| `ACCESS_TOKEN_SECRET` | Secret used for JWT access tokens |
| `ACCESS_TOKEN_EXPIRES` | JWT access token expiry (e.g. `7d`) |
| `REFRESH_TOKEN_SECRET` | Secret for refresh tokens (should differ from access token) |
| `REFRESH_TOKEN_EXPIRES` | JWT refresh token expiry (e.g. `10d`) |
| `SALT` | Number of salt rounds for password hashing (e.g. `10`) |

### Cloudinary (for image uploads):
| Variable | Description |
|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |

### Email Configuration:
| Variable | Description |
|----------|-------------|
| `EMAIL_EXPIRES` | OTP or link expiry in milliseconds (e.g. `900000` = 15 mins) |
| `EMAIL_HOST` | SMTP host (e.g. `smtp.gmail.com`) |
| `EMAIL_PORT` | SMTP port (usually `587`) |
| `EMAIL_ADDRESS` | Your sender email address |
| `EMAIL_PASS` | App-specific password or SMTP credential |
| `EMAIL_FROM` | Email used as sender |
| `EMAIL_TO` | (Optional) default receiver email (for contact forms etc.) |

### Stripe Payment Gateway:
| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Your Stripe live/test secret key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret to validate Stripe events |

### Frontend:
| Variable | Description |
|----------|-------------|
| `FRONTEND_URL` | URL of your frontend app (e.g. `http://localhost:3000` or production domain) |

### DEPLOYED AND HOSTED FRONTEND_URL=https://www.thesocialchamber.com

### Google Maps Integration:
| Variable | Description |
|----------|-------------|
| `PLACE_ID` | Optional, for specific location lookups |
| `GOOGLE_API_KEY` | Google Maps/Places API key |

---

### ✅ Steps to Use

1. Copy `.env.example` → `.env`
2. Fill in the required values.
3. Run the server:
```bash
npm install
npm run dev
