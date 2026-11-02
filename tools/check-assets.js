const fs = require("fs");
const html = fs.readFileSync("app/src/main/assets/index.html", "utf8");
const re = /src="([^"]+)"/g;
let m, out = "";
while ((m = re.exec(html)) !== null) {
  const p = "app/src/main/assets/" + m[1];
  const ok = fs.existsSync(p);
  let syntax = "";
  if (ok && p.endsWith(".js")) {
    try { new Function(fs.readFileSync(p, "utf8")); syntax = " + syntax-ok"; }
    catch (e) { syntax = " + SYNTAX-FAIL: " + e.message; }
  }
  out += m[1] + ": " + (ok ? "EXISTS" : "MISSING") + syntax + "\n";
}
fs.writeFileSync("tools/out.txt", out, "utf8");
