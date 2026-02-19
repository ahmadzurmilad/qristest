import { NextResponse } from "next/server";
import crypto from "crypto";

function getTimestamp() {
    const date = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
        date.getSeconds()
    )}+07:00`;
}

export async function POST() {
    try {
        const clientKey = process.env.YOKKE_CLIENT_KEY!;
        const privateKey = process.env.YOKKE_PRIVATE_KEY!.replace(/\\n/g, "\n");
        const baseUrl = process.env.YOKKE_BASE_URL!;

        const timestamp = getTimestamp();
        const stringToSign = `${clientKey}|${timestamp}`;

        const signer = crypto.createSign("RSA-SHA256");
        signer.update(stringToSign);
        signer.end();

        const signature = signer.sign(privateKey, "base64");

        const requestUrl = `${baseUrl}/qr/v2.0/access-token/b2b`;
        const requestBody = { grantType: "client_credentials" };
        const requestHeaders = {
            "Content-Type": "application/json",
            "X-TIMESTAMP": timestamp,
            "X-CLIENT-KEY": clientKey,
            "X-SIGNATURE": signature,
        };

        console.log("[Yokke Token Request] Sending request to:", requestUrl);
        console.log("[Yokke Token Request] Headers:", requestHeaders);
        console.log("[Yokke Token Request] Body:", JSON.stringify(requestBody));

        const response = await fetch(requestUrl, {
            method: "POST",
            headers: requestHeaders,
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        console.log(`[Yokke Token Response] Status: ${response.status}`);
        console.log("[Yokke Token Response] Body:", data);

        if (!response.ok) {
            console.error(`[Yokke Token Error] Failed to get access token.`, {
                status: response.status,
                response: data,
            });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[Yokke Token Error] An unexpected error occurred:", error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
