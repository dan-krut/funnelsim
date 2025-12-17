# FunnelSim

A visual sales funnel modeling and optimization tool that helps marketers and entrepreneurs plan and validate their funnel strategy before investing in development or traffic.

## Features

- **Visual Funnel Builder**: Drag-and-drop interface for creating complex funnel structures
- **Traffic Modeling**: Define multiple traffic sources with visit counts and costs
- **Real-time ROI Calculations**: Automatic calculation of conversions, revenue, and profit
- **Sensitivity Analysis**: See how conversion changes at each step affect total profit
- **Export Options**: Export funnels as PNG images or PDF reports
- **Subscription Tiers**: Free, Pro, and Enterprise plans with Stripe integration
- **Lifetime Pricing**: One-time payment option for permanent access
- **Whitelabel Support**: Full branding customization for agencies/resellers
- **Admin Dashboard**: User management, product configuration, and analytics

## Full Setup Guide

**For complete installation and deployment instructions, see [`docs/manual.html`](docs/manual.html)**

The manual covers:
- Supabase project setup
- Stripe integration and webhook configuration
- Lifetime pricing setup
- Edge function deployment
- Admin user creation
- Whitelabel branding
- Production deployment
- Troubleshooting

---

## One-Click Deploy

Deploy your own FunnelSim instance:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/martincrumlish/funnelsim)

After deploying, visit `your-app.vercel.app/setup` for the guided setup wizard.

---

## Local Development

```bash
# Clone and install
git clone https://github.com/martincrumlish/funnelsim.git
cd funnelsim
npm install

# Configure environment (see docs/manual.html for full setup)
cp .env.example .env

# Start dev server
npm run dev
```

Open `http://localhost:8080`

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui**
- **ReactFlow** - Visual node editor
- **Supabase** - Database, Auth, Edge Functions, Storage
- **Stripe** - Payments and subscriptions

## Project Structure

```
funnelsim/
├── src/
│   ├── components/
│   │   ├── landing/        # Landing page (dark theme)
│   │   ├── ui/             # shadcn/ui components
│   │   ├── admin/          # Admin dashboard components
│   │   ├── subscription/   # Subscription UI components
│   │   ├── FunnelCanvas.tsx
│   │   └── FunnelNode.tsx
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── Dashboard.tsx
│   │   ├── FunnelBuilder.tsx
│   │   └── admin/          # Admin pages
│   ├── hooks/
│   │   ├── useAuth.tsx
│   │   ├── useSubscription.tsx
│   │   ├── useWhitelabel.tsx
│   │   └── useAdmin.tsx
│   └── lib/
│       └── funnelCalculations.ts
├── supabase/
│   ├── functions/          # Edge functions (Stripe, admin)
│   └── migrations/         # Database migrations
├── docs/
│   └── manual.html         # Full setup guide
└── package.json
```

## Development Commands

```bash
npm run dev          # Start dev server (port 8080)
npm run build        # Production build
npm run lint         # Run ESLint
npm run test:run     # Run tests
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `funnels` | Funnel designs (nodes, edges, traffic sources) |
| `profiles` | User profiles |
| `subscription_tiers` | Available plans (Free, Pro, Enterprise) |
| `user_subscriptions` | User subscription status |
| `admin_users` | Admin role assignments |
| `whitelabel_config` | Branding configuration |
| `pending_subscriptions` | Pre-signup purchases |

## Environment Variables

```env
# Required
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Optional (whitelabel overrides)
VITE_BRAND_NAME="YourBrand"
VITE_PRIMARY_COLOR="#6366f1"
VITE_LOGO_URL="https://..."
```

## License

[Your chosen license]
