import { NextResponse } from "next/server";
import crypto from "crypto";
import moment from "moment-timezone";

function getTimestampJakarta() {
    return moment()
        .tz("Asia/Jakarta")
        .format("YYYY-MM-DDTHH:mm:ssZ");
}

function sha256(data: string) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

export async function POST() {
    try {
        const baseUrl = process.env.YOKKE_BASE_URL!;
        const clientKey = process.env.YOKKE_CLIENT_KEY!;
        const clientSecret = process.env.YOKKE_CLIENT_SECRET!;
        const partnerId = process.env.YOKKE_PARTNER_ID!;
        const privateKey = process.env.YOKKE_PRIVATE_KEY!.replace(/\\n/g, "\n");

        /* ================= TIME DEBUG ================= */

        const serverTime = new Date();
        const isoTime = serverTime.toISOString();
        const jakartaTime = moment().tz("Asia/Jakarta").format();

        console.log("========== TIME DEBUG ==========");
        console.log("SERVER TIME:", serverTime.toString());
        console.log("ISO TIME (UTC):", isoTime);
        console.log("JAKARTA TIME (moment):", jakartaTime);
        console.log("================================");

       
        const timestamp = getTimestampJakarta();
        console.log("TIMESTAMP USED:", timestamp);

        /* ================= TOKEN ================= */

        console.log("========== TOKEN REQUEST ==========");

        const stringToSignToken = `${clientKey}|${timestamp}`;
        console.log("STRING TO SIGN TOKEN:", stringToSignToken);

        const signer = crypto.createSign("RSA-SHA256");
        signer.update(stringToSignToken);
        signer.end();

        const signatureToken = signer.sign(privateKey, "base64");
        console.log("SIGNATURE TOKEN (first 50):", signatureToken.substring(0, 50));

        const tokenResponse = await fetch(
            `${baseUrl}/qr/v2.0/access-token/b2b`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-TIMESTAMP": timestamp,
                    "X-CLIENT-KEY": clientKey,
                    "X-SIGNATURE": signatureToken,
                },
                body: JSON.stringify({
                    grantType: "client_credentials",
                }),
            }
        );

        const tokenText = await tokenResponse.text();
        console.log("TOKEN STATUS:", tokenResponse.status);
        console.log("TOKEN RESPONSE RAW:", tokenText);

        const tokenData = JSON.parse(tokenText);

        if (!tokenData.accessToken) {
            return NextResponse.json({
                step: "TOKEN_FAILED",
                tokenData,
            });
        }

        const accessToken = tokenData.accessToken;
        console.log("ACCESS TOKEN (first 30):", accessToken.substring(0, 30));
        console.log("=====================================");

        /* ================= QR BODY ================= */

        const bodyData = {
            partnerReferenceNo: "PART1234567891122113",
            amount: {
                value: "10000.00",
                currency: "IDR",
            },
            feeAmount: {
                value: "0.00",
                currency: "IDR",
            },
            merchantId: "000071004981608",
            terminalId: "74257760",
        };

        const bodyString = JSON.stringify(bodyData);
        const bodyHash = sha256(bodyString);

        console.log("========== QR REQUEST ==========");
        console.log("QR BODY:", bodyString);
        console.log("QR BODY HASH:", bodyHash);

        /* ================= SIGN QR ================= */

        const endpoint = "/v2.0/qr/qr-mpm-generate";

        const stringToSignQR =
            `POST:${endpoint}:${accessToken}:${bodyHash}:${timestamp}`;

        console.log("STRING TO SIGN QR:", stringToSignQR);

        const signatureQR = crypto
            .createHmac("sha512", clientSecret)
            .update(stringToSignQR)
            .digest("base64");

        console.log("SIGNATURE QR:", signatureQR);

        const externalId = Date.now().toString().slice(0, 15);
        console.log("X-EXTERNAL-ID:", externalId);

        /* ================= CALL QR ================= */

        const qrResponse = await fetch(
            `${baseUrl}${endpoint}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                    "X-TIMESTAMP": timestamp,
                    "X-SIGNATURE": signatureQR,
                    "X-EXTERNAL-ID": externalId,
                    "X-PARTNER-ID": partnerId,
                    "CHANNEL-ID": "02",
                },
                body: bodyString,
            }
        );

        const qrText = await qrResponse.text();

        console.log("QR STATUS:", qrResponse.status);
        console.log("QR RESPONSE RAW:", qrText);
        console.log("=====================================");

        return NextResponse.json({
            status: qrResponse.status,
            result: qrText,
        });

    } catch (err: any) {
        console.error("ERROR:", err);
        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
}
