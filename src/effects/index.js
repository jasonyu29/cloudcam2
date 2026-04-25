const modules = import.meta.glob("./*.js", { eager: true });

const effects = {};

for (const [path, mod] of Object.entries(modules)) {
  if (path === "./index.js") continue;

  const effect = mod && mod.default ? mod.default : mod;
  const key = (effect && typeof effect.name === "string" && effect.name) || path;
  effects[key] = effect;
}

export { effects };
