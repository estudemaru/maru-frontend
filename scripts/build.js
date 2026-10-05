import { build } from "esbuild";
import { cp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "frontend");
const output = path.join(root, "dist");
const bundles = path.join(output, "assets/build");

// O código usa os caminhos do site (/shared/..., /assets/...), como no servidor de
// desenvolvimento. Imagens citadas no CSS continuam sendo arquivos do site.
const sitePaths = {
  name: "maru-site-paths",
  setup(build) {
    build.onResolve({ filter: /^\/shared\// }, args => ({ path: path.join(root, args.path) }));
    build.onResolve({ filter: /^\/assets\// }, args => args.kind === "url-token" ? { path: args.path, external: true } : { path: path.join(source, args.path) });
  }
};
const common = { absWorkingDir: root, outdir: bundles, bundle: true, minify: true, metafile: true, entryNames: "[name]-[hash]", plugins: [sitePaths], logLevel: "warning" };

await rm(output, { recursive: true, force: true });
// JS e CSS saem empacotados em assets/build; o resto de assets/ é copiado como está.
const bundled = new Set(["assets/js", "assets/css", "assets/vendor/wanakana.js"].map(file => path.join(source, file)));
await cp(source, output, { recursive: true, filter: file => !bundled.has(file) });

// Cada tela vira um arquivo próprio, baixado só quando é aberta (import() em app.js).
const js = await build({ ...common, entryPoints: ["frontend/assets/js/app.js"], format: "esm", splitting: true, chunkNames: "[name]-[hash]" });
const css = await build({ ...common, entryPoints: ["frontend/assets/css/main.css"] });

const outputs = { ...js.metafile.outputs, ...css.metafile.outputs };
const url = file => "/" + path.relative(output, path.join(root, file)).split(path.sep).join("/");
const entry = name => Object.keys(outputs).find(file => outputs[file].entryPoint === name);
const app = entry("frontend/assets/js/app.js"), styles = entry("frontend/assets/css/main.css");

// Os nomes com hash permitem cache permanente; o index.html aponta para a versão atual
// e já pede os módulos de que o app depende, sem esperar o app.js para descobri-los.
let html = await readFile(path.join(source, "index.html"), "utf8");
for (const [from, to] of [["/assets/css/main.css", url(styles)], ["/assets/js/app.js", url(app)]]) {
  if (!html.includes(`"${from}"`)) throw new Error(`index.html não referencia ${from}.`);
  html = html.replace(`"${from}"`, `"${to}"`);
}
const preload = outputs[app].imports.filter(item => item.kind === "import-statement").map(item => `  <link rel="modulepreload" href="${url(item.path)}">\n`).join("");
html = html.replace("</head>", preload + "</head>");
await writeFile(path.join(output, "index.html"), html);

const size = file => (outputs[file].bytes / 1024).toFixed(0) + " KB";
const chunks = Object.keys(js.metafile.outputs).filter(file => file.endsWith(".js"));
console.log(`Frontend gerado em dist/: app ${size(app)} + ${preload ? preload.trim().split("\n").length : 0} módulo(s) inicial(is), ${chunks.length} arquivos JS no total; CSS ${size(styles)}.`);
