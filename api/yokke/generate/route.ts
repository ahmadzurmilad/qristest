import crypto from "crypto";

export async function POST(req) {
    try {
        // =============================
        // 1. CONFIG
        // =============================
        const rawToken = "eyJraWQiOiJzc29zIiwiYWxnIjoiUlM1MTIifQ.eyJpc3MiOiJKV1RNVEkiLCJzdWIiOiI4MzkzYzIxYS0zODAxLTQzYTUtYTdkNC1kOGVhYTAxNDNmZTAiLCJuYmYiOjE3NzE0NzQwODYsImV4cCI6MTc3MTQ3NzY4NiwiaWF0IjoxNzcxNDc0MDg2fQ.TLCajgaV9mSKpWMMotADjOT68PXqR9C5EDZ5LjiSgTDEVUGgoBcgaN5-NTCUl3SpQ_wJ7NupWoHxfRSU-h6Xn4jelcp4oiBkUQaO5Amueubb36RA5J5AyFvlwwSa5py5I80SJFbpIZqHY-tw1C5i8frKm8fqQjWBSh3V2DpI495QrpTUC7QDqbwM8O-mLBVTCMW8LShw5Jpe2K3Do_Jb3b1otrfjrpL4SnJzWzcuzH1kkUGok995aQUvdDIc0WH1V58d5qW2VZHL67_RqY2SEq0kBHR7s-sSUus2t4mW8H-w2Em2M-WEFYHBZq6wUScJbbfmSAwRiSke9SoEpFW0Xw";

        const token = rawToken.trim(); // hilangkan whitespace tersembunyi
        const saltKey = "43049df3-ffa0-46a9-ade4-92aeb2cf480a";

        const method = "POST";
        const endpoint = "/v2.0/qr/qr-mpm-generate";

        // =============================
        // 2. GENERATE TIMESTAMP (IDENTIK POSTMAN)
        // =============================
        function generateTimestamp() {
            const now = new Date();

            const pad = (n) => n.toString().padStart(2, "0");

            const year = now.getFullYear();
            const month = pad(now.getMonth() + 1);
            const day = pad(now.getDate());
            const hour = pad(now.getHours());
            const minute = pad(now.getMinutes());
            const second = pad(now.getSeconds());

            return `${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`;
        }

        const xtimestamp = generateTimestamp();

        // =============================
        // 3. GENERATE ID
        // =============================
        const externalId = Date.now().toString() + Math.floor(Math.random() * 100).toString().padStart(2, "0");

        const pad = (n) => n.toString().padStart(2, "0");
        const now = new Date();

        const dateStr =
            now.getFullYear() +
            pad(now.getMonth() + 1) +
            pad(now.getDate()) +
            pad(now.getHours()) +
            pad(now.getMinutes()) +
            pad(now.getSeconds());

        const random = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, "0");

        const partnerReferenceNo = `BTK${dateStr}${random}`; // 20 digit fix

        // =============================
        // 4. BODY
        // =============================
        const bodyData = {
            merchantId: "000071004981608",
            terminalId: "74257760",
            partnerReferenceNo: partnerReferenceNo,
            amount: {
                value: "10000.00",
                currency: "IDR",
            },
            feeAmount: {
                value: "0.00",
                currency: "IDR",
            },
        };

        const payloadStr = JSON.stringify(bodyData);

        // =============================
        // 5. HASH SHA256
        // =============================
        const hash256 = crypto
            .createHash("sha256")
            .update(payloadStr)
            .digest("hex");

        // =============================
        // 6. STRING TO SIGN
        // =============================
        const stringToSign =
            `${method}:${endpoint}:${token}:${hash256}:${xtimestamp}`;

        // =============================
        // 7. SIGNATURE HMAC SHA512 BASE64
        // =============================
        const signature = crypto
            .createHmac("sha512", saltKey)
            .update(stringToSign)
            .digest("base64");

        // =============================
        // 8. CALL API
        // =============================
        const response = await fetch(
            "https://tst.yokke.co.id:7778/v2.0/qr/qr-mpm-generate",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-TIMESTAMP": xtimestamp,
                    "X-SIGNATURE": signature,
                    "X-EXTERNAL-ID": externalId,
                    "X-PARTNER-ID": "BTKRSMPMSNAP",
                    "CHANNEL-ID": "02",
                    Authorization: `Bearer ${token}`,
                },
                body: payloadStr,
            }
        );

        const result = await response.json();
        const decoded = JSON.parse(
            Buffer.from(token.split(".")[1], "base64").toString()
        );
        const ipCheck = await fetch("https://api.ipify.org?format=json");
        const ip = await ipCheck.json();
        console.log("SERVER PUBLIC IP:", ip);

        console.log("TOKEN PAYLOAD:", decoded);
        console.log("NOW UNIX:", Math.floor(Date.now() / 1000));

        return Response.json({
            debug: {
                xtimestamp,
                externalId,
                partnerReferenceNo,
                payloadStr,
                hash256,
                stringToSign,
                signature,
            },
            yokkeResponse: result,
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
