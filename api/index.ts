// Vercel serverless entrypoint. Re-exports the COMPILED Express app
// (backend/dist/app.js, produced by `tsc -p backend/tsconfig.build.json`
// during the Vercel build — see vercel.json's buildCommand) rather than the
// raw TypeScript source, so the backend's NodeNext `.js`-extension relative
// imports resolve exactly as they do locally, with no bundler-vs-tsc
// module-resolution ambiguity. Vercel's Node runtime natively accepts a
// default-exported Express app as a request handler.
export { default } from '../backend/dist/app.js';
