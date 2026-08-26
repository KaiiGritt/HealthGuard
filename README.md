This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

Deploy the Next.js frontend on [Vercel](https://vercel.com/new) from the
`KaiiGritt/HealthGuard` GitHub repository. Vercel detects Next.js automatically.

Host the FastAPI backend separately on a public Python service such as Render, Railway,
or Fly.io. Vercel cannot run the local `uvicorn` process.

In Vercel, add this environment variable for Preview and Production:

```env
BACKEND_ORIGIN=https://your-public-fastapi-service.example.com
```

Use the backend origin only, without a trailing `/backend` path. The existing rewrite
proxies browser requests from `/backend/*` to this service.

On the backend host, configure:

```env
DATABASE_URL=postgresql+psycopg://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:5432/postgres?sslmode=require
CORS_ORIGINS=https://your-vercel-project.vercel.app
JWT_SECRET=generate-a-long-random-secret
COOKIE_SECURE=true
SMTP_ENABLED=true
```

Add the SMTP credentials from `backend/.env.example` as well. Never commit database,
SMTP, or Supabase secret keys, and never expose them in `NEXT_PUBLIC_*` variables.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
