const config = require("./config");
const { createApp } = require("./app");

const app = createApp();
const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`Heritage made it possible, bow down to him  btw its running on port  http://0.0.0.0:${config.port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
