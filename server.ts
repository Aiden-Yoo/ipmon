import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { CronJob } from "cron";
import ping from "ping";
//@ts-ignore
import arpScanner from "arpscan";
import client from "./libs/server/client";
import moment from "moment";

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
        const now = new Date().getTime();
        arpResults = data.map((result: any) => result.ip);
        arpResults.map(async (ip) => {
          const prev = await client.ipPool.findFirst({
            where: { ip },
          });
          if (prev?.use === false) {
            await client.ipPool.update({
              where: {
                ip,
              },
              data: {
                use: true,
                checkAt: moment(now).toDate(),
                changeAt: moment(now).toDate(),
              },
            });
          }
          if (prev?.use === true) {
            await client.ipPool.update({
              where: {
                ip,
              },
              data: {
                checkAt: moment(now).toDate(),
              },
            });
          }
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
  "*/5 * * * *",
  async () => {
    try {
      const now = new Date().getTime();
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
          if (prev?.use === false) {
            await client.ipPool.update({
              where: {
                ip: host.ip,
              },
              data: {
                use: true,
                checkAt: moment(now).toDate(),
                changeAt: moment(now).toDate(),
              },
            });
          }
          if (prev?.use === true) {
            await client.ipPool.update({
              where: {
                ip: host.ip,
              },
              data: {
                checkAt: moment(now).toDate(),
              },
            });
          }
        }
        if (!res.alive) {
          const isInclude = arpResults.includes(host.ip);
          if (!isInclude) {
            if (prev?.use === true) {
              await client.ipPool.update({
                where: {
                  ip: host.ip,
                },
                data: {
                  use: false,
                  checkAt: moment(now).toDate(),
                  changeAt: moment(now).toDate(),
                },
              });
            }
            if (prev?.use === false) {
              await client.ipPool.update({
                where: {
                  ip: host.ip,
                },
                data: {
                  checkAt: moment(now).toDate(),
                },
              });
            }
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
