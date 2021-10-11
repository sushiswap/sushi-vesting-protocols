import fs from "fs";
import getBadgerDistribution from "./index";

main();

async function main() {
  const distribution = await getBadgerDistribution();

  if (!fs.existsSync("./outputs")) {
    fs.mkdirSync("./outputs");
  }

  fs.writeFileSync(
    `./outputs/amounts.json`,
    JSON.stringify(distribution, null, 1)
  );
}
