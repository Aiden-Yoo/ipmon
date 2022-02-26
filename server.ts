import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { CronJob } from "cron";
import ping from "ping";
//@ts-ignore
import arpScanner from "arpscan";
import client from "./libs/server/client";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let arpResults: string[] = [];

const options = {
  command: "arp-scan",
  args: ["-l"],
  interface: process.env.interface,
  // sudo: true,
};

// need to install arp-scan (sudo apt-get install arp-scan)
// sudo chmod u+s /usr/sbin/arp-scan
const arpJob = new CronJob(
  "* * * * *",
  async () => {
    try {
      await arpScanner((err: any, data: any) => {
        if (err) throw err;
        arpResults = data.map((result: any) => result.ip);

        arpResults.map(async (ip) => {
          const prev = await client.ipPool.findFirst({
            where: { ip },
          });
          prev &&
            (await client.ipPool.update({
              where: {
                ip,
              },
              data: {
                use: prev?.use === false ? true : undefined,
              },
            }));
        });
      }, options);
    } catch (error) {
      console.log(error);
    }
  },
  null,
  true,
  "Asia/Seoul"
);

const pingJob = new CronJob(
  "* */5 * * *",
  async () => {
    try {
      const hosts = await client.ipPool.findMany({
        orderBy: [
          {
            decimal: "asc",
          },
        ],
        select: {
          ip: true,
        },
      });

      for (let host of hosts) {
        let res = await ping.promise.probe(host.ip, {
          timeout: 1,
          // extra: ["-i", "2"],
        });
        const prev = await client.ipPool.findFirst({
          where: {
            ip: host.ip,
          },
        });
        if (res.alive) {
          await client.ipPool.update({
            where: {
              ip: host.ip,
            },
            data: {
              use: prev?.use === false ? true : undefined,
            },
          });
        }
        if (!res.alive) {
          const isInclude = arpResults.includes(host.ip);
          if (!isInclude) {
            await client.ipPool.update({
              where: {
                ip: host.ip,
              },
              data: {
                use: prev?.use === true ? false : undefined,
              },
            });
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  },
  null,
  true,
  "Asia/Seoul"
);

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url!, true);
      const { pathname, query } = parsedUrl;

      if (pathname === "/a") {
        await app.render(req, res, "/a", query);
      } else if (pathname === "/b") {
        await app.render(req, res, "/b", query);
      } else {
        await handle(req, res, parsedUrl);
      }
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  }).listen(port, () => {
    // console.log(`> Ready on http://${hostname}:${port}`);
  });

  // tslint:disable-next-line:no-console
  console.log(
    `> Server listening at http://localhost:${port} as ${
      dev ? "development" : process.env.NODE_ENV
    }`
  );

  arpJob.start();
  pingJob.start();
});
