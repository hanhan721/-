import { execSync } from "child_process";
import { printBlue, printGreen, printMagenta, printRed, printYellow } from "./utils/colorOut.js";
import { close_api, delay, send, startService } from "./utils/utils.js";

async function manage() {
  const ACTION = process.env.ACTION;
  const USERINFO = process.env.USERINFO;
  const USERID = process.env.USERID;
  const PAT = process.env.PAT;

  if (!USERINFO) {
    printRed("未配置 USERINFO，请先通过 qrcodeLogin 登录账号");
    process.exit(1);
  }

  const userinfo = JSON.parse(USERINFO);
  let api;

  // ============ 查看用户列表 ============
  if (ACTION === "list") {
    api = startService();
    await delay(2000);

    try {
      printMagenta("\n========== 用户列表 ==========\n");
      for (let i = 0; i < userinfo.length; i++) {
        const user = userinfo[i];
        const headers = { 'cookie': 'token=' + user.token + '; userid=' + user.userid };

        const userDetail = await send(`/user/detail?timestrap=${Date.now()}`, "GET", headers);
        const vipDetails = await send(`/user/vip/detail?timestrap=${Date.now()}`, "GET", headers);

        printBlue(`--- 账号 ${i + 1} ---`);
        if (userDetail?.data?.nickname) {
          printGreen(`  昵称:     ${userDetail.data.nickname}`);
          printGreen(`  userid:   ${user.userid}`);
          if (vipDetails?.status === 1 && vipDetails?.data?.busi_vip?.[0]) {
            printGreen(`  VIP到期:  ${vipDetails.data.busi_vip[0].vip_end_time}`);
          }
          printGreen(`  状态:     正常\n`);
        } else {
          printRed(`  userid:   ${user.userid}`);
          printRed(`  状态:     token过期或账号异常\n`);
        }
      }
      printMagenta(`========== 共 ${userinfo.length} 个账号 ==========\n`);
    } finally {
      close_api(api);
    }

  // ============ 移除用户 ============
  } else if (ACTION === "remove") {
    if (!USERID) {
      printRed("请输入要移除的 userid");
      process.exit(1);
    }

    const target = userinfo.find(u => String(u.userid) === String(USERID));
    if (!target) {
      printRed(`未找到 userid: ${USERID}，当前已有的 userid 如下:`);
      userinfo.forEach(u => printYellow(`  - ${u.userid}`));
      process.exit(1);
    }

    const filtered = userinfo.filter(u => String(u.userid) !== String(USERID));

    if (!PAT) {
      printRed("未配置 PAT，无法自动更新 secret");
      process.exit(1);
    }

    try {
      const userinfoJSON = JSON.stringify(filtered);
      execSync(`gh secret set USERINFO -b'${userinfoJSON}' --repo ${process.env.GITHUB_REPOSITORY}`);
      printGreen(`已移除 userid: ${USERID}`);
      printGreen(`剩余 ${filtered.length} 个账号`);
    } catch (error) {
      printRed("更新 secret 失败");
      throw error;
    }
  }

  if (api?.killed) {
    process.exit(0);
  }
}

manage();
