import { NextApiRequest, NextApiResponse } from "next";
import withHandler, { ResponseType } from "@libs/server/withHandler";
import client from "@libs/server/client";

function int2ip(ipInt: string) {
  return (
    (+ipInt >>> 24) +
    "." +
    ((+ipInt >> 16) & 255) +
    "." +
    ((+ipInt >> 8) & 255) +
    "." +
    (+ipInt & 255)
  );
}

async function ip2int(ip: string) {
  return (
    ip.split(".").reduce((ipInt, octet) => {
      return (ipInt << 8) + parseInt(octet, 10);
    }, 0) >>> 0
  );
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseType>
) {
  if (req.method === "GET") {
    let summary: any = {};
    const ipPools = await client.ipPool.findMany({
      orderBy: [
        {
          decimal: "asc",
        },
      ],
    });
    if (ipPools) {
      let prevNum = 0;

      const allPools = ipPools.map((pool) => pool.group);
      const setGroups = Array.from(new Set(allPools)); // [GroupA, GroupB, ...]
      summary = setGroups.map((group) => {
        let decimals: any[] = [];
        let range: string[] = [];
        let rangeStart = "";
        prevNum = 0;
        ipPools.map((pool) => {
          if (pool["group"] === group) {
            decimals.push(pool["decimal"]);
          }
        });
        // Grouping starts
        decimals.forEach((decimal, idx) => {
          if (idx === 0) {
            rangeStart = decimal;
            prevNum = +decimal;
          } else if (decimals.length - idx !== 1) {
            if (+decimal - prevNum === 1) {
              prevNum++;
            } else if (+decimal - prevNum > 1) {
              range.push(int2ip(rangeStart) + "-" + int2ip(prevNum.toString()));
              rangeStart = decimal;
              prevNum = +decimal;
            }
          } else if (decimals.length - idx === 1) {
            if (+decimal - prevNum !== 1) {
              range.push(int2ip(rangeStart) + "-" + int2ip(prevNum.toString()));
              range.push(int2ip(decimal));
            }
            if (+decimal - prevNum == 1) {
              range.push(int2ip(rangeStart) + "-" + int2ip(decimal.toString()));
            }
          }
        });
        // Grouping ends
        return {
          group: [group],
          range,
        };
      });
      // console.log(summary);
    }
    res.json({ ok: true, ipPools, summary });
  }
  if (req.method === "POST") {
    try {
      const {
        body: { ip, group, purpose },
      } = req;
      const splitIp = ip.split(".");
      if (
        splitIp[0].includes("-") ||
        splitIp[1].includes("-") ||
        splitIp[2].includes("-")
      ) {
        res.json({
          ok: false,
          error: "Wrong range.",
        });
      } else if (splitIp[3].includes("-")) {
        const ipRange = splitIp[3].split("-");
        const start = +ipRange[0];
        const end = +ipRange[1];
        for (let i = start; i < end + 1; i++) {
          await client.ipPool.create({
            data: {
              ip: `${splitIp[0]}.${splitIp[1]}.${splitIp[2]}.${i}`,
              decimal: (
                await ip2int(`${splitIp[0]}.${splitIp[1]}.${splitIp[2]}.${i}`)
              ).toString(),
              group,
              purpose,
            },
          });
        }
        res.json({
          ok: true,
          error: null,
        });
      } else if (!splitIp[3].includes("-")) {
        await client.ipPool.create({
          data: {
            ip,
            decimal: (await ip2int(ip)).toString(),
            group,
            purpose,
          },
        });
        res.json({
          ok: true,
          error: null,
        });
      }
    } catch (e) {
      res.json({
        ok: false,
        error: e,
      });
    }
  }
  if (req.method === "DELETE") {
    try {
      const {
        body: { id },
      } = req;
      await client.ipPool.delete({
        where: { id },
      });
      res.json({
        ok: true,
        error: null,
      });
    } catch (e) {
      res.json({
        ok: false,
        error: e,
      });
    }
  }
  if (req.method === "PUT") {
    try {
      const {
        body: { id, purpose },
      } = req;
      await client.ipPool.update({
        where: { id },
        data: { purpose },
      });
      res.json({
        ok: true,
        error: null,
      });
    } catch (e) {
      res.json({
        ok: false,
        error: e,
      });
    }
  }
}

export default withHandler({
  methods: ["GET", "POST", "DELETE", "PUT"],
  handler,
  isPrivate: false,
});
