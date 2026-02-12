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

        const response = await fetch(
            `${baseUrl}/qr/v2.0/access-token/b2b`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-TIMESTAMP": timestamp,
                    "X-CLIENT-KEY": clientKey,
                    "X-SIGNATURE": signature,
                },
                body: JSON.stringify({
                    grantType: "client_credentials",
                }),
            }
        );

        const data = await response.json();

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
