import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

test("renders the application layout and metadata", async () => {
  const { default: RootLayout, metadata } = await vite.ssrLoadModule("/app/layout.tsx");
  const html = renderToStaticMarkup(
    React.createElement(RootLayout, null, React.createElement("main", null, "Origem Gestão")),
  );

  assert.equal(metadata.title, "Origem Gestão");
  assert.match(metadata.description, /contratos, leiras e coletas/i);
  assert.match(html, /<html lang="pt-BR">/);
  assert.match(html, /<main>Origem Gestão<\/main>/);
});
