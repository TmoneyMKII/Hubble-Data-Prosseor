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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. If that port is busy, Next.js will select the next available port.

## Hubble workflow

1. Search for an object name such as `M51`, or switch to coordinates and enter `RA, DEC` in degrees.
2. Select one or more returned observations.
3. Choose **Download & process**. The local Python processor downloads the selected FITS science products into `../hubble_images` and creates PNG previews beside them.
4. Open **Image library** in the sidebar to view the generated previews. Use **FITS archive** to inspect the raw files.
5. Choose **Generate post** on any PNG to create a copyable social media caption grounded in its FITS metadata and the Python processing pipeline.

The web UI requires the Python dependencies from the project root:

```bash
pip install -r ../requirements.txt
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
